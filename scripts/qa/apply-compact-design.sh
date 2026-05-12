#!/bin/bash

# Script to help migrate pages to compact design
# This performs basic regex replacements - manual review is still needed

echo "🎨 Compact Design Migration Tool"
echo "================================="
echo ""

# Check if a directory is provided
if [ -z "$1" ]; then
  echo "Usage: ./apply-compact-design.sh <path-to-file-or-directory>"
  echo "Example: ./apply-compact-design.sh frontend/app/home/page.tsx"
  exit 1
fi

TARGET="$1"

# Function to apply replacements to a file
apply_compact_design() {
  local file=$1
  echo "📝 Processing: $file"

  # Create backup
  cp "$file" "$file.backup"

  # Page-level spacing
  sed -i '' 's/className="p-6 md:p-8/className="p-4 md:p-5 lg:p-6/g' "$file"
  sed -i '' 's/className="p-8/className="p-4 md:p-5 lg:p-6/g' "$file"
  sed -i '' 's/space-y-6/space-y-4/g' "$file"
  sed -i '' 's/gap-6/gap-4/g' "$file"

  # Card padding
  sed -i '' 's/<CardContent className="p-6/<CardContent className="p-4/g' "$file"
  sed -i '' 's/<CardHeader className="p-6/<CardHeader className="p-4/g' "$file"

  # Typography
  sed -i '' 's/text-3xl font-bold/text-2xl font-bold/g' "$file"
  sed -i '' 's/text-xl font-bold/text-base font-bold/g' "$file"

  # Icons (this is trickier, be careful)
  sed -i '' 's/h-10 w-10/h-8 w-8/g' "$file"
  sed -i '' 's/h-12 w-12/h-10 w-10/g' "$file"
  sed -i '' 's/className="h-6 w-6/className="h-4 w-4/g' "$file"

  # Buttons
  sed -i '' 's/h-14 px-6/h-12 px-6/g' "$file"
  sed -i '' 's/h-14 px-8/h-12 px-6/g' "$file"

  # Tables
  sed -i '' 's/px-6 py-4/px-4 py-3/g' "$file"

  # Charts
  sed -i '' 's/h-\[360px\]/h-[280px]/g' "$file"
  sed -i '' 's/h-\[400px\]/h-[300px]/g' "$file"

  # Hover effects
  sed -i '' 's/hover:-translate-y-1/hover:-translate-y-0.5/g' "$file"

  echo "✅ Completed: $file"
  echo "   Backup saved as: $file.backup"
}

# Process files
if [ -f "$TARGET" ]; then
  # Single file
  apply_compact_design "$TARGET"
elif [ -d "$TARGET" ]; then
  # Directory - find all page.tsx files
  find "$TARGET" -name "page.tsx" -type f | while read -r file; do
    apply_compact_design "$file"
  done
else
  echo "❌ Error: $TARGET is not a valid file or directory"
  exit 1
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "⚠️  Important: Review all changes manually before committing"
echo "   - Check icon sizes in context"
echo "   - Verify button heights match their usage"
echo "   - Ensure grid layouts still work"
echo "   - Test responsiveness"
echo ""
echo "To restore a file: mv <file>.backup <file>"
