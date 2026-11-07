# MatchDistrict Website Agent Instructions

These instructions govern all AI agent tasks within `matchdistrict-website/`.

## 1. Project Scope & Isolation
- Work strictly inside `matchdistrict-website/`.
- Do not inspect or modify `matchdistrict-manager-discord-bot/`, `matchdistrict-whatsapp-dm/`, or root utility directories.
- Before reading code or implementing changes, consult [`PROJECT_CONTEXT.md`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/PROJECT_CONTEXT.md) to understand existing page routes, backend services, and database schema.

## 2. File Exploration & Inspection Rules
- Do NOT read the entire 23,000+ lines of `server.js` or complete directory dumps of `src/` at once.
- Locate the specific service in `server/` (e.g., `allocationService.js`, `manualRoadmapService.js`, `subscriptionMiddleware.js`, `districtId.js`) or page/component in `src/pages/` or `src/components/`.
- Use bounded line ranges (`StartLine`/`EndLine`) when reading `server.js` or large service files.
- Never perform unbounded searches in `node_modules/`, `dist/`, or `.git/`.

## 3. Architecture & Development Conventions

### Frontend (React 19 & Vite)
- **Framework**: React 19, Vite 8, React Router v7.
- **Routing**: Update router definitions in `src/App.jsx` when adding or updating pages.
- **Styling**: Maintain consistent responsive styling adhering to MatchDistrict gaming theme using existing CSS patterns (`index.css`, `App.css`).
- **Icons & Animation**: Use `lucide-react` for UI icons and `framer-motion` for transitions.
- **State Management**: Use React standard hooks (`useState`, `useContext`, `useMemo`) and existing context providers (`UserContext`, `ThemeContext`).

### Backend (Node.js Native HTTP API)
- **Routing**: Native Node.js `http.createServer` handling request dispatching in `server.js`. Keep new endpoints modular by extracting business logic into `server/<serviceName>.js`.
- **Worker Processes**: Background slot allocation and cleanup runs in `workers/slotManagerWorker.js`.
- **Security & Validation**: Sanitize user inputs, enforce subscription limits via `server/subscriptionMiddleware.js`, and validate District IDs with `server/districtId.js`.

### Database & Migrations (Supabase PostgreSQL)
- **Connection**: Managed PostgreSQL pool via `server/db.js` and `@supabase/supabase-js`.
- **Parameterization**: Always use parameterized queries (`$1, $2, ...`) with `pool.query()`. Never concatenate raw SQL strings.
- **Schema Migrations**: Database schema modifications must be added idempotently via `server/schemaMigrations.js`. Never execute manual unrecorded schema alterations.

## 4. Testing & Verification
- Run backend test suites using Node.js built-in test runner:
  ```powershell
  # Run free tournament flow tests
  node --test server/freeTournamentFlow.test.js
  # Run district ID tests
  node --test server/districtId.test.js
  # Run verification tests
  node --test server/verificationFlow.test.js
  ```
- Verify frontend builds and linting when editing client code:
  ```powershell
  npm run build
  ```

## 5. Context Maintenance
- If a new page, route endpoint, database table, or business service is introduced or modified, update the corresponding section in [`PROJECT_CONTEXT.md`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/PROJECT_CONTEXT.md).

