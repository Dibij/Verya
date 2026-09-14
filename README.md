<div align="center">

<br />

# Verya

**Visual editing for real code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Dibij/Verya?color=6366f1)](https://github.com/Dibij/Verya/releases)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript-61dafb.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

</div>

---

## What is Verya?

Verya is a local developer tool that allows you to point at any existing React + TypeScript project and visually edit its UI — with every modification translating back into clean, idiomatic source files.

It is **not** a website builder that generates spaghetti code.  
It is **not** a prototyping sandbox disconnected from reality.  

> **Verya is a visual layer on top of your real source code.**

When you tweak padding, colors, typography, or apply a Glassmorphism design system, Verya performs AST transformations on your actual `.tsx` and `.css` files. Close Verya, open VS Code, and every single change is right there, formatted and maintainable.

---

## Core Principles

1. **The source code is the source of truth.** The preview is disposable; only your repository files matter.
2. **Project Isolation & Safety First.** Verya creates an isolated editing session. Your original project remains untouched while you experiment.
3. **Deliberate Commits (Save Session vs. Accept Changes).** You review clean line diffs and conflict alerts before changes are applied to your original source.
4. **Zero Configuration & Frictionless CLI.** Install once. Run `verya` anywhere. No manual PATH juggling required.

```
Original Project
       │
       ▼ (Safe Snapshot + Junction)
Isolated Verya Session ──► Live Preview (Vite)
       │                         │
       ▼                         ▼
Visual Edits / Presets ◄── Click & Inspect
       │
       ▼
AST Transformations (Babel + Tailwind + Prettier)
       │
       ▼
Review Diffs & Accept Changes
       │
       ▼ (Defensive Backup)
Original Project Updated!
```

---

## Quick Install (One-Line Commands)

No manual PATH configuration, no admin/root privileges required.

### 🪟 Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Dibij/Verya/master/scripts/install.ps1 | iex
```
*Installs to `%LOCALAPPDATA%\Programs\Verya` and configures your User PATH automatically.*

### 🍎 macOS / 🐧 Linux (Terminal)
```bash
curl -fsSL https://raw.githubusercontent.com/Dibij/Verya/master/scripts/install.sh | bash
```
*Installs to `~/.local/share/verya` and creates launcher at `~/.local/bin/verya`.*

Restart your terminal, and `verya` is ready!

---

## Downloadable Release Packages

You can also download packaged installers directly from the [GitHub Releases](https://github.com/Dibij/Verya/releases):

| Platform | Download | Instructions |
|---|---|---|
| **Windows** | [`VeryaSetup.cmd`](https://github.com/Dibij/Verya/releases/latest/download/VeryaSetup.cmd) or [`.zip`](https://github.com/Dibij/Verya/releases/latest/download/verya-windows-x64.zip) | Double-click `VeryaSetup.cmd` or extract `.zip` and run `verya.cmd` |
| **Linux (x64)** | [`verya-linux-x64.tar.gz`](https://github.com/Dibij/Verya/releases/latest/download/verya-linux-x64.tar.gz) | Extract and run `./verya` |
| **Linux (ARM64)** | [`verya-linux-arm64.tar.gz`](https://github.com/Dibij/Verya/releases/latest/download/verya-linux-arm64.tar.gz) | Extract and run `./verya` |
| **macOS (Intel)** | [`verya-macos-x64.tar.gz`](https://github.com/Dibij/Verya/releases/latest/download/verya-macos-x64.tar.gz) | Extract and run `./verya` |
| **macOS (Apple Silicon)** | [`verya-macos-arm64.tar.gz`](https://github.com/Dibij/Verya/releases/latest/download/verya-macos-arm64.tar.gz) | Extract and run `./verya` |
| **Checksums** | [`checksums.txt`](https://github.com/Dibij/Verya/releases/latest/download/checksums.txt) | SHA-256 hashes for all downloadable assets |

---

## Install from Source

If you prefer building and linking locally:

```bash
# Clone the repository
git clone https://github.com/Dibij/Verya.git
cd Verya

# Install dependencies & build
npm install
npm run build

# Link globally (adds 'verya' to your PATH)
npm link
```

---

## Using Verya

### 1. Launch in the Current Project
Navigate to any React + TypeScript project and run:

```bash
cd my-react-app
verya
```

### 2. Launch with a Specific Path
```bash
verya ./projects/dashboard
```

### 3. CLI Command Reference

```text
Verya 0.1.0 — Visual editing for real code

Usage:
  verya [options] [path]

Arguments:
  path                Path to your React project (directory or entry file) (default: ".")

Options:
  -v, --version       Output the installed Verya version
  -p, --port <port>   Port for the Verya server (default: "3111")
  -s, --session <id>  Resume a specific editing session
  --list-sessions     List existing sessions for this project
  --verbose           Show detailed debug and compiler output
  --no-open           Do not open browser automatically
  -h, --help          Display help for command
```

---

## How Verya Works (The Workflow)

### Step 1: Project Detection
When Verya launches, it scans the project:
* Recognizes React (`tsconfig.json`, `package.json`, `vite.config.*`)
* Identifies Tailwind CSS, CSS Modules, or inline styling
* Detects package manager (`npm`, `pnpm`, `yarn`)
* Counts TSX files, CSS files, and image assets

### Step 2: Isolated Session Workspace
Verya creates an isolated workspace under `~/.verya/sessions/<session-id>/`.
* Source code is mirrored into the session directory.
* `node_modules` are connected via fast directory junctions (no disk space duplicated).
* Vite runs **inside the session directory**.
* **Your original project files remain 100% untouched while you design.**

### Step 3: Visual Canvas & React Introspection
* The live app renders in the center canvas with responsive device frames (Desktop, Tablet 768px, Mobile 390px).
* Hovering over any element outlines it.
* Clicking an element walks React's Fiber tree to identify the actual React component (e.g. `<HeroCard>`, `<Navbar>`).

### Step 4: Visual Adjustments & Design Systems
* **Inspector Panel**: Modify display, flex, grid, padding, margins, colors, borders, radius, shadows, and typography.
* **Glassmorphism System**: Click the **Design** tab to adjust surface opacity, blur, border opacity, corner radius, and accent colors with one-click application to selected elements.
* **Asset Browser**: Replace images or backgrounds with one click.
* **Code / Split View**: Switch between purely visual editing, split preview + code editor, or full code editing.

### Step 5: Save Session vs. Accept Changes
* **Save Session**: Preserves your work in Verya's session storage so you can resume it tomorrow (`verya -s <id>`).
* **Accept Changes**:
  1. Opens the **Review & Accept Changes** modal.
  2. Displays all modified files with unified line diffs (green additions / red removals).
  3. Validates against external conflicts (if a file was edited in VS Code while Verya was open).
  4. Creates an automatic timestamped backup in `~/.verya/backups/`.
  5. Atomically writes the changes back into your real repository.

---

## Monorepo Architecture

```
verya/
├── packages/
│   ├── cli/             # Global CLI entry point (commander.js, project detector, spawner)
│   ├── server/          # Express + WebSocket, AST transformers, session manager, Vite proxy
│   └── ui/              # Editor frontend (React + Tailwind CSS + Lucide + Zustand)
├── scripts/
│   ├── install.ps1      # Automated PowerShell installer (Windows)
│   ├── install.sh       # Automated Shell installer (Linux & macOS)
│   └── package-release.js # Distribution packaging & checksum generator
├── VeryaSetup.cmd       # Double-clickable Windows setup launcher
├── package.json         # Workspace root
└── tsconfig.base.json   # Shared TypeScript configuration
```

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Dibij/Verya/issues).

---

## License

This project is licensed under the [MIT License](LICENSE).
