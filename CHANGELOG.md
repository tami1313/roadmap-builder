# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-XX

### Major Updates

#### Features
- **Horizontal Calendar-Style Roadmap View**
  - Changed from vertical stacked layout to horizontal 3-column grid
  - NOW, NEXT, LATER displayed side-by-side like a calendar/Gantt chart
  - More compact card design optimized for column layout
  - Better visual organization matching original examples

- **Priority Field**
  - Added priority field to problems (Must Have vs Nice to Have)
  - Visual indicators: 🔴 Must Have, 🟡 Nice to Have
  - Required field in problems form

- **Enhanced Validation System**
  - Post-build validation now supports methods (User Validation, SME Evaluation)
  - Method-specific notes fields for all validation types
  - Pre-build: User Testing Notes, Internal Experimentation Notes
  - Post-build: User Validation Notes, SME Evaluation Notes
  - Notes fields appear conditionally when methods are selected

- **Comprehensive Error Handling**
  - Validation feedback when saving with missing required fields
  - Clear error messages listing all missing fields
  - Visual error indicators (red borders) on invalid fields
  - Real-time error clearing as fields are completed
  - Error messages for both Expected Outcomes and Problems forms

#### Improvements
- Removed Good/Better/Best iteration functionality from Expected Outcomes
- Better form organization with method-specific validation fields
- Improved user experience with immediate validation feedback

## [1.1.0] - 2025-01-XX

### Enhanced Builder Pages

#### Features
- **Nested Problems Display**
  - Problems to solve now display nested under their expected outcomes on the builder page
  - Shows only essential information (title and description) for both outcomes and problems
  - Clear visual hierarchy with proper nesting

- **Collapsible Problems Section**
  - Added +/- toggle functionality to collapse/expand problems under each outcome
  - Each outcome's problems can be expanded/collapsed independently
  - Minus (−) indicates expanded, Plus (+) indicates collapsed

- **Feature/Functionality Field**
  - Restored Feature/Functionality field to problems form
  - Can now edit type (Tooling/Infrastructure or User-Facing Feature) from builder and roadmap view
  - Required field with proper validation

#### Improvements
- Better organization of expected outcomes list
- Improved visual separation between outcomes and problems
- Enhanced edit functionality across all views

## [1.0.0] - 2025-01-XX

### Initial Release - External Roadmap View

#### Features
- **Phase 1: Define Expected Outcomes**
  - Add expected outcomes with title and description
  - Select timeline sections (NOW, NEXT, LATER) with multi-select support
  - Add iterations (Good → Better → Best) when spanning multiple timeline sections
  - Edit functionality from builder page and roadmap view

- **Phase 2: Add Problems to Solve**
  - Add problems under each expected outcome
  - Success criteria tracking ("What Success Looks Like")
  - Feature/Functionality type (Tooling/Infrastructure or User-Facing Feature)
  - Timeline bucket assignment (NOW, NEXT, LATER)
  - Validation support:
    - Pre-Build Validation (User Testing and/or Internal Experimentation)
    - Post-Build Validation
    - Can select both pre-build and post-build validation
  - Edit functionality from builder page and roadmap view

- **External Roadmap View**
  - Instructure-style collapsible sections
  - Timeline sections: NOW | Q3, NEXT | Q4, LATER | Q1
  - Outcome cards with expand/collapse
  - Problem cards with icons and details
  - Always shows success criteria and internal details (type, validation)

- **Data Persistence**
  - Auto-saves to browser localStorage
  - Data persists between sessions

#### Technical Details
- Built with Next.js 14 and TypeScript
- Tailwind CSS for styling
- Client-side only (no backend required)

