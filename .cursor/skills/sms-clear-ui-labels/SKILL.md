---
name: sms-clear-ui-labels
description: >-
  Requires clear, user-facing names for Settings sections, form fields, tabs,
  buttons, empty states, and i18n copy in Gnet SMS. Prefer specific product
  language (e.g. "Certificate signatories") over vague internals (e.g. "Default
  signatories"). Use when writing or renaming UI labels, Settings sections,
  feature chrome, toast/empty copy, or i18n keys in en.ts / locale catalogs.
---

# SMS clear UI labels

Always give **reasonable names** that a school admin understands on first read. Prefer what the thing *is* over how it is stored or that it is a “default.”

## Rule

| Prefer | Avoid |
| :--- | :--- |
| **Certificate signatories** | Default signatories |
| **Document signatures** | Signature map / Slot config |
| **School logo** | Brand asset / Logo URL |
| **Grade sheet template** | Template 1 picker |
| Specific role or document name | “Defaults”, “Misc”, “Advanced options”, “Other”, “Config” |

## Checklist (before shipping copy)

- [ ] Would a Principal understand the label without reading a plan doc?
- [ ] Does the label say **which product surface** it affects (certificates, receipts, report cards…)?
- [ ] Avoid engineering words: `default`, `config`, `slot`, `payload`, `map`, `JSON`, `override` in **visible** UI.
- [ ] Two nearby sections with different jobs must not sound interchangeable (e.g. certificate **names/titles** vs document **signature images**).
- [ ] Update `src/i18n/catalogs/en.ts` (and touched locales if you already edit them); keep key names stable when only the English string changes.

## When naming Settings blocks

1. Lead with the **document or feature**: Certificate…, Fee…, Report card…
2. Then the **user action or object**: signatories, signatures, template, branding
3. Put “default / saved / school-wide” in the **hint**, not the title, when needed

**Example**

- Title: `Certificate signatories`
- Hint: `Saved with school settings and pre-filled when issuing certificates.`

## Code / i18n

- User-visible strings live in i18n catalogs (`pages:settings.*`, feature namespaces).
- Internal identifiers (`certificateDefaults`, `documentSignatories`) may stay technical; **labels** must not.

## Related

- UI layout/tokens: `.cursor/skills/sms-ui-consistency/SKILL.md`
- Business naming in docs can stay precise; this skill is for **on-screen** copy.
