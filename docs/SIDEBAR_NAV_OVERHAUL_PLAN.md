# App sidebar navigation — CodingLab-style overhaul plan

> **Status:** Complete (phases 0–4) — 2026-07-31  
> **Scope:** Redesign the authenticated app sidebar (`Layout` chrome for school + Super Admin) to match the attached **dark, rounded, expand/collapse** pattern: icon+label list, accordion groups with nested leaves, **icon-rail** when collapsed (not fully hidden), **floating flyout** for nested groups when collapsed, and a **bottom profile card** (avatar / name / role / logout).  
> **Reference:** Design screenshot (CodingLab-style dark sidebar — expanded + collapsed + flyout).  
> **Non-goals:** Redesigning page content / Executive Slate feature pages; changing role→route ACLs; inventing fake nav items; replacing lucide with another icon set; dark-mode for the whole app canvas.  
> **Companion:** `FRONTEND_GUIDELINES.md`, `docs/RESPONSIVE_UI_PLAN.md`, `docs/UI_CONSISTENCY_PLAN.md`, `docs/ROLE_ACCESS_PLAN.md`, `IMPLEMENTATION_STATUS.md`  
> **Owning surface:** SPA — `src/components/Layout.tsx`, `src/components/sidebar/**`, i18n `common.*` sidebar keys  
> **Stack:** React + Tailwind + `motion/react` + `lucide-react` + existing `getNavSections` / badges / brand remap

### Changelog (2026-07-31) — Phases 0–4 shipped

| Phase | Delivered |
| :--- | :--- |
| 0–1 | Dark `#11101d` rounded rail; desktop icon-rail (`76px`) vs expanded (`288px`); `localStorage` `sms-sidebar-mode` |
| 2 | Section accordion on dark chrome; collapsed multi-item **flyout**; Esc closes flyout |
| 3 | Bottom profile card (avatar / name / role / logout); header keeps search/bell/profile menu |
| 4 | `e2e/sidebar.spec.ts`; docs status; no `NavItem.children` (sections map to groups) |

**Verify:** Login → toggle Panel icons for rail ↔ expanded; hover a multi-item section while collapsed; mobile hamburger drawer; logout from profile card.

### Changelog (2026-07-31) — Global search labels

| Change | Detail |
| :--- | :--- |
| Page titles | `GlobalSearch` resolves `NavItem.labelKey` via `nav` i18n (was reading removed `label` → blank rows) |
| Context | Subtitle shows **section** name (e.g. Academics), not generic “Page” |
| Parity | Shared `getNavSectionsForSession` with Layout so search matches capability-filtered sidebar |
| Verify | Ctrl/Cmd+K → every suggestion has a readable title + section; type a page name |

### Changelog (2026-07-31) — Active state polish

| Change | Detail |
| :--- | :--- |
| Section headers | No solid brand fill when open/active — only **text + icon** use active brand color (`text-indigo-400`, school-remapped) |
| Leaves | Unchanged: solid `bg-indigo-600` + white label for the current route |
| Group chrome | Soft open panel tint only (`bg-white/4`); removed stronger “active group” ring that competed with the leaf pill |

---

## 0. Product intent (plain English)

Today’s sidebar is a **light Executive Slate** panel (`bg-white`, `w-72`). On desktop, “collapse” **hides the sidebar entirely** (width → 0). Groups are **sections with flat leaf links** (no item-level children). Profile lives in the **header** dropdown; the sidebar footer is **logout-only**.

The target pattern (from the attached image) is a **dark charcoal sidebar** that:

1. Stays visible as a **narrow icon rail** when collapsed  
2. Shows **accordion groups** with indented children when expanded  
3. Shows a **floating dark panel** of children when a group is hovered/focused in collapsed mode  
4. Anchors identity at the **bottom** (avatar, name, role, logout)

**Definition of done:** Every authenticated role that has nav today keeps the same destinations and capability filtering, on phone and desktop, with the new chrome. Collapse preference persists. Badges, school brand accent, i18n, and RTL still work.

---

## 1. Current state (audit 2026-07-31)

