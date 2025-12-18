# Troubleshooting Manual Ordering

## How to Verify It's Working

1. **Open Browser Console** (F12 or Cmd+Option+I)
2. **Refresh the page**
3. **Look for console logs** that start with "Migration:"
   - You should see: "Migration: Starting reorder of existing problems"
   - You should see: "Processing outcome X: [title], Y problems"
   - You should see: "Section now/next/later: X problems"
   - You should see: "Before sort:" and "After sort:" with problem titles and types

## What to Check

### If you see NO console logs:
- The migration isn't running
- Check if you have any roadmap data in localStorage
- Try clearing localStorage and starting fresh

### If you see console logs but ordering is wrong:
1. Check the "Before sort" and "After sort" logs
2. Verify the `type` values match exactly:
   - `'user-facing'` (not 'user-facing feature' or 'User-Facing')
   - `'tooling'`
   - `'infrastructure'`
3. Check if problems have the correct `type` field set

### If problems don't have correct types:
- Edit each problem and verify the "Feature/Functionality" dropdown is set correctly
- The type should be saved when you save the problem

## Quick Test

1. Create 3 new problems in the same outcome, same timeline:
   - One with type "User-Facing Feature"
   - One with type "Tooling"
   - One with type "Infrastructure"
2. They should appear in order: User-Facing → Tooling → Infrastructure
3. If they don't, check the browser console for errors

## Common Issues

1. **Browser Cache**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. **localStorage**: The migration runs once on load. If it didn't work, try clearing localStorage
3. **Type Mismatch**: Make sure problem types are exactly: `'user-facing'`, `'tooling'`, `'infrastructure'`

