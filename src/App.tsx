import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createNote,
  loadNotes,
  saveNotes,
  type Note,
} from "@/lib/notes"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Sidebar } from "@/components/Sidebar"
import { Editor } from "@/components/Editor"

function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string | null>(() => {
    const initial = loadNotes()
    return (initial.find((note) => note.pinned) ?? initial[0])?.id ?? null
  })
  const [query, setQuery] = useState("")
  const [freshId, setFreshId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<"list" | "editor">("list")

  const isMobile = useMediaQuery("(max-width: 767px)")

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  const sorted = useMemo(() => {
    const list = [...notes].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    )
    const needle = query.trim().toLowerCase()
    if (!needle) return list
    return list.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) ||
        note.body.toLowerCase().includes(needle),
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
  }

  const handleSelect = (id: string) => {
    setActiveId(id)
    setMobileView("editor")
  }

  const handleTitle = (id: string, title: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, title, updatedAt: Date.now() } : note,
      ),
    )
  }

  const handleBody = (id: string, body: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, body, updatedAt: Date.now() } : note,
      ),
    )
  }

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, pinned: !note.pinned, updatedAt: Date.now() }
          : note,
      ),
    )
  }

  const handleDelete = (id: string) => {
    const index = notes.findIndex((note) => note.id === id)
    const remaining = notes.filter((note) => note.id !== id)
    setNotes(remaining)
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
          onQueryChange={setQuery}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </aside>

      <main className={cn("min-w-0 flex-1", editorHidden && "hidden")}>
        <Editor
          note={activeNote}
          count={notes.length}
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
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
        >
          <Plus className="size-6" />
        </button>
      )}
    </div>
  )
}

export default App