| Area | Today | Target (image) |
| :--- | :--- | :--- |
| Sidebar color | White / slate borders | Dark navy/charcoal (`≈ #11101d` / `slate-950`) |
| Shape | Full-height flush panel | Soft rounded “floating” rail (`rounded-2xl` / `rounded-[28px]`) inset from canvas edge |
| Desktop collapse | Width → **0** (gone) | Width → **icon rail** (~72–80px); labels hide |
| Nested nav | `NavSection` → flat `NavItem[]` only | Same data can drive **accordion parents**; optional deeper `children` later |
| Collapsed nested | N/A | Flyout to the **end** (LTR right / RTL left) with group title + links |
| Profile | Header dropdown | Bottom **profile card** in sidebar (+ keep compact header actions) |
| Mobile `< lg` | Overlay drawer (done) | Keep overlay; apply dark chrome + accordion/flyout rules adapted for touch |
| Icons | lucide | Keep lucide (map 1:1; do not add Boxicons) |

### Key files

| Path | Role |
| :--- | :--- |
| `src/components/Layout.tsx` | Shell, accordion, drawer, header profile, logout footer |
| `src/constants/navByRole.ts` | `NavSection` / `NavItem`, `getNavSections`, flatten helpers |
| `src/components/UserAvatar.tsx` | Reuse in profile card |
| `src/features/notifications/components/NavBadge.tsx` | Leaf + group badge counts |
| `src/lib/brandPalette.ts` | School brand remaps indigo tokens after login |

### Nav model today (no item children)

```ts
type NavItem = { to: string; icon: LucideIcon; labelKey: string };
type NavSection = { id: string; labelKey: string; items: NavItem[] };
```

Sections already act as accordion groups — **map image “Category / Posts / Plugins” → our existing sections** without requiring a data-model rewrite in Phase 1.

---

## 2. Design principles (reconcile image + SMS)

### 2.1 Visual direction

| Token | Direction |
| :--- | :--- |
| Sidebar canvas | `bg-slate-950` / near `#11101d` (CSS var `--sidebar-bg`) |
| Text | Primary white / `slate-100`; secondary `slate-400` |
| Active leaf | Solid brand fill (`bg-indigo-600` / school-brand remapped) + white text |
| Section header (active child) | **Text + icon only** in brand color (`text-indigo-400`); no solid fill on the parent row |
| Group open | Slightly lighter panel (`bg-white/5` or `bg-slate-900`) behind parent + children |
| Hover | `bg-white/10` |
| Cards / rail | Soft outer radius; subtle `shadow-[0_8px_40px_rgb(0,0,0,0.35)]` |
| Main app canvas | **Stay** `bg-slate-50` Executive Slate — only chrome darkens |
| Icons | `lucide-react` only; stroke weight consistent |

### 2.2 Brand remapping

- Keep `--school-brand-*` remapping for **active/hover accents** inside the dark sidebar.  
- Do **not** recolor the entire dark rail to school brand (avoids unreadable low-contrast themes).  
- Super Admin / platform: default platform blue accents on dark rail.

### 2.3 Honesty & a11y

- No fake nav destinations.  
- Keyboard: accordion `aria-expanded`; flyout focusable; Esc closes flyout/drawer.  
- Hit targets ≥ 44px.  
- Contrast AA for white-on-charcoal and muted secondary text.  
- RTL: flyout opens to the **start** side logically (`end-full` / `inset-inline-end`).  
- `prefers-reduced-motion`: width/opacity transitions shortened or disabled.

### 2.4 Responsive contract (preserve RESPONSIVE_UI_PLAN)

| Viewport | Behavior |
| :--- | :--- |
| `< lg` | Overlay drawer (default closed); hamburger opens; backdrop + Esc + route change closes. Prefer **expanded** labels inside the drawer (no icon-rail on phones). |
| `≥ lg` | Persistent rail; user toggles **expanded ↔ collapsed icon-rail**; remember preference (`localStorage` or existing state key). |

---

## 3. Target information architecture (sidebar chrome)

