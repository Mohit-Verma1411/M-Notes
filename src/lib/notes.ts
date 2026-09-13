export interface Note {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "marginalia.notes.v1"

export const LOCAL_ONLY_IDS = new Set<string>(["welcome", "habits"])

function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

const seed: Note[] = [
  {
    id: "welcome",
    title: "Welcome to M Notes",
    body:
      "A quiet place to keep notes. Everything you write here stays in this browser until you sign in.\n\nIf you create an account, your notes follow you to any device and sync as you type.\n\nA few things to try:\n\n• Press Ctrl+N (Cmd+N on Mac) to start a new note\n• Pin anything important with the pin icon above\n• Search across every note from the field in the sidebar\n\nYour notes are saved as you type, so you can close the tab and pick up where you left off.",
    pinned: true,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 7200000,
  },
  {
    id: "habits",
    title: "Morning pages",
    body:
      "Three pages of longhand before the coffee kicks in. No editing, no judging — just get the residue out of the head so the rest of the day holds more.\n\nThe rule from the notebook: the pages aren't for doing, they're for clearing.",
    pinned: false,
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
  },
]

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Note[]
    return Array.isArray(parsed) ? parsed : seed
  } catch {
    return seed
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    /* storage unavailable — in-memory only */
  }
}

export function createNote(): Note {
  const now = Date.now()
  return {
    id: uid(),
    title: "",
    body: "",
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}