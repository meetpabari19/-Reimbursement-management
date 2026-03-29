Design a multi-screen Employee Portal UI for a web application called "ReimburseX" — an expense reimbursement management system. The design must strictly follow this design system:

─────────────────────────────────────────
DESIGN SYSTEM / TOKENS
─────────────────────────────────────────
Colors:
- Page background:   #eaf0fb
- Card background:   #ffffff
- Soft background:   #f6f8fd
- Text strong:       #0f2a52
- Text main:         #335079
- Text muted:        #6f85a8
- Border default:    #d8e3f2
- Border strong:     #c3d3eb
- Accent blue:       #2f6dff
- Accent hover:      #1f56d6
- Employee accent:   rgba(245, 160, 56, 0.12) — warm orange tint for dashboard bg
- Card shadow:       0 16px 35px rgba(10, 35, 78, 0.10)

Typography:
- Heading font:  Outfit (weights: 400, 500, 600, 700)
- Body font:     Public Sans (weights: 400, 500, 600)
- All labels: uppercase, letter-spacing 0.04em, font-size 0.81rem, color #5b759f
- Headings: letter-spacing -0.02em

Border Radius:
- Cards / Panels:  14px
- Auth card:       18px
- Modals:          18px
- Inputs:          10px
- Buttons:         10px
- Chips / Pills:   999px (fully rounded)
- Table shell:     12px

Status Chip Colors:
- Pending:   background #fff4db, text #9b6f1b
- Approved:  background #dcf8ea, text #1d7453
- Rejected:  background #fde5e5, text #9b3434
- Draft:     background #eee8ff, text #5b3bbf

─────────────────────────────────────────
SCREEN 1 — LOGIN / SIGNUP PAGE
─────────────────────────────────────────
Layout: Two-column split screen (55% / 45%)

Left panel (dark hero):
- Background: diagonal gradient — #08162f → #0d316f (dark navy), with two radial blue glows
- Eyebrow text: "ReimburseX · Employee Portal" in #88abeb, uppercase, spaced
- Large heading: "Expense reimagined." in white, Outfit font, ~3.8rem, tight line-height
- Subtext paragraph in #c7dbff
- Bullet list in #c5d8fb with 4 feature highlights (OCR, multi-currency, approval tracking, history)

Right panel (auth card):
- White card, 18px border-radius, subtle shadow
- Toggle pill switcher at top: "Sign In" | "Sign Up" — active state filled with #2f6dff
- Role selector row labeled "I am a" with 3 pill buttons: 👤 Employee | 👔 Manager | 🔑 Admin
  — Active pill: #2f6dff fill, white text
  — Inactive: white bg, #4f6a93 text, border #c3d3eb
- Form fields: Email, Password (and Name + Company for Sign Up)
  — Input style: border #cdd9ec, radius 10px, bg #fbfdff, focus ring rgba(47,109,255,0.2)
- Primary CTA button: full-width, gradient #3d7eff → #2f6dff, white text, radius 10px
- "Sign Up / Sign In" text toggle link below button

─────────────────────────────────────────
SCREEN 2 — EMPLOYEE DASHBOARD (Main)
─────────────────────────────────────────
Layout: Single column, max-width 1200px, centered, padding 1.5rem
Background: radial-gradient warm orange tint at top-right + #eaf0fb base

Top header row:
- Left: eyebrow "ReimburseX · Employee Portal", h1 "👋 Hello, Alice", subtitle with email + date
- Right: "＋ New Expense" primary button + "Sign Out" ghost button

4-column metric card row (equal width):
Each card: white bg, 14px radius, subtle shadow, border #d8e3f2
1. Total Submitted — blue dot — count — "All time claims" — blue progress bar full width
2. Pending — orange dot — count — "Awaiting approval" — orange progress bar proportional
3. Approved — green dot — count — "$ X reimbursed" — green progress bar proportional
4. Rejected — red dot — count — "Needs resubmission" — red progress bar proportional
Progress bars: 6px height, rounded, light gray track, colored fill

