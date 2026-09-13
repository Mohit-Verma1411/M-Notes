import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Feather, Pin, PinOff, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatRelative, wordCount, type Note } from "@/lib/notes"

interface EditorProps {
  note: Note | null
  count: number
  synced: boolean
  freshId: string | null
  onClearFresh: () => void
  onTitle: (id: string, title: string) => void
  onBody: (id: string, body: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
  onCreate: () => void
  onBack: () => void
  showBack: boolean
}

function EmptyState({
  onCreate,
  count,
  synced,
}: {
  onCreate: () => void
  count: number
  synced: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
      <Feather className="mb-6 size-7 text-muted-foreground/40" />
      <h2 className="font-serif text-3xl font-medium leading-tight tracking-tight md:text-4xl">
        A quieter place to keep notes.
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Choose a note from the sidebar, or start a fresh page and let the words
        find their own shape.
      </p>
      <Button onClick={onCreate} className="mt-8 h-10 gap-2 rounded-lg">
        <Feather className="size-4" />
        New note
      </Button>
      <p className="mt-12 text-xs text-muted-foreground/70">
        {synced
          ? "Notes sync to your account as you type"
          : `${count} ${count === 1 ? "note" : "notes"} saved on this device`}
      </p>
    </div>
  )
}

export function Editor({
  note,
  count,
  synced,
  freshId,
  onClearFresh,
  onTitle,
  onBody,
  onTogglePin,
  onDelete,
  onCreate,
  onBack,
  showBack,
}: EditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null)
  const confirming = note?.id === confirmingFor

  useEffect(() => {
    if (note && note.id === freshId) {
      titleRef.current?.focus()
      titleRef.current?.select()
      onClearFresh()
    }
  }, [note, freshId, onClearFresh])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [note?.body, note?.id])

  const words = useMemo(() => (note ? wordCount(note.body) : 0), [note])

  if (!note) {
    return (
      <div className="flex h-full flex-col">
        {showBack && (
          <header className="sticky top-0 z-10 flex items-center gap-1 border-b bg-card/90 px-2 pt-2 backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-10"
              aria-label="Back to notes"
            >
              <ArrowLeft className="size-5" />
            </Button>
          </header>
        )}
        <EmptyState onCreate={onCreate} count={count} synced={synced} />
      </div>
    )
  }

  const handleDelete = () => {
    if (!confirming) {
      setConfirmingFor(note.id)
      window.setTimeout(() => setConfirmingFor(null), 2500)
      return
    }
    onDelete(note.id)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card">
      {showBack && (
        <header className="sticky top-0 z-10 flex items-center gap-1 border-b bg-card/90 px-2 pt-2 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="size-10"
            aria-label="Back to notes"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreate}
            className="ml-auto size-10"
            aria-label="New note"
          >
            <Plus className="size-5" />
          </Button>
        </header>
      )}

      <div
        key={note.id}
        className="animate-note-in mx-auto w-full max-w-3xl flex-1 px-6 pb-[max(7rem,calc(2rem+env(safe-area-inset-bottom)))] pt-6 md:px-12 md:pt-10"
      >
        <div className="flex items-center gap-1.5">
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
            <span className="tabular-nums">
              {words} {words === 1 ? "word" : "words"}
            </span>
          </span>
          <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <span className="tabular-nums">
              {words} {words === 1 ? "word" : "words"}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Saved
            </span>
          </span>
          <span className="mx-1.5 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onTogglePin(note.id)}
            className="size-10 text-muted-foreground md:size-9"
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
          >
            {note.pinned ? (
              <Pin className="size-4 fill-current" />
            ) : (
              <PinOff className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className={cn(
              "size-10 text-muted-foreground transition-colors md:size-9",
              confirming
                ? "bg-destructive text-destructive-foreground"
                : "hover:text-destructive",
            )}
            aria-label={confirming ? "Confirm delete" : "Delete note"}
          >
            {confirming ? (
              <span className="text-[10px] font-medium">Delete?</span>
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>

        <input
          ref={titleRef}
          value={note.title}
          onChange={(event) => onTitle(note.id, event.target.value)}
          placeholder="Untitled"
          className="mt-8 w-full bg-transparent font-serif text-3xl font-medium leading-tight tracking-tight outline-none placeholder:text-muted-foreground/40 md:mt-12 md:text-5xl md:leading-[1.1]"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Edited {formatRelative(note.updatedAt)}
        </p>

        <textarea
          ref={bodyRef}
          value={note.body}
          onChange={(event) => onBody(note.id, event.target.value)}
          placeholder="Start writing…"
          rows={1}
          className="mt-8 min-h-[50vh] w-full resize-none overflow-hidden bg-transparent font-serif text-lg leading-8 text-foreground/90 outline-none placeholder:text-muted-foreground/40 md:min-h-[40vh] md:text-xl md:leading-9"
        />
      </div>
    </div>
  )
}