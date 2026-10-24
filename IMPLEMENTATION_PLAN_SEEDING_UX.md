# Implementation Plan: Remove Auto-Seeding & Improve Setup UX

## Problem Statement Recap
1. App auto-seeds default classes/grade levels without user action - bad design. Default classes/grade levels should only be seeded when user explicitly asks.
2. Analyze creating Grade Level, Classes, Subject, Curriculum flows - make them smooth and user-friendly with best UI/UX. User should be able to proceed without much learning/guidance.

## Current Findings
### Auto-seeding (to fix)
- Identity service services/identity/src/services/schoolProvisioning.ts calls seedStarterPack(school.id) during provisionSchool() - REMOVED.
- seedStarterPack (services/identity/src/lib/starterPack.ts) calls Academic service to seed grade levels and also creates a fee catalog entry.
- Academic service has /api/schools/:schoolId/grade-levels/seed endpoint - fine for explicit user action.
- Frontend curriculum has Seed defaults button in empty state - explicit action, should remain.

### Creation flows
Grade Levels, Subjects, Classes/Classrooms, Curriculum/Syllabus as analyzed.

## Recommended Fixes

### A. Remove/Prevent Auto-Seeding
1. [x] Remove seedStarterPack call from provisionSchool()
2. [ ] Consider making starterPack.ts only do fee catalog (if needed) or keep as-is but not called. Or remove grade level seeding part.
3. [ ] Ensure no other auto-seeding paths exist.

### B. Improve UX
Focus on: clearer empty states, better validation, progressive disclosure, contextual help, streamlined wizards.
