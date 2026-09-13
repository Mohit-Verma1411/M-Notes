import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  Bold,
  Feather,
  ImagePlus,
  Italic,
  Palette,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Underline,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  bodyToHtml,
  formatRelative,
  wordCount,
  type Note,
} from "@/lib/notes"

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

const SIZES = [
  { label: "S", px: 14 },
  { label: "M", px: 18 },
  { label: "L", px: 24 },
  { label: "XL", px: 32 },
]

const SWATCHES = [
  "#1f2937",
  "#57534e",
  "#9a3412",
  "#a16207",
  "#15803d",
  "#0f766e",
  "#1d4ed8",
  "#6d28d9",
  "#be185d",
  "#dc2626",
]

function ToolButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  )
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
  const bodyRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [hint, setHint] = useState<string | null>(null)
  const hintTimer = useRef<number | undefined>(undefined)
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
    if (!el || !note) return
    const rendered = bodyToHtml(note.body)
    if (el.innerHTML !== rendered) {
      el.innerHTML = rendered
    }
  }, [note])

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

  const focusEditor = () => {
    bodyRef.current?.focus()
  }

  const hasSelection = () => {
    const sel = window.getSelection()
    return !!sel && sel.rangeCount > 0 && !sel.isCollapsed
  }

  const showHint = (message: string) => {
    setHint(message)
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 1600)
  }

  const commit = () => {
    const el = bodyRef.current
    if (!el) return
    onBody(note.id, el.innerHTML)
  }

  const exec = (command: string) => {
    focusEditor()
    if (!hasSelection()) {
      showHint("Select text first")
      return
    }
    document.execCommand(command, false)
    commit()
  }

  const wrapSelection = (style: Record<string, string>) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const span = document.createElement("span")
    Object.assign(span.style, style)
    const fragment = range.extractContents()
    span.appendChild(fragment)
    range.insertNode(span)
    span.normalize()
    sel.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    sel.addRange(next)
  }

  const applyInline = (style: Record<string, string>) => {
    focusEditor()
    if (!hasSelection()) {
      showHint("Select text first")
      return
    }
    wrapSelection(style)
    commit()
  }

  const insertImage = (src: string) => {
    focusEditor()
    document.execCommand("insertImage", false, src)
    commit()
  }

  const handleUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") return
      insertImage(reader.result)
    }
    reader.readAsDataURL(file)
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

        <div className="relative">
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            lang="en"
            onInput={commit}
            className="relative mt-6 min-h-[50vh] w-full bg-transparent font-serif text-lg leading-8 text-foreground/90 outline-none [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-sm md:min-h-[40vh] md:text-xl md:leading-9"
          />
          {!note.body && (
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-6 font-serif text-lg text-muted-foreground/40 md:text-xl"
            >
              Start writing…
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-7 md:left-[calc(50%+10rem)]">
        {hint && (
          <span className="mb-1 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background shadow-lg">
            {hint}
          </span>
        )}

        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-card/80 px-2 py-1.5 shadow-xl shadow-black/5 backdrop-blur-md">
          <ToolButton title="Bold (Ctrl+B)" onClick={() => exec("bold")}>
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton title="Italic (Ctrl+I)" onClick={() => exec("italic")}>
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton title="Underline (Ctrl+U)" onClick={() => exec("underline")}>
            <Underline className="size-4" />
          </ToolButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <div className="flex items-center gap-0.5">
            {SIZES.map((size) => (
              <button
                key={size.label}
                type="button"
                title={`Text size ${size.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyInline({ fontSize: `${size.px}px` })}
                className="flex h-9 w-7 items-center justify-center rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-accent"
              >
                {size.label}
              </button>
            ))}
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolButton
            title="Text color"
            onClick={() => {
              setColorOpen((open) => !open)
              setImageOpen(false)
            }}
          >
            <Palette className="size-4" />
          </ToolButton>
          <ToolButton
            title="Add image"
            onClick={() => {
              setImageOpen((open) => !open)
              setColorOpen(false)
            }}
          >
            <ImagePlus className="size-4" />
          </ToolButton>
        </div>

        {colorOpen && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur-md">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                title={swatch}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyInline({ color: swatch })}
                className="size-6 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: swatch }}
                aria-label={`Text color ${swatch}`}
              />
            ))}
          </div>
        )}

        {imageOpen && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur-md">
            <input
              type="text"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && imageUrl.trim()) {
                  insertImage(imageUrl.trim())
                  setImageUrl("")
                }
              }}
              placeholder="Paste an image URL"
              className="h-8 w-full max-w-[14rem] rounded-full border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (imageUrl.trim()) {
                  insertImage(imageUrl.trim())
                  setImageUrl("")
                }
              }}
              className="flex h-8 min-w-14 items-center justify-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              Add
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Upload className="size-3.5" />
              Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleUpload(file)
                event.target.value = ""
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}