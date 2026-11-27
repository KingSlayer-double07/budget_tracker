// Backup files: exporting through the share sheet, restoring from a picked
// file, and undoing the last restore
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import {
  BackupData,
  checkBackup,
  exportData,
  getExpenses,
  getIncome,
  getNextDueDate,
  getPlannedPurchases,
  handleRecurringUpdates,
  restoreData,
  toLocalDateString,
} from "./database"
import { NotificationService } from "./NotificationService"
import { SecureStorageService } from "./SecureStorageService"
import { formatNaira } from "../theme/format"

// The data as it was before the last restore, kept so the restore can be undone
const UNDO_FILE = "before-restore.json"
const UNDO_TEMP_FILE = "before-restore.tmp.json"

const writeJson = async (file: File, data: unknown) => {
  if (file.exists) file.delete()
  file.create()
  await file.write(JSON.stringify(data, null, 2))
}

// Write a backup file and open the share sheet, so it can be saved to Drive,
// sent to yourself, etc. Resolves once the share sheet is closed.
export const shareBackup = async (): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device")
  }
  const file = new File(
    Paths.cache,
    `budget-tracker-backup-${toLocalDateString(new Date())}.json`
  )
  await writeJson(file, await exportData())
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Save your backup",
  })
  await SecureStorageService.getInstance().saveLastBackupDate(
    new Date().toISOString()
  )
}

export type PickedBackup =
  | { ok: true; data: BackupData }
  | { ok: false; error: string }

// Let the user choose a backup file and check it can be restored.
// Returns null when the picker is cancelled.
export const pickBackup = async (): Promise<PickedBackup | null> => {
  // Any type: files saved from chat apps or Drive often lose the JSON type
  const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] })
  if (picked.canceled) return null
  let data: unknown
  try {
    data = JSON.parse(await picked.result.text())
  } catch {
    return { ok: false, error: "This file isn't a Budget Tracker backup." }
  }
  const error = checkBackup(data)
  return error ? { ok: false, error } : { ok: true, data: data as BackupData }
}

// Replace everything with the backup, keeping the current data so the
// restore can be undone. Returns an error message, or null on success.
export const restoreBackup = async (
  data: BackupData
): Promise<string | null> => {
  const temp = new File(Paths.document, UNDO_TEMP_FILE)
  await writeJson(temp, await exportData())

  const error = await restoreData(data)
  if (error) {
    temp.delete()
    return error
  }
  const undo = new File(Paths.document, UNDO_FILE)
  if (undo.exists) undo.delete()
  await temp.move(undo)
  await afterDataReplaced()
  return null
}

// Whether there's a restore that can be undone
export const canUndoRestore = (): boolean =>
  new File(Paths.document, UNDO_FILE).exists

// Put back the data from before the last restore
export const undoRestore = async (): Promise<string | null> => {
  const undo = new File(Paths.document, UNDO_FILE)
  if (!undo.exists) return "There's no restore to undo."
  let data: unknown
  try {
    data = JSON.parse(await undo.text())
  } catch {
    return "The data from before the restore couldn't be read."
  }
  const error = await restoreData(data)
  if (error) return error
  undo.delete()
  await afterDataReplaced()
  return null
}

// Record repeating entries that fell due since the backup was made, and
// replace the scheduled reminders with ones for the restored data
const afterDataReplaced = async () => {
  await handleRecurringUpdates()
  try {
    await rescheduleReminders()
  } catch (error) {
    // The data is restored either way; reminders come back as entries change
    console.error("Failed to reschedule reminders:", error)
  }
}

const rescheduleReminders = async () => {
  const notifications = NotificationService.getInstance()
  await notifications.cancelAllNotifications()

  const tables = [
    { table: "income", kind: "income", title: "Recurring Income Due", nameColumn: "source", rows: await getIncome() },
    { table: "expenses", kind: "expense", title: "Recurring Expense Due", nameColumn: "item", rows: await getExpenses() },
  ] as const
  for (const { table, kind, title, nameColumn, rows } of tables) {
    for (const row of rows as any[]) {
      const day = parseInt(row.recurring_date ?? "")
      if (!row.is_recurring || isNaN(day)) continue
      // Reminders use the name later months record
      const name: string =
        row.next_amount !== null && row.next_amount !== undefined
          ? row.next_name ?? row[nameColumn]
          : row[nameColumn]
      await notifications.scheduleMonthlyReminder(
        title,
        getNextDueDate(day),
        `recurring-${kind}-${name}-${row.recurring_date}`,
        name,
        { table, name, recurringDay: row.recurring_date }
      )
    }
  }

  const today = toLocalDateString(new Date())
  for (const purchase of (await getPlannedPurchases()) as any[]) {
    if (purchase.purchased || !purchase.due_date || purchase.due_date <= today) {
      continue
    }
    const [year, month, day] = purchase.due_date.split("-").map(Number)
    const dueDate = new Date(year, month - 1, day)
    await notifications.schedulePurchaseReminder(
      "Planned Purchase Due",
      `Your planned purchase of ${purchase.item} for ${formatNaira(purchase.amount)} is due on ${dueDate.toLocaleDateString()}`,
      dueDate,
      `planned-purchase-${purchase.item}-${purchase.due_date}`,
      purchase.item,
      false
    )
  }
}

// When the last backup was exported, or null if never
export const getLastBackupDate = (): Promise<string | null> =>
  SecureStorageService.getInstance().getLastBackupDate()
