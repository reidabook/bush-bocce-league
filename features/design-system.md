# Design System — "Can label"

Built from the Bush League logo (navy can, ice-blue peaks, condensed wordmark). Approved mockup: https://claude.ai/artifact/TM5T7Btzk12Ph1r9URZNdA · PRD: issue #1.

## Tokens (`src/index.css`)

CSS variables on `:root`, swapped under `prefers-color-scheme: dark`, exposed to Tailwind via `@theme inline` (`bg-ice`, `text-muted`, `bg-card`, …).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--navy` | `#1B2F5E` | `#0B1530` | Header chrome |
| `--ink` | `#0F1C3D` | `#E6EEF6` | Body text |
| `--ice` | `#E8EFF5` | `#0E1A38` | Page background |
| `--card` | `#FFFFFF` | `#16264D` | Surfaces |
| `--sky` | `#89B4D0` | `#89B4D0` | Accents on navy, focus ring |
| `--muted` | `#52627F` | `#9DB0C8` | Secondary text |
| `--line` / `--hair` | `#D3DEE8` / `#E3EAF1` | `#24365F` / `#1F3058` | Borders / row dividers |
| `--live` | `#C8372D` | `#E5534B` | Live dot + "In play" only |

`.text-brand` = navy in light, near-white in dark — for titles and big numbers.

## Type

- **Big Shoulders** 700–900, uppercase (`.font-display`) — titles, points, ranks. Never body copy.
- **Barlow** 400–700 (`font-sans`) — names, copy, controls. `.tabular` for stats.
- Section labels: Barlow 700, 12px, tracked caps, muted (`SectionLabel`).

## Team balls (`src/lib/teamColors.js`, `components/Ball.jsx`)

A team's color = its position when the session's teams are sorted by name (same order the API returns): red `#C8372D`, green `#2E8B57`, blue `#2D6CDF`, yellow `#E3B23C`, then purple, orange. Nothing stored. Red + green are the league's real balls, so 2-team sessions are always red vs green; other colors only appear with 3+ teams. `Ball` renders a shaded sphere; `pallino` variant marks the standings leader.

While teams are being built (New session), random/snake teams are listed in color order; manual mode uses numbered slots because colors aren't settled until captains are.

## Shell (`components/Layout.jsx`)

Navy header (logo, wordmark, commissioner button) ending in a mountain-ridge SVG edge. Top padding = safe-area inset + 18px so the wordmark sits clear of the iPhone status bar. Fixed bottom tab bar: Standings · Tonight · Sessions · Rules; red dot on Tonight while a session is active (`useActiveSession`, 60s cache). The tab bar sits in a fixed bottom stack with a `#dock-slot` above it; pages portal action bars there (Tonight's assistant + "+ Game") so they move with the tabs. Tabs hide while a text field is focused, so only the dock rides above the phone keyboard. Text inputs are ≥16px so iOS doesn't zoom.

## Primitives (`components/ui.jsx`)

`PageTitle`, `SectionLabel`, `Card`, `LiveLabel`, `Pill`, `Button` (primary/secondary/ghost/danger; sm/md/lg), `EmptyState`, `Icon` (inline stroke SVG set).

## Rules

- Color only means a team; red only means live.
- Tap targets ≥ 44px; primary actions at the bottom, in thumb reach.
- Copy: sentence case; "Commissioner" not "Admin"; "Session" not "Week"; buttons say what they do.
- Visible focus ring (sky); `prefers-reduced-motion` kills transitions.
