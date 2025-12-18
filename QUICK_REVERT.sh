#!/bin/bash

# Quick revert script to go back to v1.5.0 (before drag-and-drop)
# Run this script to revert to the working version

echo "Reverting to v1.5.0 (before drag-and-drop was added)..."
echo ""

# Checkout v1.5.0
git checkout v1.5.0

# Create a backup branch of current state (optional)
echo "Creating backup branch of current state..."
git branch backup-before-revert-$(date +%Y%m%d)

# Reset main to v1.5.0
echo "Resetting main branch to v1.5.0..."
git checkout main
git reset --hard v1.5.0

echo ""
echo "✅ Reverted to v1.5.0"
echo ""
echo "Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Push to GitHub: git push origin main --force"
echo "3. Vercel will auto-deploy"
echo ""
echo "⚠️  WARNING: The --force push will overwrite the remote main branch."
echo "   Make sure you want to do this before proceeding."

