# Bush League Bocce — Claude Instructions

## Stack
- **Framework:** React + Vite (SPA), deployed on Vercel
- **Data layer:** Google Sheets via `google-spreadsheet` + `google-auth-library`. JWT service account auth. All DB calls go through `/api/sheets` (Vercel serverless function) → `api/_db.js`.
- **Auth:** Client-side only. `VITE_ADMIN_PASSWORD` env var checked in `src/lib/auth.js`; result stored in `sessionStorage`.
- **Deployment:** Vercel, auto-deploys `main` branch. Live at https://bush-league-bocce.vercel.app
- See `ARCHITECTURE.md` for routes, sheet tabs, and component map.
- See `features/` for feature specs.

## Mandatory env vars (Vercel + local `.env.local`)
| Var | Purpose |
|-----|---------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account for Sheets access |
| `GOOGLE_PRIVATE_KEY` | Private key (newlines as `\n`) |
| `GOOGLE_SPREADSHEET_ID` | Target spreadsheet ID |
| `VITE_ADMIN_PASSWORD` | Commissioner password |
| `GEMINI_API_KEY` | AI chat assistant (AdminChat / ActiveSession) |

## MANDATORY: Before any data schema change
1. Note which Google Sheet tab is affected.
2. Show exactly what column changes are needed in the sheet and code before making them.
3. Get explicit confirmation before editing any data files.
4. Never delete rows or tabs without confirmation — no automatic backups.

## MANDATORY: Before any app change
1. Read `ARCHITECTURE.md` and the relevant `features/*.md` file(s).
2. After changes, verify all touched features still work as described.
3. Call out any feature removal/alteration explicitly before proceeding.
4. Update the relevant `features/*.md` as part of the same commit.

## MANDATORY: Tests
- Every new feature or bug fix must include a corresponding test in `app/test/`.
- Run `npm test` before merging to main. Tests must pass — the build (`npm run build`) will also run them, so failing tests block Vercel deploys.
- Tests live in `app/test/*.test.js` and use Vitest. Pure logic only — no Google Sheets I/O. Mock fixtures go inline in the test file.
- Run: `node node_modules/vitest/dist/cli.js run` from `app/`.

## MANDATORY: Keep documentation current
After every change — no exceptions — update whichever of these are affected:
- `CLAUDE.md` — stack, env vars, or mandatory rules
- `ARCHITECTURE.md` — routes, sheet tabs, query/action files, data patterns
- `features/*.md` — any feature's behaviour, layout, or data flow

Documentation updates must be in the same commit as the code change.
