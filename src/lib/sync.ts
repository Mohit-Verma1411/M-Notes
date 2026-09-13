import { deleteNote, putNote } from "@/lib/api"
import { getSavedToken } from "@/lib/api"
import type { Note } from "@/lib/notes"

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

function canSync(): boolean {
  return getSavedToken() !== null
}

export function scheduleNoteSave(note: Note): void {
  if (!canSync()) return
  const existing = timers.get(note.id)
  if (existing) clearTimeout(existing)
  timers.set(
    note.id,
    setTimeout(() => {
      timers.delete(note.id)
      putNote(note).catch(() => {})
    }, DEBOUNCE_MS),
  )
}

export function scheduleNoteDelete(id: string): void {
  if (!canSync()) return
  const existing = timers.get(id)
  if (existing) clearTimeout(existing)
  timers.delete(id)
  deleteNote(id).catch(() => {})
}