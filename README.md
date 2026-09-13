# M Notes

A quiet, paper-toned note app. Create, edit, pin, search, and delete notes — all saved locally in your browser. No accounts, no sync, no noise.

## Features

- Create, edit, pin, and delete notes, autosaved to `localStorage` on every keystroke
- Search across all notes, with pinned and regular groups
- Live word count and relative edit timestamps
- `⌘N` / `Ctrl+N` shortcut for a new note
- Fully responsive — two-pane on desktop, list↔editor switch on mobile

## Run locally

```bash
pnpm install
pnpm dev
```

## Build a single self-contained HTML file

```bash
bash /home/mohit/.config/opencode/skills/genz-web-built/scripts/bundle-artifact.sh
```

The output is `bundle.html` — a single HTML file with all JS, CSS, and fonts inlined.

## Stack

React + TypeScript + Tailwind CSS (shadcn/ui theming), bundled with Parcel. Typography: Newsreader (writing surface) and Space Grotesk (UI), self-hosted.

> Live demo: [mohit-verma1411.github.io/M-Notes](https://mohit-verma1411.github.io/M-Notes/) — deployed from `bundle.html` via `gh pages deploy`.