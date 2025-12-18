# Known Issues

## Drag-and-Drop Functionality (Non-Critical)

**Status:** Known Issue - Non-Blocking  
**Date:** 2025-01-XX  
**Severity:** Low (does not prevent core functionality)

### Description
The drag-and-drop functionality for reordering problem cards is visible in the UI but does not work. Users can see drag handles/indicators, but dragging cards does not persist the new order.

### Impact
- **Low Impact:** Users cannot manually reorder problems within timeline sections
- **Workaround:** Problems maintain their original order based on when they were added
- **Core Functionality:** All other features work correctly (add, edit, delete, filters, etc.)

### Technical Details
- Drag-and-drop code has been removed from the codebase
- Some UI elements may still be visible (likely from cached assets or browser state)
- The `displayOrder` field exists in the data structure but is not actively used for reordering

### Resolution Plan
- Future enhancement: Implement alternative manual ordering solution (up/down buttons, number inputs, etc.)
- Not a priority for current roadmap building phase

### User Action Required
**None** - This issue does not prevent you from building out your roadmap. All core functionality works as expected.

