#!/bin/bash

set -e

echo "🚀 Setting up claude-personal..."

ZSHRC="$HOME/.zshrc"

# Create isolated config directory
mkdir -p "$HOME/.claude-personal"

# Add function to .zshrc if not already present
if ! grep -q "claude-personal()" "$ZSHRC"; then
  cat << 'EOF' >> "$ZSHRC"

# --- Claude Personal (isolated from company config) ---
claude-personal() {
  env -i \
    HOME="$HOME" \
    PATH="$PATH" \
    XDG_CONFIG_HOME="$HOME/.claude-personal" \
    command claude "$@"
}
# -----------------------------------------------------

EOF
  echo "✅ Added claude-personal to ~/.zshrc"
else
  echo "⚠️ claude-personal already exists in ~/.zshrc"
fi

echo "🔄 Reloading shell config..."
source "$ZSHRC"

echo ""
echo "✅ Setup complete!"
echo ""
echo "👉 Next steps:"
echo "1. Run: claude-personal login"
echo "2. Then: claude-personal"
echo ""
echo "🎯 This will use your personal Claude subscription (no company config)"