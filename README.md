<div align="center">

<br />

# Verya

**Visual editing for real code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Dibij/Verya?color=6366f1)](https://github.com/Dibij/Verya/releases)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript-61dafb.svg)]()
[![Build](https://img.shields.io/badge/build-passing-emerald.svg)]()

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

## Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm** (or `pnpm` / `yarn`)
- **Git**

---

### 2. Clone and Build

```bash
# Clone the repository
git clone https://github.com/Dibij/Verya.git
cd Verya

# Install all workspace dependencies
npm install

# Build all packages (UI, Server, CLI)
npm run build
```

---

### 3. Adding `verya` to your System PATH

To be able to open a terminal anywhere, navigate to any React project, and simply run `verya`, choose one of the following methods:

#### Method A: Using `npm link` (Recommended — Easiest & Universal)

From inside the cloned `Verya` repository root:

```bash
npm link
```

*What this does:* Registers `verya` into your global npm binary folder (e.g. `%APPDATA%\npm` on Windows or `/usr/local/bin` on macOS/Linux), which is already in your system's PATH.

Now you can test it:
```bash
verya --version
```

To unlink later if needed:
```bash
npm unlink -g verya
```

---

#### Method B: Add directly to System PATH (Windows)

If you prefer not to use `npm link`, you can add the Verya directory directly to your user PATH:

**Using PowerShell (run as regular user):**
```powershell
# In PowerShell inside the Verya folder:
$veryaPath = (Get-Item .).FullName
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$veryaPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$veryaPath", "User")
    Write-Host "Verya added to User PATH! Restart your terminal to use 'verya'." -ForegroundColor Green
}
```

**Using the Windows GUI:**
1. Press <kbd>Win</kbd> + <kbd>R</kbd>, type `sysdm.cpl`, and press **Enter**.
2. Go to the **Advanced** tab and click **Environment Variables**.
3. Under **User variables**, select **Path** and click **Edit**.
4. Click **New** and paste the path to your Verya directory:
   ```text
   D:\Code\Verya
   ```
5. Click **OK** on all dialogs and restart your terminal.

---

#### Method C: Add to PATH (macOS / Linux)

Add Verya's directory to your shell profile:

```bash
# For zsh (default on macOS):
echo 'export PATH="$PATH:'"$(pwd)"'"' >> ~/.zshrc
source ~/.zshrc

# For bash (Ubuntu / Debian / WSL):
echo 'export PATH="$PATH:'"$(pwd)"'"' >> ~/.bashrc
source ~/.bashrc
```

---

## Quick Start & Usage

### 1. Launch on Current Directory
Open any React + TypeScript project in your terminal:

```bash
cd my-react-app
verya
```

### 2. Launch on a Specific Project Path
```bash
verya ./projects/dashboard
```

### 3. Useful CLI Options

```bash
# Display help and options
verya --help

# List saved sessions for this project
verya --list-sessions

# Resume a previous session by ID
verya -s <session-id>

# Run Verya on a custom port
verya -p 4000

# Start without opening browser automatically
verya --no-open
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
* **Save Session**: Preserves your work in Verya's session storage so you can resume it tomorrow.
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
├── package.json         # Workspace root
└── tsconfig.base.json   # Shared TypeScript configuration
```

---

## Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Phase 1** | CLI launcher, Vite live preview, element selection, AST transforms, live HMR sync | ✅ Complete |
| **Phase 2** | Project isolation, temporary sessions, diff review modal, external conflict detection, Glassmorphism preset | ✅ Complete |
| **Phase 3** | Multi-preset design system library, drag-to-reorder flex/grid, Figma import tokens | 🚧 In Progress |
| **Phase 4** | AI design assistant ("Make this card feel like a dark glass fitness dashboard") | 📋 Planned |
| **Phase 5** | Vue & Svelte framework adapters | 📋 Planned |

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Dibij/Verya/issues).

---

## License

This project is licensed under the [MIT License](LICENSE).
