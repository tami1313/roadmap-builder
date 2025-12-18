#!/bin/bash
# Run these commands in your terminal

cd /Users/tamilayman/Cursor/roadmap

echo "Pushing code to GitHub..."
echo "When prompted:"
echo "  Username: Enter your GitHub username (tami1313)"
echo "  Password: Paste your Personal Access Token (NOT your GitHub password)"
echo ""

git push -u origin main-v1.5.0

echo ""
echo "Pushing tags..."
git push --tags

echo ""
echo "Done! Your code is now on GitHub."

