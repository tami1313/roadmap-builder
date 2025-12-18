# How to Verify Manual Ordering is Working

## Expected Behavior

### Problem Ordering (Within Each Outcome)
Problems should be sorted by type in this order:
1. **User-Facing Features** (👥) - First
2. **Tooling** (🔧) - Second  
3. **Infrastructure** (⚙️) - Third

### Outcome Ordering
Expected outcomes should be sorted by their earliest timeline:
1. **NOW** - Outcomes that include "now" in their timeline
2. **NEXT** - Outcomes that include "next" (but not "now")
3. **LATER** - Outcomes that only include "later"

## How to Test

1. **Create test data:**
   - Add at least 2-3 expected outcomes with different timelines
   - Add problems of different types (user-facing, tooling, infrastructure) to each outcome

2. **Check the Roadmap View:**
   - Outcomes should appear in order: NOW → NEXT → LATER
   - Within each outcome's timeline section, problems should appear: User-Facing → Tooling → Infrastructure

3. **Check the Builder Page:**
   - Same ordering should apply in the builder view

## Troubleshooting

If ordering isn't working:

1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check Vercel deployment status** - Make sure the latest commit is deployed
3. **Check browser console** for any JavaScript errors
4. **Verify data structure** - Make sure problems have the `type` field set correctly

## Current Implementation

The sorting is implemented in:
- Roadmap view: `src/components/RoadmapBuilder.tsx` around line 1839-1850
- Builder view: Multiple locations where outcomes and problems are rendered

