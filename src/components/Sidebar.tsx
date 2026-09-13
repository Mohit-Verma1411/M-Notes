import { Feather, LogIn, LogOut, Moon, Pin, Plus, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatRelative, htmlToText, type Note } from "@/lib/notes"
import type { ApiUser } from "@/lib/api"

interface SidebarProps {
  notes: Note[]
  activeId: string | null
  query: string
  account: ApiUser | null
  onAccountSignIn: () => void
  onAccountSignOut: () => void
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
  onCreate: () => void
}

function excerpt(note: Note): string {
  return (
    htmlToText(note.body).replace(/\s+/g, " ").trim() ||
    note.title ||
    "Untitled"
  ).slice(0, 90)
}

function NoteItem({
  note,
  active,
  onSelect,
}: {
  note: Note
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(note.id)}
      className={cn(
        "group relative w-full rounded-lg border px-3.5 py-3.5 text-left transition-all duration-150 hover:-translate-y-px md:py-3",
        active
          ? "border-border bg-card"
          : "border-transparent hover:bg-accent/80",
      )}
    >
      {active && (
        <span className="absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-full bg-primary md:bottom-3 md:top-3" />
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h3
          className={cn(
            "truncate text-sm font-medium",
            !note.title && "text-muted-foreground",
          )}
        >
          {note.title || "Untitled"}
        </h3>
        {note.pinned && (
          <Pin className="size-3 shrink-0 text-muted-foreground/70" />
        )}
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {excerpt(note)}
      </p>
      <span className="mt-1.5 block text-[11px] text-muted-foreground/70">
        {formatRelative(note.updatedAt)}
      </span>
    </button>
  )
}

export function Sidebar({
  notes,
  activeId,
  query,
  account,
  onAccountSignIn,
  onAccountSignOut,
  onQueryChange,
  onSelect,
  onCreate,
}: SidebarProps) {
  const pinned = notes.filter((note) => note.pinned)
  const unpinned = notes.filter((note) => !note.pinned)
  const hasQuery = query.trim().length > 0
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 pb-4 pt-4 md:pt-6">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary">
            <Feather className="size-4 text-primary-foreground" />
          </span>
          <h1 className="font-serif text-xl font-medium tracking-tight">
            M Notes
          </h1>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </span>
        </div>

        {account ? (
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="truncate text-xs text-muted-foreground">
              {account.email}
            </span>
            <button
              type="button"
              onClick={onAccountSignOut}
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={onAccountSignIn}
            className="mt-3 h-9 justify-start gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogIn className="size-3.5" />
            Log in / Sign up
          </Button>
        )}

        <Button
          onClick={onCreate}
          className="mt-5 hidden h-10 w-full justify-start gap-2.5 rounded-lg transition-all hover:-translate-y-px active:translate-y-0 md:flex"
        >
          <Plus className="size-4" />
          New note
          <kbd className="ml-auto rounded-md bg-primary-foreground/15 px-1.5 py-0.5 font-sans text-[10px] font-medium">
            ⌘N
          </kbd>
        </Button>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            type="text"
            placeholder="Search notes"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground transition-shadow hover:border-border/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:h-9"
          />
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {notes.length === 0 ? (
          <p className="px-3 py-8 text-sm leading-relaxed text-muted-foreground">
            No notes yet. Start one — ideas don&apos;t keep.
          </p>
        ) : hasQuery ? (
          <>
            {notes.length > 0 ? (
              <div className="space-y-1">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    active={note.id === activeId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-8 text-sm text-muted-foreground">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-5">
            {pinned.length > 0 && (
              <section>
                <h2 className="px-3.5 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Pinned
                </h2>
                <div className="space-y-1">
                  {pinned.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      active={note.id === activeId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="px-3.5 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Notes
              </h2>
              <div className="space-y-1">
                {unpinned.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    active={note.id === activeId}
                    onSelect={onSelect}
                  />
                ))}
                {unpinned.length === 0 && (
                  <p className="px-3.5 py-2 text-sm text-muted-foreground">
                    Nothing here yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </nav>
    </div>
  )
}