```text
┌─ Aside (dark, rounded) ─────────────────────┐
│  Brand: logo + “Gnet SMS” / school name     │  ← labels hide when collapsed
│  ─────────────────────────────────────────  │
│  Nav scroll region                          │
│    • Dashboard (leaf)                       │
│    ▾ Academics (section / accordion)        │
│        Curriculum / Classrooms / …          │
│    ▸ Finance                                │
│    …                                        │
│  ─────────────────────────────────────────  │
│  Profile card: avatar · name · role · logout│  ← avatar-only when collapsed
└─────────────────────────────────────────────┘
```

**Collapsed flyout (desktop):** hovering/focusing a section icon opens a floating panel: section title + leaf links (+ badges).

---

## 4. Mapping image → Gnet SMS

| Image concept | Gnet SMS equivalent |
| :--- | :--- |
| CodingLab logo + wordmark | School logo / “G” tile + school name or “Gnet SMS” / “Super Admin” |
| Dashboard leaf | Existing dashboard `NavItem` |
| Category / Posts / Plugins (parents) | Existing `NavSection`s (`overview`, `academics`, `finance`, …) |
| HTML & CSS… children | Existing `section.items` leaves |
| Bottom profile + logout | New `SidebarProfileCard` from `useAuthStore` user + role label |
| Collapse toggle | Header Menu button (existing) retargeted to rail toggle |

**Phase 1 does not require** inventing new nested trees beyond current sections. Optional Phase 4: `NavItem.children` for rare deep trees (e.g. Settings subpages) if product wants item-level nesting.

---

## 5. UX specification

### 5.1 Expanded (≥ lg)

- Width ≈ `18rem` (`w-72`) or `17rem` to match visual density.  
- Section row: icon + label + chevron; click toggles accordion (single-open preferred — keep current behavior).  
- Children: indented, smaller weight, muted until hover/active.  
- Active leaf highlighted.  
- Badges on leaves; section header shows aggregate badge when collapsed closed.

### 5.2 Collapsed icon rail (≥ lg)

- Width ≈ `4.5–5rem` (`w-[72px]`–`w-20`).  
- Show: brand mark, section/leaf **icons only**, profile avatar.  
- Hide: text labels, chevrons (replaced by flyout affordance).  
- Leaf-only icons navigate on click.  
- Section icons open **flyout** on hover (pointer) / click or focus (keyboard/touch-laptop).

### 5.3 Flyout (collapsed only)

- Position: `absolute` / fixed adjacent to rail (`inset-inline-start: 100%` + gap).  
- Contains: section title + list of links.  
- Closes on: pointer leave (with small grace delay), Esc, route navigate, sidebar expand.  
- Portal optional if overflow clipping fights `aside` — prefer portal if needed.

### 5.4 Profile card

| State | Content |
| :--- | :--- |
| Expanded | Avatar + display name + role label + logout icon button |
| Collapsed | Avatar only; tooltip/flyout with name + logout |

Keep header `NotificationBell` + `GlobalSearch`. Header profile dropdown may become **lighter** (optional Phase 3): Profile / Settings links only, or remove duplicate logout to avoid two primary logout affordances — **recommend:** sidebar logout primary; header keeps Profile + Settings.

### 5.5 Motion

- Width + label opacity: `duration 0.2–0.25`, ease matching landing/Layout.  
- Accordion height: `AnimatePresence` / CSS grid trick.  
- Flyout: fade + slight translate on `inline-start`.

---

## 6. Technical architecture

### 6.1 Proposed file split (avoid mega-Layout)

```text
src/components/sidebar/
  SidebarShell.tsx          # aside chrome, widths, rounded inset
  SidebarBrand.tsx
  SidebarNav.tsx            # maps sections → accordion / rail
  SidebarSection.tsx        # expanded accordion + collapsed flyout trigger
  SidebarLeaf.tsx           # link row (expanded + icon-only)
  SidebarFlyout.tsx         # collapsed nested panel
  SidebarProfileCard.tsx    # bottom identity + logout
  sidebarTokens.ts          # width constants, localStorage key
src/components/Layout.tsx   # composes shell + header + Outlet (thinner)
```

