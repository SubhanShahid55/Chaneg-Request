# ChangeFlow — UI Design & Frontend Craftsmanship Guide

> **Style Identity:** Precision Modern SaaS  
> **Target Experience:** High-density, professional, trustworthy, and distraction-free workflow for agency teams and enterprise clients.  
> **File:** `UI-DESIGN-SKILL.md`  

---

## 1. Core Visual Principles

1. **High Information Density with Generous Breathing Room**: Maximize data clarity without overwhelming the user. Use clear visual hierarchy, 1-pixel borders (`#e2e8f0`), and soft background contrasts (`#f8f9ff` to white).
2. **Deterministic Status Communication**: A change request's status dictates its next action. Always pair status badges with prescriptive guidance (e.g. via `<NextActionBadge />`).
3. **Monospace for Commercial Data**: All numbers representing financial commitments, hours, confirmation hashes, or reference codes must use monospace fonts for instant scanning.
4. **Motion Discipline**: All animations must be snappy, subtle, strictly under 500ms, and completely respect `prefers-reduced-motion`.

---

## 2. Color Palette & Token System

### 2.1 Brand Primary (Indigo)
```css
--color-primary: #3525cd;       /* Deep brand indigo — buttons, active badges, hero gradients */
--color-primary-hover: #4f46e5; /* Vibrant indigo — interactive hover states, focus rings */
--color-primary-light: #eff4ff; /* Pale indigo tint — selected pills, callout backgrounds */
--color-primary-border: #d3e4fe;/* Subtle indigo border — card highlights, token chips */
```

### 2.2 Surface & Neutral Scale
| Token | Hex Value | Usage |
|---|---|---|
| Page Background | `#f8f9ff` | Root layout background, subtle off-white canvas |
| Surface Card | `#ffffff` | Elevated cards, modals, table rows, drawers |
| Primary Text | `#0b1c30` | Main headings, client names, high-contrast labels |
| Secondary Text | `#464555` | Body copy, descriptions, form input values |
| Muted Text | `#777587` | Timestamps, table column headers, helper notes |
| Light Border | `#e2e8f0` | Standard card borders, table dividers |
| Interactive Border| `#cbd5e1` | Form inputs, stepper connectors, buttons |

### 2.3 Semantic Status Palette
| Status | Background | Text | Border | Meaning |
|---|---|---|---|---|
| **`draft` / `pending`** | `bg-amber-50` | `text-amber-800` | `border-amber-200` | Internal estimation & prep needed |
| **`awaiting_approval`** | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Waiting on client signature |
| **`approved`** | `bg-emerald-50` | `text-emerald-800`| `border-emerald-200`| Authorized, ready to schedule |
| **`in_progress`** | `bg-indigo-50` | `text-indigo-700` | `border-indigo-200` | Active implementation |
| **`completed`** | `bg-emerald-50` | `text-emerald-700`| `border-emerald-200`| Finished and delivered |
| **`declined`** | `bg-rose-50` | `text-rose-700` | `border-rose-200` | Client feedback or rejection |

---

## 3. Typography & Formatting Standards

- **Primary Sans Font**: System Sans / Inter (`ui-sans-serif, system-ui, sans-serif`)
- **Monospace Font**: JetBrains Mono / SFMono (`ui-monospace, monospace`)
  - Use `font-mono font-semibold` on:
    - Reference Codes: `CR-1042`
    - Financial Totals: `$3,600`
    - Hours: `24h`
    - Confirmation Codes: `CF-9821`

### Type Scale
- **Page Title**: `text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight`
- **Section Heading**: `text-lg font-bold text-[#0b1c30]`
- **Subheadings**: `text-sm font-semibold text-[#0b1c30]`
- **Body Regular**: `text-sm text-[#464555] leading-relaxed`
- **Caption / Meta**: `text-xs text-[#777587]`
- **Microcopy**: `text-[10px] md:text-[11px] uppercase tracking-wider font-semibold`

---

## 4. Key Component Guidelines

### 4.1 Status Stepper (`<StatusStepper />`)
- Visual progression through the 4 primary stages:
  1. Scope & Estimate
  2. Client Approval (turns to red/rose "Declined" if declined)
  3. In Progress
  4. Completed
- Completed stages render a checkmark icon. The active stage pulses gently.

### 4.2 Next Action Badge (`<NextActionBadge />`)
- Prescribes the immediate next step for the viewer:
  - `draft`: *"Review and add estimate"*
  - `pending`: *"Send to client for approval"*
  - `awaiting_approval`: *"Waiting for client response"*
  - `approved`: *"Begin work"*
  - `in_progress`: *"Complete and deliver"*
  - `completed`: *"Completed"*
  - `declined`: *"Review client feedback"*

### 4.3 Activity Timeline (`<ActivityTimeline />`)
- Chronological or reverse-chronological event feed.
- Differentiate actors visually:
  - **Agency Team Member**: Indigo icon badge, member name.
  - **Client Stakeholder**: Emerald/Rose/Sky badge, client company tag.
- Every event shows a clean relative timestamp (`timeAgo`) with exact date on hover.

### 4.4 Feedback & Toast Notifications (`<Toast />`)
- Three distinct variants: `success`, `error`, and `info`.
- Auto-dismisses after 4,500ms.
- Always include the subject reference code when applicable (e.g. *"CR-1042 Estimate Saved"*).
- Must include accessibility markup: `role="alert"` and `aria-live="polite"`.

---

## 5. Animation & Motion Guidelines

1. **Velocity Charts**:
   - Area fill fade-in: `<= 300ms`
   - Polyline draw: `<= 420ms`
   - Data points pop: `<= 250ms`
2. **Transitions**:
   - Hover states: `transition-colors duration-150 ease-out`
   - Modals & Drawers: `duration-200 ease-out`
3. **Reduced Motion**:
   All CSS keyframe animations must be disabled when `prefers-reduced-motion: reduce` is detected:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

---

## 6. Table Productivity Pattern

All data tables in ChangeFlow must provide:
1. **Interactive Column Sorting**: Visual indicators (`arrow_upward` / `arrow_downward`) indicating current sort field and direction.
2. **Animated Loading Skeletons**: 4–5 skeleton rows matching table column dimensions while data loads.
3. **Empty Filter States**: Clear "No matching change requests" message with an instant "Reset Filters" action button.
4. **Data Export**: One-click CSV export with ISO date filenames.

