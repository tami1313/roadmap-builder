# How to Revert to Version 1.5.0 (Before Drag-and-Drop)

If you want to completely revert to the version before drag-and-drop was added, follow these steps:

## Option 1: Revert via Git (Recommended)

1. **Checkout the v1.5.0 tag:**
   ```bash
   git checkout v1.5.0
   ```

2. **Create a new branch from this version:**
   ```bash
   git checkout -b revert-to-v1.5.0
   ```

3. **Force push to main (if you want to replace main with this version):**
   ```bash
   git checkout main
   git reset --hard v1.5.0
   git push origin main --force
   ```
   
   **⚠️ WARNING:** This will overwrite the current main branch. Make sure you've backed up any important changes.

## Option 2: Create a New Branch from v1.5.0

If you want to keep the current main branch and work from v1.5.0:

```bash
git checkout -b main-v1.5.0 v1.5.0
git push origin main-v1.5.0
```

Then you can deploy this branch instead of main.

## Option 3: Revert Specific Commits

If you want to undo just the drag-and-drop commits:

```bash
# Revert the drag-and-drop commits (in reverse order)
git revert 8aa47ad  # Revert "Version 1.6.0 - Drag-and-drop reordering..."
git revert 7ee4f5d  # Revert "Fix drag-and-drop: Add displayOrder field..."
git revert 41c08b7  # Revert "Fix drag-and-drop: properly reorder..."
git revert 0022915  # Revert "Fix drag-and-drop: Rebuild problems array..."
git revert 91dbdc3  # Revert "Replace HTML5 drag-and-drop with @dnd-kit..."
git revert 8ed459d  # Revert "Simplify drag-and-drop: Update displayOrder..."
git revert 71d387f  # Revert "Remove all drag-and-drop functionality..."
git revert 0ae11a4  # Revert "Remove remaining drag-and-drop comments..."
```

## What Version 1.5.0 Includes

- Password-protected editor portal
- Error boundary component
- All features from v1.4.0 (delete functionality, orphaned problems, engineering review, etc.)
- **NO drag-and-drop functionality**

## After Reverting

1. **Rebuild the application:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm run dev
   ```

3. **Deploy to Vercel** (it should auto-deploy if connected to GitHub)

