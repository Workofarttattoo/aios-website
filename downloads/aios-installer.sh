#!/bin/bash

# Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.

# Ai:oS Installation Script
# Installs the Ai:oS agentic control-plane on your system

set -e  # Exit on error

echo "========================================="
echo "  Ai:oS Installation Script"
echo "  Agentic Control-Plane for Meta-Agents"
echo "========================================="
echo ""

# Check for required tools
echo "[1/6] Checking system requirements..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8+ and try again."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Python $PYTHON_VERSION found"

if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed."
    echo "Please install Git and try again."
    exit 1
fi

echo "✅ Git found"

# Determine installation directory
INSTALL_DIR="${HOME}/aios"
echo ""
echo "[2/6] Installation directory: $INSTALL_DIR"

if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Directory already exists."
    read -p "Remove existing installation and continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
        echo "✅ Removed existing installation"
    else
        echo "❌ Installation cancelled"
        exit 1
    fi
fi

# Clone or download Ai:oS
echo ""
echo "[3/6] Downloading Ai:oS..."

# For now, we'll create a basic structure
# TODO: Replace with actual GitHub URL or download from aios.is
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download from aios.is
if command -v wget &> /dev/null; then
    wget -q https://aios.is/downloads/aios-full-package.zip -O aios.zip
    echo "✅ Downloaded Ai:oS package"
elif command -v curl &> /dev/null; then
    curl -sL https://aios.is/downloads/aios-full-package.zip -o aios.zip
    echo "✅ Downloaded Ai:oS package"
else
    echo "❌ Neither wget nor curl found. Cannot download package."
    exit 1
fi

# Extract package
echo ""
echo "[4/6] Extracting files..."
if command -v unzip &> /dev/null; then
    unzip -q aios.zip
    rm aios.zip
    echo "✅ Files extracted"
else
    echo "❌ unzip not found. Please install unzip and try again."
    exit 1
fi

# Install Python dependencies
echo ""
echo "[5/6] Installing Python dependencies..."

if [ -f "requirements.txt" ]; then
    python3 -m pip install -q --user -r requirements.txt
    echo "✅ Dependencies installed"
else
    echo "⚠️  No requirements.txt found, skipping dependency installation"
fi

# Make scripts executable
echo ""
echo "[6/6] Setting up executable permissions..."

if [ -f "aios" ]; then
    chmod +x aios
    echo "✅ Made aios executable"
fi

if [ -d "tools" ]; then
    chmod +x tools/*
    echo "✅ Made tool scripts executable"
fi

# Installation complete
echo ""
echo "========================================="
echo "  ✅ Ai:oS Installation Complete!"
echo "========================================="
echo ""
echo "Ai:oS has been installed to: $INSTALL_DIR"
echo ""
echo "Quick Start:"
echo "  cd $INSTALL_DIR"
echo "  ./aios -v boot                    # Boot the system"
echo "  ./aios wizard                    # Run setup wizard"
echo "  ./aios -v exec kernel.health     # Execute health check"
echo ""
echo "Documentation:"
echo "  https://aios.is/docs.html"
echo ""
echo "Support:"
echo "  Email: inventor@aios.is"
echo "  Website: https://aios.is"
echo ""
echo "Thank you for using Ai:oS!"
echo "========================================="
