# Project Context: MatchDistrict Esports Web Platform

## 1. Project Overview & Architecture
* **Project Name**: `matchdistrict` (`matchdistrict-website`)
* **Purpose**: Comprehensive esports tournament hosting and community web platform. Powers player accounts, tournament discovery, interactive bracket & roadmap creation, squad registration, slot allocation, automated qualification, payment/UTR processing, and organizer subscriptions.
* **Frontend**: React 19 (`react` 19.2.7), React Router v7 (`react-router-dom` 7.18.0), Vite 8 (`vite` 8.0.12), Tailwind/CSS (`index.css`, `App.css`), `lucide-react`, `framer-motion`, `recharts`, `@floating-ui/react`.
* **Backend**: Node.js (>=18, ESM), custom native HTTP server in [`server.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server.js), background slot workers in `workers/`.
* **Database**: Supabase PostgreSQL managed via `pg` connection pool ([`server/db.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/db.js)) and `@supabase/supabase-js`.
* **Entry Points**:
  * Frontend: [`src/main.jsx`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/src/main.jsx) & [`src/App.jsx`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/src/App.jsx)
  * Backend API: [`server.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server.js)
* **Build System**: Vite (`npm run build` -> `dist/`)

---

## 2. Directory Structure
```
matchdistrict-website/
├── AGENTS.md                          # Project-specific AI agent guidelines
├── PROJECT_CONTEXT.md                 # Persistent architectural memory & service catalog
├── server.js                          # Native HTTP API router, auth endpoints, tournament endpoints
├── schema.sql                         # Baseline PostgreSQL schema for Supabase
├── vite.config.js                     # Vite build and proxy configuration
├── server/                            # Modular backend domain services
│   ├── db.js                          # PostgreSQL connection pool with TLS configuration
│   ├── schemaMigrations.js            # Automated, idempotent schema migration engine
│   ├── districtId.js                  # Standardized District ID generation & validation
│   ├── tournamentPlanner.js           # Tournament size calculations & stage distributions
│   ├── roadmapGenerator.js            # Automated district roadmap generator
│   ├── manualRoadmapService.js        # Drag-and-drop / manual roadmap draft & publish engine
│   ├── roadmapConfig.js               # Roadmap validation, district sizes, advancement rules
│   ├── roadmapValidation.js           # Timing, schedule, and structural validation for roadmaps
│   ├── roundsService.js               # Round synchronization and legacy backfill
│   ├── squadRegistrationService.js    # Squad capacity parsing and stage verification
│   ├── allocationService.js           # Slot reservation, group allocation, and conflict checks
│   ├── roundProgressionService.js     # Team qualification and advancement engine
│   ├── matchResultService.js          # Public match result and leaderboard score mapping
│   ├── subscriptionMiddleware.js      # Organizer subscription tiers & feature gating
│   ├── paymentReviewService.js        # Manual UTR / payment verification review
│   ├── prizeAwardService.js           # Prize pool distribution calculation
│   ├── prizePayoutService.js          # Payout execution and tracking
│   ├── accountSecurity.js             # 2FA TOTP verification and password management
│   ├── verificationCodeService.js     # Discord bot <-> website link verification codes
│   ├── profileSync.js                 # Auth user to profile synchronization
│   ├── testDataCleanupService.js      # Test data injection removal
│   └── *.test.js                      # Service-level unit and integration test suites
├── workers/
│   └── slotManagerWorker.js           # Background worker for tournament slot reconciliation
├── src/
│   ├── main.jsx                       # Client bootstrap & root rendering
│   ├── App.jsx                        # React Router v7 route declarations
│   ├── index.css & App.css            # Platform-wide gaming dark-mode styling
│   ├── contexts/                      # UserContext (auth/profile) & ThemeContext
│   ├── pages/                         # 32 page components (Player, Organizer, Admin)
│   ├── components/                    # Reusable UI widgets, form builders, modals, cards
│   ├── config/                        # Client-side configuration (auth, environment)
│   ├── lib/                           # Supabase client helpers
│   └── services/                      # Client-side API fetch wrappers
└── migrations/                        # SQL migration snapshots
```

---

## 3. Frontend Architecture

### Routing & Key Pages (`src/pages/`)
* **Public & Player Pages**:
  * `Homepage.jsx`: Hero showcase, live tournament carousels, game categories, features.
  * `Tournaments.jsx` & `TournamentDetail.jsx`: Tournament browsing, search, detailed rules, schedules, and prize structures.
  * `RegistrationPage.jsx`: Multi-stage registration form, squad builder, player in-game ID validation.
  * `TournamentInvite.jsx`: Direct invite token handler for squad members.
  * `Profile.jsx`: Player profile, District ID badge, connected Discord/Google accounts, participation history.
* **Authentication Flow**:
  * `Auth.jsx`: Login/signup with email/password, Google OAuth, and Discord OAuth.
  * `AuthLink.jsx` & `AuthSuccess.jsx`: Account linking callbacks and confirmation screens.
* **Organizer Suite**:
  * `BecomeOrganizer.jsx` & `OrganizerForm.jsx`: Organizer onboarding application.
  * `OrganizerDashboard.jsx` & `OrgPage.jsx`: Tournament metrics, follower tracking, branding settings.
  * `CreateTournament.jsx`: Comprehensive multi-step wizard for tournament configuration.
  * `TournamentManagement.jsx`: Active tournament controls (slots, roasters, credentials, rounds).
  * `TournamentRegistrations.jsx`: Review and approval/rejection of participant registrations.
  * `SubscriptionPayment.jsx` & `PaymentHistory.jsx`: Organizer plan upgrades and billing receipts.
* **Admin Control Center**:
  * `AdminDashboard.jsx`: High-level system statistics and activity feeds.
  * `AdminOrganizers.jsx`: Review and approve/reject organizer verification applications.
  * `AdminPayments.jsx`: Manual UTR payment verification queue for subscription upgrades and entry fees.
  * `AdminSponsorships.jsx`: Review and manage tournament sponsorship requests.
  * `AdminSystemHealth.jsx`: Database connection pool stats and API latency monitors.
  * `AdminAuthenticatorSetup.jsx`: 2FA TOTP configuration for admin accounts.

---

## 4. Backend Architecture & API Services

### Native HTTP API (`server.js`)
* **No Heavy Web Framework**: Operates as a lightweight, performant native Node.js HTTP server (`http.createServer`).
* **Route Dispatching**:
  * `/api/auth/*`: Registration, login, password reset via Resend, OTP verification, Google/Discord callbacks.
  * `/api/tournaments/*`: CRUD operations, registration submissions, roadmap retrieval, slot status.
  * `/api/roadmap/*`: Draft creation, automated distribution calculation, manual slot reordering, publication.
  * `/api/organizer/*`: Applications, profile updates, follower counts, branding.
  * `/api/admin/*`: Organizer verification approvals, manual UTR review, subscription upgrades, dynamic financials (`/api/admin/financials`).
  * `/api/settings/*`: Site configuration settings (`/api/settings/theme`, `/api/settings/platform-fee` for dynamic platform commission percentage with admin authorization and audit logging).
  * `/api/integrations/*`: Discord bot communication, organizer verification code generation.

### Business Logic Modules (`server/`)
* **District ID System ([`districtId.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/districtId.js))**: Generates deterministic, collisions-resistant District IDs (e.g., `MD-XXXXXX`) across participants, tournaments, and teams.
* **Tournament Planning & Roadmaps ([`tournamentPlanner.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/tournamentPlanner.js), [`manualRoadmapService.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/manualRoadmapService.js))**: Manages multi-round tournament stages, district sizing, team advancement math, and manual drag-and-drop draft states.
* **Slot Allocation ([`allocationService.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/allocationService.js))**: Handles atomic slot assignment, waitlisting, and room credential dispatch.
* **Subscription & Feature Gating ([`subscriptionMiddleware.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/subscriptionMiddleware.js))**: Enforces organizer plan tiers (`free`, `basic`, `pro`), slot maximums, custom branding access, and export privileges.

---

## 5. Database Architecture (Supabase PostgreSQL)
* **Pool Configuration**: Managed via `createDatabasePool()` in [`server/db.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/db.js) with SSL compatibility.
* **Schema Evolution**: Handled programmatically via `runSchemaMigrations()` in [`server/schemaMigrations.js`](file:///E:/Projects/Project-MatchDistrict/matchdistrict-website/server/schemaMigrations.js). Runs on server boot to ensure all tables, indexes, and columns exist without data loss.
* **Key Relational Tables**:
  * `users` & `profiles`: Core player identity, email, username, District ID, avatar.
  * `user_discord_connections` & `auth_identities`: Discord and OAuth linked account metadata.
  * `organizer_profiles`, `organizer_plans`, `subscriptions`: Organizer tiers and subscription states.
  * `site_settings`: Global system configuration (`platform_fee_percentage`, `theme`, etc.) stored persistently in PostgreSQL.
  * `tournaments`: Tournament core metadata, game title, format, dates, slot caps, status, and immutable snapshot `platform_fee_percentage` to preserve historical transaction integrity.
  * `payment_submissions`: Payment proofs, UTR numbers, amounts, approval states, and per-submission `platform_fee_percentage` & `platform_fee_amount`.
  * `wallet_transactions`: Credit/debit ledgers with snapshot `platform_fee_percentage` and `platform_fee_amount`.
  * `registrations`: Team entries, player rosters, status (`pending`, `approved`, `waitlisted`).
  * `tournament_districts` & `tournament_rounds`: Hierarchical stages, district allocations, and schedules.
  * `tournament_leaderboard` & `tournament_district_scores`: Match scores, kill counts, placement points.
  * `payment_verifications` & `billing_history`: Manual UTR submission records, transaction logs, approvals.
  * `organiser_linking_codes`: Temporary codes to link Discord servers with website organizer profiles.

---

## 6. External Integrations
* **Discord Bot**:
  * Verified communication via `MATCHDISTRICT_BOT_SECRET`.
  * Sync URL: `DISCORD_BOT_SYNC_URL`.
  * Bot queries website for registration validation and organizer links.
* **Resend**: Transactional emails for OTP login, email verification, and password reset.
* **ImageKit**: Media CDN for user avatars, tournament banners, and match screenshots.
* **Google OAuth & Discord OAuth**: Identity providers for single sign-on.

---

## 7. Environment Variables (Reference Names Only)
* `DATABASE_URL`: Supabase PostgreSQL connection string with SSL parameters.
* `SUPABASE_URL` & `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: Supabase project access.
* `JWT_SECRET`: Secret key used for signing authentication session tokens.
* `TOTP_ENCRYPTION_KEY`: Encryption key for securing admin 2FA secret seeds.
* `RESEND_API_KEY` & `RESEND_FROM_EMAIL`: Transactional email credentials.
* `IMAGEKIT_PRIVATE_KEY` & `IMAGEKIT_URL_ENDPOINT`: Media CDN credentials.
* `MATCHDISTRICT_BOT_SECRET` & `DISCORD_BOT_SYNC_URL`: Bot sync authentication.
* `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`: Google SSO.
* `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`: Discord SSO.
* `PORT`: Server listen port (default: 5000 / 3000).

---

## 8. Verification & Test Suite
Run tests with `node --test`:
* `server/freeTournamentFlow.test.js`: Verifies end-to-end free tournament creation and registration.
* `server/freeRegistrationEndToEnd.test.js`: Validates team enrollment, waitlist behavior, and slot capacity.
* `server/districtId.test.js`: Tests uniqueness, formatting, and migration of District IDs.
* `server/verificationFlow.test.js`: Tests OTP generation, rate limits, and verification.
* `server/profileSync.test.js`: Validates synchronization between auth records and profile records.