Main panel card below (full width, 14px radius, white bg):
- Two tabs at top: "📋 Expense History" | "⏳ Pending Approvals (N)"
  — Active tab: #2f6dff text + 2px bottom border in #2f6dff
  — Inactive: muted text
- Filter row: two dropdowns (Status filter, Category filter) + results count right-aligned
- Data table inside rounded shell (border #dbe5f4, radius 12px):
  Columns: ID | Date | Category | Description | Amount | USD Equiv. | Status | Approval | Actions
  — Header: bg #f7faff, Outfit bold, sticky
  — Category: small blue pill badge
  — Status: chip component (pending/approved/rejected colors)
  — Approval: mini horizontal stepper (dots connected by line, done=blue, active=orange, rejected=red)
  — Actions: "View" soft blue button, "Resubmit" green button (only on rejected rows)
  — Row hover: bg #f8fbff

─────────────────────────────────────────
SCREEN 3 — SUBMIT EXPENSE MODAL
─────────────────────────────────────────
- Dark overlay backdrop (rgba 48% opacity, blur 4px)
- White modal, 18px radius, max-width 560px, shadow 0 24px 60px rgba(8,22,47,0.22)
- Title "Submit New Expense", subtitle in muted color

OCR Upload Zone (top of form):
- Dashed border #b9cbe7, radius 12px, bg #f8fbff
- Center content: camera emoji icon, bold text "Drop a receipt or click to upload", muted subtext
- Hover state: border changes to #2f6dff, bg #eef4ff
- Scanning state: solid accent border + animated horizontal scan line sweeping top to bottom
- Done state: green checkmark + success message

Form fields below (2-column grid):
- Amount (number input) | Currency (select dropdown — USD, EUR, GBP, INR, etc.)
- Category (select) | Date (date picker)
- Description (full-width textarea, 2 rows)
- USD estimate note below in muted text when non-USD selected

Modal footer (right-aligned):
- "Cancel" ghost button + "Submit Expense →" primary button
- Submit disabled (0.5 opacity) when form invalid

─────────────────────────────────────────
SCREEN 4 — EXPENSE DETAIL MODAL
─────────────────────────────────────────
- Same modal shell as Submit modal
- Header: expense description as h3 + ID & date as subtitle + status chip (right-aligned)
- 2x2 info grid (soft bg #f6f8fd, radius 10px): Amount | USD Equivalent | Category | Date
  — Each cell: small uppercase label in muted, value in bold navy
- Approval Progress section (soft bg box):
  — Label "Approval Progress" uppercase muted
  — Horizontal stepper: circles connected by line
    · Done step: #2f6dff filled circle, white checkmark, blue connecting line
    · Active step: #fff4db fill, orange border, orange text
    · Waiting step: white fill, gray border, gray number
    · Rejected step: #fde5e5 fill, red border, red ✕
  — Approver comments below stepper: "ActorName: comment text" in muted italic style
- Footer: single "Close" primary button right-aligned

─────────────────────────────────────────
COMPONENT SPECS (for component library)
─────────────────────────────────────────
- PrimaryButton: gradient #3d7eff→#2f6dff, white, radius 10px, bold Outfit
- GhostButton: white bg, #274b80 text, border #c3d3eb, radius 10px
- StatusChip: fully rounded pill, 3 variants (pending/approved/rejected)
- CategoryBadge: #eef3fd bg, #2f5bae text, radius 6px
- ApprovalStepper: horizontal, 3 states per dot (done/active/waiting/rejected)
- MetricCard: white card with colored dot, large number, subtext, progress bar
- OCRUploadZone: dashed border box, 3 states (idle/scanning/done)
- TabBar: underline style, accent blue active indicator
- DataTable: rounded shell, sticky header, hover rows, min-width 700px
- Toast notification: dark navy bg (#0f2a52), bottom-right fixed, slide-in animation
  — Success variant: #155f42 green bg
  — Error variant: #8c2f2f red bg