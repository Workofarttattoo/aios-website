#!/bin/bash

# Script to create Ai:oS download package
# Run this to update the downloadable files

set -e

echo "Creating Ai:oS download package..."

SOURCE_DIR="/Users/noone/repos_organized/aios"
OUTPUT_DIR="/Users/noone/repos/aios-website/downloads"
PACKAGE_NAME="aios-full-package.zip"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/aios"

echo "Copying files to temporary directory..."
mkdir -p "$PACKAGE_DIR"

# Copy essential files and directories
cp -r "$SOURCE_DIR/aios" "$PACKAGE_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/agents" "$PACKAGE_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/tools" "$PACKAGE_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/examples" "$PACKAGE_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/scripts" "$PACKAGE_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/docs" "$PACKAGE_DIR/" 2>/dev/null || true

# Copy root files
cp "$SOURCE_DIR/aios" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/requirements.txt" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/README.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/setup.py" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/CLAUDE.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/LICENSE" "$PACKAGE_DIR/" 2>/dev/null || true

# Copy markdown docs
cp "$SOURCE_DIR"/*.md "$PACKAGE_DIR/" 2>/dev/null || true

echo "Creating zip archive..."
cd "$TEMP_DIR"
zip -r -q "$OUTPUT_DIR/$PACKAGE_NAME" aios/

# Clean up
rm -rf "$TEMP_DIR"

# Get file size
SIZE=$(du -h "$OUTPUT_DIR/$PACKAGE_NAME" | cut -f1)

echo "✅ Package created successfully!"
echo "   Location: $OUTPUT_DIR/$PACKAGE_NAME"
echo "   Size: $SIZE"
echo ""
echo "Package contents:"
unzip -l "$OUTPUT_DIR/$PACKAGE_NAME" | head -20
echo "..."
echo ""
echo "Upload this file to your web server at:"
echo "   https://aios.is/downloads/$PACKAGE_NAME"
