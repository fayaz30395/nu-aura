#!/bin/bash
# Install iTerm2 Shell Integration + it2 CLI
# Run this in your Mac terminal (not inside Claude Code):
#   chmod +x install-it2.sh && ./install-it2.sh

set -e

echo "==> Installing iTerm2 Shell Integration + it2 CLI..."

# Download and install shell integration (includes it2)
curl -fsSL https://iterm2.com/shell_integration/install_shell_integration_and_utilities.sh | bash

echo ""
echo "==> Verifying installation..."

if [ -f "$HOME/.iterm2/it2" ]; then
    echo "✓ it2 installed at ~/.iterm2/it2"
    echo ""
    echo "==> Adding to PATH..."

    # Detect shell
    SHELL_NAME=$(basename "$SHELL")
    if [ "$SHELL_NAME" = "zsh" ]; then
        RC_FILE="$HOME/.zshrc"
    elif [ "$SHELL_NAME" = "bash" ]; then
        RC_FILE="$HOME/.bashrc"
    else
        RC_FILE="$HOME/.profile"
    fi

    # Add to PATH if not already there
    if ! grep -q '.iterm2' "$RC_FILE" 2>/dev/null; then
        echo '' >> "$RC_FILE"
        echo '# iTerm2 shell integration + it2 CLI' >> "$RC_FILE"
        echo 'export PATH="$HOME/.iterm2:$PATH"' >> "$RC_FILE"
        echo "✓ Added ~/.iterm2 to PATH in $RC_FILE"
        echo "  Run: source $RC_FILE"
    else
        echo "✓ PATH already configured in $RC_FILE"
    fi

    echo ""
    echo "==> Done! Verify with:"
    echo "  source $RC_FILE"
    echo "  it2 --help"
    echo ""
    echo "==> Claude Code Agent Teams will now use iTerm2 split panes."
    echo "    Setting already configured: teammateDisplayMode: iterm2"
else
    echo "✗ Installation may have failed. Try manually:"
    echo "  curl -fsSL https://iterm2.com/shell_integration/install_shell_integration_and_utilities.sh | bash"
fi
