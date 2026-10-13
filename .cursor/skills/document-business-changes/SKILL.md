---
name: document-business-changes
description: >-
  Creates or updates project documentation for business-domain changes such as
  admission, school registration, enrollment, fees, waitlists, invites, attendance
  rules, grades policy, payroll/leave, announcements, or any user/admin workflow.
  Use when implementing or changing business features, product flows, status
  machines, public forms, billing/checkout, or when the user mentions plan docs,
  ONBOARDING_AND_ADMISSION_PLAN, IMPLEMENTATION_STATUS, or documenting behavior.
---

# Document business changes

Authoritative rule: [`.cursor/rules/document-business-changes.mdc`](../../rules/document-business-changes.mdc).  
Templates and doc map: [`reference.md`](reference.md).

## When this skill applies

Use whenever code changes **business behavior** — not only when the user asks for docs. Pure UI polish with no rule/flow change can skip.

## Workflow

```
Docs Progress:
- [ ] 1. Classify domain + pick target doc(s)
- [ ] 2. Prefer update existing over new file
- [ ] 3. Patch status / behavior / acceptance notes
- [ ] 4. Link from IMPLEMENTATION_STATUS if new companion
- [ ] 5. Confirm code + docs ship together
```

### 1. Classify

| Signal in the change | Domain |
| :--- | :--- |
| Admission, apply, enroll, waitlist, documents for applicants | Student admission / lifecycle |
| Register school, invites, school status, public school form, tenant setup | School onboarding |
| Fees, invoices, Stripe/checkout, expenses | Finance |
| Attendance rules, roll call policy | Lifecycle / attendance |
| Exams, grade scales, calendars (policy) | Academic |
| Leave, payroll rules | Staff |
| Announcements / school documents policy | Comms |
| Service split, DB schemas/roles, gateway cutover | Platform / microservices |

### 2. Choose the document

1. Open [`reference.md`](reference.md) doc map.
2. **Update** the primary doc for that domain.
3. If none fits: create `docs/<short-name>_PLAN.md` (or root `*_PLAN.md` matching existing naming) and add one line under `IMPLEMENTATION_STATUS.md` Honest gaps / companions.

### 3. What to write

Update or add:

- **Status banner** at top (date + done/partial) when the plan’s delivery state changed
- **Behavior** — plain English of the new/changed rule or flow
- **Owning service(s)** and main routes/UI paths if known
- **Acceptance / verify** — short checklist someone can run
- Avoid rewriting the whole plan; patch the sections you touched

Use the changelog snippet in [`reference.md`](reference.md) for small incremental updates.

### 4. What not to document here

- CSS-only / token renames → `FRONTEND_GUIDELINES.md` only if design system changed
- Secrets, real credentials, or environment-specific URLs with passwords
- Speculative “future ideas” unless the user asked for a plan

## Done criteria

- [ ] Target markdown updated or created
- [ ] Status matches what was actually shipped
- [ ] New standalone doc linked from `IMPLEMENTATION_STATUS.md`
- [ ] No contradiction with code (status machines, roles, fee steps)
