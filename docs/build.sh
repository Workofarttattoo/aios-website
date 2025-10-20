#!/bin/bash
# Build script for Ai|oS documentation
# Generates HTML documentation from Markdown and Python docstrings

set -e

echo "🔨 Building Ai|oS Documentation..."
echo ""

# Check dependencies
echo "📦 Checking dependencies..."
if ! command -v sphinx-build &> /dev/null; then
    echo "❌ Sphinx not found. Installing..."
    pip install sphinx sphinx-rtd-theme myst-parser sphinx-autodoc-typehints
fi

# Create build directory
BUILD_DIR="_build"
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Generate autodocs from Python modules
echo ""
echo "🐍 Generating API documentation from Python modules..."
sphinx-apidoc -o "$DOCS_DIR/api" ../../aios -f -e -M -T \
    --doc-project "Ai|oS API Reference" \
    2>/dev/null || echo "⚠️  Some modules may not have been processed"

# Build HTML documentation
echo ""
echo "🏗️  Building HTML documentation..."
sphinx-build -b html -W --keep-going . "$BUILD_DIR/html" \
    -c "$DOCS_DIR" \
    -D html_logo="" \
    -D html_title="Ai|oS - Documentation" \
    2>&1 | grep -v "WARNING: graphviz" || true

# Create .nojekyll file for GitHub Pages
echo "" > "$BUILD_DIR/html/.nojekyll"

# Create CNAME file if deploying to custom domain
if [ ! -z "$DOCS_DOMAIN" ]; then
    echo "$DOCS_DOMAIN" > "$BUILD_DIR/html/CNAME"
    echo "📍 Custom domain configured: $DOCS_DOMAIN"
fi

# Generate index redirect if needed
if [ ! -f "$BUILD_DIR/html/index.html" ]; then
    echo "⚠️  Creating index redirect..."
    cat > "$BUILD_DIR/html/index.html" << 'EOF'
<!DOCTYPE html>
<meta charset="utf-8">
<title>Redirecting...</title>
<link rel="canonical" href="/index.html">
<script>location="/index.html"</script>
<meta http-equiv="refresh" content="0; url=/index.html">
EOF
fi

# Print summary
echo ""
echo "✅ Documentation build complete!"
echo "📁 Output directory: $DOCS_DIR/$BUILD_DIR/html"
echo ""
echo "📊 Build statistics:"
find "$BUILD_DIR/html" -name "*.html" | wc -l | xargs echo "   HTML files generated:"
du -sh "$BUILD_DIR/html" | xargs echo "   Total size:"

echo ""
echo "🌐 To view locally:"
echo "   python -m http.server --directory $BUILD_DIR/html 8000"
echo "   Then open http://localhost:8000"

echo ""
echo "🚀 To deploy to GitHub Pages:"
echo "   git add $BUILD_DIR/html && git commit -m 'docs: rebuild documentation'"
echo "   git push origin docs"
