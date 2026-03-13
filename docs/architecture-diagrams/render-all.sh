#!/bin/bash

##############################################################################
# NU-AURA HRMS - Diagram Rendering Script
# Renders all Mermaid diagrams to PNG/SVG for presentations
##############################################################################

set -e

echo "🎨 NU-AURA HRMS - Diagram Rendering Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUTPUT_DIR="${SCRIPT_DIR}/rendered"

# Create output directory
mkdir -p "${OUTPUT_DIR}/png"
mkdir -p "${OUTPUT_DIR}/svg"

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo -e "${RED}❌ Mermaid CLI (mmdc) not found!${NC}"
    echo ""
    echo "Installing Mermaid CLI..."
    echo ""

    # Try to install with npm
    if command -v npm &> /dev/null; then
        echo "Installing @mermaid-js/mermaid-cli globally..."
        npm install -g @mermaid-js/mermaid-cli
        echo -e "${GREEN}✅ Mermaid CLI installed successfully!${NC}"
    else
        echo -e "${RED}❌ npm not found. Please install Node.js first:${NC}"
        echo ""
        echo "  brew install node"
        echo "  npm install -g @mermaid-js/mermaid-cli"
        echo ""
        exit 1
    fi
fi

echo -e "${BLUE}📦 Found Mermaid CLI: $(which mmdc)${NC}"
echo ""

# Count diagrams
DIAGRAM_COUNT=$(ls -1 ${SCRIPT_DIR}/*.mmd 2>/dev/null | wc -l | tr -d ' ')

if [ "$DIAGRAM_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No .mmd files found in ${SCRIPT_DIR}${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Found ${DIAGRAM_COUNT} diagrams to render${NC}"
echo ""

# Render each diagram
RENDERED=0
FAILED=0

for mmd_file in ${SCRIPT_DIR}/*.mmd; do
    if [ -f "$mmd_file" ]; then
        filename=$(basename "$mmd_file" .mmd)

        echo -e "${YELLOW}🔄 Rendering: ${filename}${NC}"

        # Render PNG (3000px width for high quality)
        if mmdc -i "$mmd_file" -o "${OUTPUT_DIR}/png/${filename}.png" -w 3000 -b transparent 2>/dev/null; then
            echo -e "${GREEN}   ✅ PNG: ${OUTPUT_DIR}/png/${filename}.png${NC}"
        else
            echo -e "${RED}   ❌ PNG rendering failed${NC}"
            ((FAILED++))
        fi

        # Render SVG (vector for infinite zoom)
        if mmdc -i "$mmd_file" -o "${OUTPUT_DIR}/svg/${filename}.svg" -b transparent 2>/dev/null; then
            echo -e "${GREEN}   ✅ SVG: ${OUTPUT_DIR}/svg/${filename}.svg${NC}"
            ((RENDERED++))
        else
            echo -e "${RED}   ❌ SVG rendering failed${NC}"
            ((FAILED++))
        fi

        echo ""
    fi
done

echo "=========================================="
echo -e "${GREEN}✅ Rendering Complete!${NC}"
echo ""
echo "Summary:"
echo "  • Diagrams rendered: ${RENDERED}"
echo "  • Failures: ${FAILED}"
echo ""
echo "Output locations:"
echo "  • PNG files: ${OUTPUT_DIR}/png/"
echo "  • SVG files: ${OUTPUT_DIR}/svg/"
echo ""
echo -e "${BLUE}📁 Opening output directory...${NC}"
open "${OUTPUT_DIR}"

echo ""
echo "Next steps:"
echo "  1. Open the 'rendered' folder"
echo "  2. Use PNG files for PowerPoint/Google Slides"
echo "  3. Use SVG files for Confluence/high-quality prints"
echo ""
echo -e "${GREEN}🚀 Ready for your presentation!${NC}"
