# Changelog

All notable changes to this project will be documented in this file.

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

