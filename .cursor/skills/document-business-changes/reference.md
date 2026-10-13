# Document business changes — reference

## Doc map

| Domain | Prefer updating | Create new if… |
| :--- | :--- | :--- |
| School registration, invites, public school apply, school status, setup checklist | `ONBOARDING_AND_ADMISSION_PLAN.md` | N/A — extend that plan |
| Student admission, documents, waitlist, enroll saga, class placement | `ONBOARDING_AND_ADMISSION_PLAN.md` | N/A |
| Microservices phases, compose/K8s posture, DB schemas/roles, gateway | `IMPLEMENTATION_STATUS.md` | Architecture intent → also `MICROSERVICES_ROADMAP.md` |
| UI / Executive Slate / page shell | `FRONTEND_GUIDELINES.md` | New UI subsystem needs its own short guide |
| Finance-only billing beyond admission fees | Extend onboarding plan **or** create `docs/FINANCE_BILLING_PLAN.md` | No finance plan exists yet and scope is large |
| Staff leave / payroll policy | Create `docs/STAFF_WORKFORCE_PLAN.md` if none | First non-trivial staff policy change |
| Academic grading policy | Create `docs/ACADEMIC_GRADING_PLAN.md` if none | First non-trivial grading policy change |
| Ops / logistics | Create `docs/OPS_FACILITIES_PLAN.md` if none | First non-trivial ops workflow |

Root companions today:

- `ONBOARDING_AND_ADMISSION_PLAN.md`
- `IMPLEMENTATION_STATUS.md`
- `MICROSERVICES_ROADMAP.md`
- `FRONTEND_GUIDELINES.md`

## Incremental changelog snippet

Add near the top of the plan (after the status banner) or under a `## Change log` section:

```markdown
### YYYY-MM-DD — <short title>

- **Change:** <one sentence what users/admins can do differently>
- **Services:** <identity | lifecycle | finance | …>
- **UI / API:** <path or route if useful>
- **Status:** done | partial
- **Verify:** <1–3 bullets>
```

## New plan file skeleton

```markdown
# <Feature> — Plan

> **Status:** Draft | In progress | Complete (YYYY-MM-DD)
> **Scope:** <who / what>
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| … | … |

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| … | … |

## 2. Flows / rules

…

## 3. Acceptance

- [ ] …
```

## Link from implementation status

When creating a new companion, add under Honest gaps / follow-ups:

```markdown
N. <Domain> plan: see `docs/<NAME>_PLAN.md` (or root `*_PLAN.md`).
```
