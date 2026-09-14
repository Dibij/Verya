#!/usr/bin/env bash
# Verya Linux & macOS Installer
# Installs Verya into ~/.local/share/verya with launcher at ~/.local/bin/verya
# Configures User PATH without requiring sudo/root privileges.

set -e

REPO="Dibij/Verya"
INSTALL_DIR="$HOME/.local/share/verya"
BIN_DIR="$HOME/.local/bin"

echo ""
echo -e "\033[1;35m"
echo " __   _____ ____  _   _   _   "
echo " \ \ / / __| __ )\ \ / / /_\  "
echo "  \ V /| _||    \ \ V / / _ \ "
echo "   \_/ |___|_||_|  |_| /_/ \_\\"
echo -e "\033[0m"
echo -e "\033[1;36mInstalling Verya — Visual editing for real code...\033[0m\n"

# Check Node.js
if command -v node >/dev/null 2>&1; then
  echo -e "\033[0;32m✓ Node.js detected: $(node --version)\033[0m"
else
  echo -e "\033[0;33m⚠ Warning: Node.js was not detected in PATH. Verya requires Node.js (v18+) to run preview runtimes.\033[0m"
fi

mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Detect OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64|amd64)
    ARCH_NAME="x64"
    ;;
  arm64|aarch64)
    ARCH_NAME="arm64"
    ;;
  *)
    ARCH_NAME="x64"
    ;;
esac

echo "Target: $OS ($ARCH_NAME)"
echo "Installing to: $INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$REPO_ROOT/package.json" ] && [ -d "$REPO_ROOT/packages" ]; then
  echo "Copying Verya files from local build..."
  cp "$REPO_ROOT/package.json" "$INSTALL_DIR/"
  cp "$REPO_ROOT/tsconfig.base.json" "$INSTALL_DIR/" 2>/dev/null || true
  cp -r "$REPO_ROOT/packages" "$INSTALL_DIR/"
  if [ -d "$REPO_ROOT/node_modules" ]; then
    cp -r "$REPO_ROOT/node_modules" "$INSTALL_DIR/"
  fi
else
  TAR_URL="https://github.com/$REPO/releases/latest/download/verya-${OS}-${ARCH_NAME}.tar.gz"
  echo "Fetching release archive from GitHub ($TAR_URL)..."
  if curl -fsSL "$TAR_URL" -o /tmp/verya.tar.gz 2>/dev/null; then
    tar -xzf /tmp/verya.tar.gz -C "$INSTALL_DIR"
    rm -f /tmp/verya.tar.gz
  else
    echo "Falling back to git clone..."
    git clone https://github.com/$REPO.git "$INSTALL_DIR" --depth 1
    cd "$INSTALL_DIR"
    npm install --omit=dev
    npm run build
  fi
fi

# Create verya launcher in ~/.local/bin
cat << 'EOF' > "$BIN_DIR/verya"
#!/usr/bin/env bash
DIR="$HOME/.local/share/verya"
exec node "$DIR/packages/cli/dist/index.js" "$@"
EOF
chmod +x "$BIN_DIR/verya"

# Configure PATH in shell config if ~/.local/bin is not present
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
  SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.profile" ]; then
  SHELL_CONFIG="$HOME/.profile"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    if [ -n "$SHELL_CONFIG" ]; then
      if ! grep -q "$BIN_DIR" "$SHELL_CONFIG" 2>/dev/null; then
        echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$SHELL_CONFIG"
        echo -e "\033[0;32m✓ Added $BIN_DIR to $SHELL_CONFIG\033[0m"
      fi
    fi
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "\033[1;32m✔ Verya installation complete!\033[0m"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To get started:"
echo "1. Open a new terminal window (or run: export PATH=\"\$PATH:$BIN_DIR\")"
echo "2. Navigate to your React project:"
echo "   cd path/to/my-react-app"
echo "3. Run:"
echo "   verya"
echo ""
