import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createNote,
  loadNotes,
  saveNotes,
  htmlToText,
  LOCAL_ONLY_IDS,
  type Note,
} from "@/lib/notes"
import {
  apiEnabled,
  currentUser,
  listNotes,
  putNote,
  signOut,
  type ApiUser,
} from "@/lib/api"
import { scheduleNoteDelete, scheduleNoteSave } from "@/lib/sync"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Sidebar } from "@/components/Sidebar"
import { Editor } from "@/components/Editor"
import { AuthScreen } from "@/components/AuthScreen"

function mergeNotes(local: Note[], server: Note[]): Note[] {
  const byId = new Map<string, Note>()
  for (const note of server) byId.set(note.id, note)

  const push: Note[] = []
  for (const note of local) {
    if (LOCAL_ONLY_IDS.has(note.id)) continue
    const existing = byId.get(note.id)
    if (!existing) {
      push.push(note)
      byId.set(note.id, note)
    } else if (note.updatedAt > existing.updatedAt) {
      push.push(note)
      byId.set(note.id, note)
    }
  }
  for (const note of push) putNote(note).catch(() => {})
  return [...byId.values()].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
  )
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-7 animate-pulse rounded-md bg-primary/70" />
    </div>
  )
}

function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string | null>(() => {
    const initial = loadNotes()
    return (initial.find((note) => note.pinned) ?? initial[0])?.id ?? null
  })
  const [query, setQuery] = useState("")
  const [freshId, setFreshId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "editor">("list")
  const [user, setUser] = useState<ApiUser | null>(null)
  const [localMode, setLocalMode] = useState(!apiEnabled())
  const [sessionReady, setSessionReady] = useState(false)

  const isMobile = useMediaQuery("(max-width: 767px)")

  useEffect(() => {
    let cancelled = false
    currentUser().then((u) => {
      if (cancelled) return
      setUser(u)
      setSessionReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listNotes()
      .then((serverNotes) => {
        if (cancelled) return
        setNotes((prev) => {
          const merged = mergeNotes(prev, serverNotes)
          saveNotes(merged)
          return merged
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  const handleAuthed = useCallback(() => {
    currentUser().then((u) => {
      setUser(u)
      setLocalMode(false)
    })
  }, [])

  const handleSignOut = useCallback(() => {
    signOut().then(() => {
      setUser(null)
      setLocalMode(false)
    })
  }, [])

  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return notes
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) ||
        htmlToText(note.body).toLowerCase().includes(needle),
    )
  }, [notes, query])

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeId) ?? null,
    [notes, activeId],
  )

  const handleCreate = () => {
    const note = createNote()
    setNotes((prev) => [note, ...prev])
    setActiveId(note.id)
    setFreshId(note.id)
    setMobileView("editor")
    scheduleNoteSave(note)
  }

  const handleSelect = (id: string) => {
    setActiveId(id)
    setMobileView("editor")
  }

  const handleTitle = (id: string, title: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== id) return note
        const updated = { ...note, title, updatedAt: Date.now() }
        scheduleNoteSave(updated)
        return updated
      }),
    )
  }

  const handleBody = (id: string, body: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== id) return note
        const updated = { ...note, body, updatedAt: Date.now() }
        scheduleNoteSave(updated)
        return updated
      }),
    )
  }

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== id) return note
        const updated = { ...note, pinned: !note.pinned, updatedAt: Date.now() }
        scheduleNoteSave(updated)
        return updated
      }),
    )
  }

  const handleDelete = (id: string) => {
    const index = notes.findIndex((note) => note.id === id)
    const remaining = notes.filter((note) => note.id !== id)
    setNotes(remaining)
    scheduleNoteDelete(id)
    if (activeId === id) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault()
        handleCreate()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!sessionReady) {
    return <Splash />
  }

  if (!localMode && !user) {
    return (
      <AuthScreen
        onAuthed={handleAuthed}
        onLocal={() => setLocalMode(true)}
        unavailable={!apiEnabled()}
      />
    )
  }

  const sidebarHidden = isMobile && mobileView === "editor"
  const editorHidden = isMobile && mobileView === "list"

  return (
    <div className="flex h-dvh w-full overflow-hidden pt-[env(safe-area-inset-top)]">
      <aside
        className={cn(
          "w-full shrink-0 border-r md:w-80",
          sidebarHidden && "hidden",
        )}
      >
        <Sidebar
          notes={sorted}
          activeId={activeId}
          query={query}
          account={user}
          onAccountSignIn={() => setLocalMode(false)}
          onAccountSignOut={handleSignOut}
          onQueryChange={setQuery}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </aside>

      <main className={cn("min-w-0 flex-1", editorHidden && "hidden")}>
        <Editor
          note={activeNote}
          count={notes.length}
          synced={user !== null}
          freshId={freshId}
          onClearFresh={() => setFreshId(null)}
          onTitle={handleTitle}
          onBody={handleBody}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onBack={() => setMobileView("list")}
          showBack={isMobile && mobileView === "editor"}
        />
      </main>

      {isMobile && mobileView === "list" && (
        <button
          type="button"
          onClick={handleCreate}
          aria-label="New note"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="size-6" />
        </button>
      )}
    </div>
  )
}

export default App