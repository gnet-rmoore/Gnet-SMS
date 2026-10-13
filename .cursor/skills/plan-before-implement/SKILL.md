---
name: plan-before-implement
description: >-
  Requires a written implementation plan before coding features, fixes, or
  multi-file changes. Use when the user asks to implement, build, add, fix, or
  ship product work; when starting a new feature; or when about to edit multiple
  files. Skip only for pure typos, one-line refactors, or when the user
  explicitly says to skip the plan.
---

# Plan before implement

## Rule

Before writing **implementation code** for a feature, bug fix, or multi-file change:

1. **Create or update a plan** — `docs/*_PLAN.md`, root `*_PLAN.md`, or Cursor Plan mode / `CreatePlan`.
2. **Do not start coding** until that plan exists and the user has confirmed it — **or** the user explicitly said “skip plan / just implement”.
3. The plan must name: **goal**, **owning service(s)**, **key files**, **phases**, **acceptance checks**, and **doc updates**.
4. After approval, implement **against that plan**; update status banners when done.
5. **May skip:** pure typos, one-line refactors, or formatting-only edits. When unsure, plan.

## Workflow

```
Plan Progress:
- [ ] 1. Draft/update plan doc (or Plan mode)
- [ ] 2. Wait for user confirmation (unless skip requested)
- [ ] 3. Implement against the plan
- [ ] 4. Update plan status + IMPLEMENTATION_STATUS / domain docs
- [ ] 5. Tests + rebuild touched services
```

## Anti-patterns

- Jumping straight into large code edits because “we discussed it in chat”
- Leaving honest gaps undocumented while claiming a phase “done”
- Editing the user’s attached Cursor plan file when they said not to — update project `docs/*_PLAN.md` instead
