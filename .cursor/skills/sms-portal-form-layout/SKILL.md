---
name: sms-portal-form-layout
description: >-
  Aligns public portal pages (/apply/:slug, /register-school, confirm/success
  states) so headers, language selectors, steppers, and form cards share one
  column. Use when fixing misaligned lang pickers, toolbars floating past form
  edges, or building new public portal forms on photo backgrounds.
---

# SMS public portal form layout

Companion: [`src/lib/publicPortalLayout.ts`](../../../src/lib/publicPortalLayout.ts), [`sms-ui-consistency`](../sms-ui-consistency/SKILL.md).

## Rule

Public portal pages use a **two-layer shell**:

1. **Page shell** — `PUBLIC_PORTAL_PAGE` (`max-w-6xl mx-auto` + padding)
2. **Form column** — `PUBLIC_PORTAL_COLUMN` (`max-w-4xl space-y-8`)

Everything the user reads or fills (header row, tabs/stepper, subtitle, white form card, footer note) must live **inside** the form column.

Do **not** put `justify-between` header + language select in the page shell while the form is only `max-w-4xl` inside — the lang control will sit at the far right of `6xl`, misaligned with the card.

## Header row pattern

```tsx
<div className={PUBLIC_PORTAL_PAGE}>
  <div className={PUBLIC_PORTAL_COLUMN}>
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex items-center gap-3">{/* back + icon + title */}</div>
      <div className="shrink-0 self-start sm:self-auto">{langSelect}</div>
    </div>
    {/* stepper / tabs */}
    {/* subtitle */}
    <form className={`${PUBLIC_PORTAL_FORM_CARD} space-y-8`}>{/* fields */}</form>
  </div>
</div>
```

## Checklist (run on every portal page edit)

- [ ] `LanguageSelect` uses `variant="glass"` on dark photo backgrounds
- [ ] Header + form share `PUBLIC_PORTAL_COLUMN` (no duplicate `max-w-4xl` only on form)
- [ ] No `absolute top-6 end-6` lang on main form view (OK on centered success/confirm cards)
- [ ] Form card uses `PUBLIC_PORTAL_FORM_CARD` without extra width classes
- [ ] Compare visually with `/apply/:slug` and `/register-school` after change
- [ ] Rebuild `frontend-spa` when shipping

## Success / confirm states

Centered result cards may keep lang in `absolute top-6 end-6` on the viewport — they have no side column form.

## Reference implementations

- `src/pages/PublicApply.tsx`
- `src/pages/RegisterSchool.tsx`