### 6.2 State

| State | Storage | Notes |
| :--- | :--- | :--- |
| `desktopSidebarMode` | `localStorage` key e.g. `sms-sidebar-mode` | `"expanded" \| "collapsed"` (≥ lg) |
| `mobileDrawerOpen` | React state | unchanged |
| `openSectionIds` | React state | accordion; sync with active route (existing) |
| `flyoutSectionId` | React state | collapsed hover/focus |

### 6.3 Nav data

**Phase 1:** Keep `NavSection` / `NavItem`. Treat each section as an accordion parent.

**Phase 4 (optional):**

```ts
type NavItem = {
  to?: string;           // omit if pure group
  icon: LucideIcon;
  labelKey: string;
  children?: NavItem[];  // optional nested leaves
};
```

Update `flattenNavSections`, GlobalSearch, role-access, and capability filters if nesting deepens.

### 6.4 Layout geometry

- Desktop: flex row; aside width animated between rail and expanded; `main` fills remainder (already flex).  
- Inset rail look (image): `aside` with `m-3` / `ms-3 my-3` + `rounded-[28px]` so canvas peeks around — adjust `main` padding so content doesn’t feel cramped.  
- Document new widths in `FRONTEND_GUIDELINES.md` and `docs/RESPONSIVE_UI_PLAN.md` § Layout chrome.

### 6.5 i18n

- Reuse `nav.items.*` / `nav.sections.*`.  
- Add keys only if needed: `nav.collapseSidebar`, `nav.expandSidebar`, `nav.profileCard` sr-labels.

---

## 7. Phased delivery

### Phase 0 — Spec freeze & tokens (0.5 day)

| Deliverable | Detail |
| :--- | :--- |
| Token sheet | `--sidebar-bg`, widths `SIDEBAR_EXPANDED_PX` / `SIDEBAR_RAIL_PX`, radius |
| IA mapping | Role sample (School Admin, Teacher, Parent, Super Admin) → section accordion mock |
| Decision log | Profile primary in sidebar; header keeps search/bell; brand accents only on active |

**Acceptance**

- [ ] Written mapping of every current section to accordion parents  
- [ ] Mobile stays overlay-expanded (no rail) agreed  

---

### Phase 1 — Dark shell + icon rail (1–2 days)

| Work | Detail |
| :--- | :--- |
| Extract `SidebarShell` | Dark bg, rounded inset, scroll region |
| Collapse behavior | Replace width→0 with width→rail; persist mode |
| Brand / leaf styling | Dark variants; active indigo/brand |
| Mobile | Dark drawer; full labels |

**Acceptance**

- [ ] ≥ lg toggle expands/collapses to icon rail (sidebar never fully disappears on desktop)  
- [ ] `< lg` overlay drawer still works  
- [ ] Active route visible; badges visible on expanded leaves  
- [ ] RTL: borders/`border-e` logical  

---

### Phase 2 — Accordion polish + collapsed flyout (1–2 days)

| Work | Detail |
| :--- | :--- |
| `SidebarSection` | Expanded accordion matching image (chevron, group wash) |
| `SidebarFlyout` | Collapsed hover/focus panel with section title + leaves |
| Keyboard | Arrow/Esc; focus trap light-touch (not full modal) |
| Pointer delay | 100–150ms close grace to allow moving into flyout |

**Acceptance**

- [ ] Expanded: open section shows indented children  
- [ ] Collapsed: hover section icon → flyout with working links  
- [ ] Navigate closes flyout + mobile drawer  
- [ ] Screen reader: section button names + expanded state  

---

### Phase 3 — Profile card + header cleanup (0.5–1 day)

| Work | Detail |
| :--- | :--- |
| `SidebarProfileCard` | `UserAvatar`, name, translated role, logout |
| Collapsed avatar | Tooltip / mini flyout with logout |
| Header | Keep search + notifications; slim profile menu (Profile / Settings); avoid duplicate heavy identity block if redundant |

