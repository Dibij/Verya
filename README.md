<div align="center">

<br />

# Verya

**Visual editing for real code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-in_development-orange.svg)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript-61dafb.svg)]()

</div>

---

## What is Verya?

Verya is a local developer tool that lets you visually edit the actual UI of a React/TypeScript project — and writes every change back into your real source files.

It is not a design tool that exports code.
It is not a prototyping sandbox.

**It is a visual layer on top of your real source code.**

When you change padding, color, or layout visually, Verya updates the actual `.tsx` and `.css` files on disk. Open the project in VS Code immediately after — every change is there, clean and readable.

---

## Core Principle

> **The source code is the source of truth.**

The visual canvas is disposable. The internal editor model is not authoritative. Only the source files matter.

```
SOURCE FILE  →  Parser / AST  →  Component Tree  →  Visual Canvas
                                                            ↓
                                                     Visual Change
                                                            ↓
                                              AST / Source Transformation
                                                            ↓
                                                 Formatted Source File  →  Save  →  Live Preview
```

---

## Features (MVP — Phase 1)

- 🖥️ **CLI launcher** — `verya ./my-react-project`
- ⚡ **Live preview** — embeds your real app via Vite dev server in an iframe
- 🖱️ **Element selection** — click any element to inspect it
- 🔗 **Source mapping** — selected element traces back to its TSX component
- 🎨 **Property editing** — change layout, spacing, color, typography visually
- 💾 **AST-based source writes** — clean, readable, idiomatic output
- 🔄 **Bidirectional sync** — edit code → preview updates; edit visually → code updates

---

## Planned Features

| Phase | Features |
|-------|----------|
| **2** | Component tree, drag/resize, responsive preview, assets, undo/redo |
| **3** | Design systems, Glassmorphism preset, design tokens, template application |
| **4** | AI design assistant, natural language visual editing |
| **5** | Additional frameworks (Vue, Svelte), collaborative workflows, template library |

---

## Architecture

```
verya/
  packages/
    cli/        # CLI entry point (commander.js)
    server/     # Express + WebSocket + AST transforms + file ops
    ui/         # Verya editor React SPA (Tailwind + shadcn/ui)
```

**Key technology choices:**

| Concern | Technology |
|---------|-----------|
| CLI | Node.js + commander.js |
| Verya UI | React + TypeScript + Vite |
| Verya styling | Tailwind CSS + shadcn/ui |
| Server | Express + WebSocket |
| AST transforms | `@babel/parser` + `@babel/traverse` + `@babel/generator` |
| Code formatting | Prettier |
| File watching | chokidar |
| Target app preview | Vite dev server (subprocess) + iframe |

---

## Getting Started

> ⚠️ Verya is currently in early development. Setup instructions will be added once the core is ready.

```bash
# Clone the repo
git clone https://github.com/Dibij/Verya.git
cd Verya

# Install dependencies (monorepo)
npm install

# Run Verya against a React project
npx verya ./path/to/your/react-app
```

---

## Design Philosophy

Verya chooses **clean source output** over visual magic — always.

> A visually impressive implementation that generates terrible code loses to a slightly less magical implementation that preserves clean, maintainable source.

The user must be able to trust the resulting code.

---

## License

[MIT](LICENSE)