**Acceptance**

- [ ] Logout works from sidebar  
- [ ] Profile photo updates via existing `UserAvatar` / auth store  
- [ ] Role string uses existing `enRoles` / i18n roles catalog  

---

### Phase 4 — Optional nesting + hardening (1 day)

| Work | Detail |
| :--- | :--- |
| Optional `children` on `NavItem` | Only if Settings/academic subtrees need it |
| Tests | Playwright: expand/collapse, flyout link, mobile drawer |
| Docs | Update `FRONTEND_GUIDELINES.md` chrome; mark this plan Complete; `IMPLEMENTATION_STATUS` line |
| Rebuild | `docker compose up --build -d frontend-spa` |

**Acceptance**

- [ ] `npm run test:responsive` / new sidebar e2e smoke green (or skip-gated like other e2e)  
- [ ] No regression in capability-filtered empty sections  
- [ ] School brand active color still remaps  

---

## 8. Effort summary

| Phase | Focus | Est. |
| :--- | :--- | :--- |
| 0 | Tokens + mapping | 0.5 d |
| 1 | Dark shell + icon rail | 1–2 d |
| 2 | Accordion + flyout | 1–2 d |
| 3 | Profile card + header | 0.5–1 d |
| 4 | Optional nest + tests/docs | 1 d |
| **Total** | | **~4–6.5 days** |

Suggested ship: **Phase 1+2** as first visible milestone (looks like the reference); **Phase 3** completes the image; **Phase 4** hardens.

---

## 9. Risks & mitigations

| Risk | Mitigation |
| :--- | :--- |
| Dark sidebar vs light pages feels disconnected | Soft inset + rounded rail; keep canvas `slate-50`; strong active accent |
| Long nav lists (School Admin) overflow | Scroll region only in mid nav; sticky brand + profile |
| Flyout clipped by `overflow-hidden` | Portal flyout or overflow-visible on aside |
| Brand color too light on dark | Enforce minimum contrast or fallback to platform blue for active chip |
| Collapse preference surprises users | Default **expanded**; toast-free; remember choice |
| Duplicate logout | Sidebar primary; header secondary or Profile-only |
| Touch devices with `lg` width | Click-to-toggle flyout, not hover-only |

---

## 10. Explicit non-goals

- Full-app dark mode  
- Replacing role matrices or route guards  
- New icon library  
- Exact CodingLab branding/copy  
- Changing public marketing landing sidebar (none)  
- Collapsing sidebar to **zero width** on desktop (explicitly retired)  

---

## 11. Acceptance / verify (program-level)

- [ ] Desktop: expanded ↔ icon-rail toggle; preference survives refresh  
- [ ] Collapsed section flyout navigates correctly  
- [ ] Mobile drawer: dark theme, accordion, closes on navigate  
- [ ] Profile card shows correct user; logout clears session  
- [ ] Badges still appear on leaves / section aggregates  
- [ ] School Admin / Teacher / Parent / Super Admin smoke  
- [ ] Arabic RTL: flyout + chevrons mirrored  
- [ ] `frontend-spa` rebuilt; open `/{slug}/dashboard`  

---

## Change log

### 2026-07-31 — Plan created

- **Change:** Implementation plan for CodingLab-style dark sidebar (icon rail, accordion sections, collapsed flyout, bottom profile card) grounded in current `Layout` / `navByRole`.  
- **Services:** SPA `frontend-spa` only  
- **UI:** `src/components/Layout.tsx`, proposed `src/components/sidebar/*`  
- **Status:** plan only (superseded by ship below)  
- **Verify:** N/A  

### 2026-07-31 — Phases 0–4 implemented

- **Change:** Dark rounded sidebar with icon-rail collapse, section accordion + flyout, bottom profile card; nav filtering/badges/mobile drawer preserved.  
- **Services:** `frontend-spa`  
- **UI:** `src/components/sidebar/**`, `Layout.tsx`  
- **Status:** done  
- **Verify:** Desktop toggle rail; collapsed flyout; mobile drawer; logout; capability-filtered nav unchanged  
