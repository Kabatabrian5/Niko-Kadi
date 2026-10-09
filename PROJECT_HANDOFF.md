# Niko Kadi Project Handoff

Last updated: 2026-10-09

## Project Snapshot

Niko Kadi is a local-first Kenyan card game built with React 19, TypeScript, and Vite 6. The five-player game rules and engine are documented in `KADI_RULES.md` and implemented in `src/game/kadi.ts`.

Current application routes/screens are loading, sign-in, account creation, the main hub, and offline practice. Supabase Auth integration is implemented in the app, but has not yet been exercised against the live project because local project configuration is not present.

## Account and Supabase Design

The account-creation screen collects first name, second name, nickname, email, password, password confirmation, phone/country calling code, and gender. Passwords must be at least eight characters and match. Email verification gates the final Create Account action.

The current Supabase flow is:

1. Selecting Verify Email calls Supabase `auth.signUp` with the password and profile fields in Auth user metadata. Supabase creates a pending, unconfirmed Auth user and sends its signup confirmation email.
2. The six-digit email token is verified with `auth.verifyOtp({ type: 'signup' })`.
3. The SQL trigger in `supabase/schema.sql` creates the profile row from the signup metadata when the Auth user is inserted. The final Create Account action verifies the active session and reads the signed-in player's profile before entering the hub.
4. Sign-in uses `auth.signInWithPassword`. A valid Supabase session is restored on app startup. Google sign-in calls Supabase OAuth and requires Google provider configuration in Supabase.

The profile table contains the Auth user ID, names, nickname, phone, gender (`male` or `female`), and timestamps. RLS policies permit authenticated users to select/update only their own profile. The signup trigger is `SECURITY DEFINER`, uses an empty `search_path`, and creates the profile. The schema explicitly grants authenticated profile read/update access; it does not grant anonymous table access.

The Supabase project and `profiles` table have been created. Local `.env.local` contains the project URL and publishable key, is ignored by Git, and allows the local Vite app to initialize Supabase. A read-only query to `public.profiles` reached Supabase and returned PostgreSQL `42501` because it was unauthenticated; this is expected with anonymous table access revoked and does not yet verify an authenticated profile read. The current Vercel deployment contains the updated registration UI but does not have the Vite Supabase variables configured: a live nickname availability probe shows `Supabase is not configured`.

On 2026-10-09, the user confirmed that the Supabase Email sign-in provider and email confirmation are enabled. Signup delivery and code verification are not yet tested. The user cannot create a Google App Password for their account, so Gmail SMTP is unavailable for now.

## Supabase Setup Still Needed

- `.env.local` is configured locally with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; keep it ignored and never print or commit its contents.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel Project Settings → Environment Variables for Preview and Production, then redeploy. Local `.env.local` is intentionally ignored and does not configure the hosted deployment.
- The gender/nickname migration has been applied: a live `is_nickname_available` call returned a boolean successfully. Gender is limited to Male/Female, and the database enforces case-insensitive nickname uniqueness.
- Update the Supabase **Confirm signup** email template to include `{{ .Token }}`; the app verifies the six-digit signup code with `auth.verifyOtp({ type: 'signup' })`.
- Configure SMTP before sending signup emails to people outside the Supabase organization. The built-in Supabase sender is best-effort, currently limited to team addresses and a low hourly rate limit that can change.
- For the first test, use the same email address that belongs to the Supabase organization; do not expect built-in SMTP to deliver to arbitrary client addresses.
- Add the local development URL `http://127.0.0.1:5173` to the allowed redirect URLs/site settings.
- Enable the Google provider and configure its OAuth credentials/redirects before Google sign-in can work.
- Run a real signup and verify that the email arrives, OTP succeeds, the trigger inserts the profile, and RLS permits reading that row.

Never commit `.env.local` or use a `service_role` key in the browser. The client uses only the publishable key; access control depends on Auth and RLS.

### Email Delivery Without a Paid Domain

The free `*.vercel.app` hostname is not a domain the project controls for sender DNS verification, but a paid domain is not required for an early, low-volume test. Gmail SMTP can send as the account's own `@gmail.com` address to other recipients, subject to Google's account restrictions and sending limits.

For Gmail SMTP, enable Google 2-Step Verification and create an App Password. Configure Supabase Custom SMTP with host `smtp.gmail.com`, port `465` (SSL) or `587` (TLS), the full Gmail address as username and sender address, the App Password as the SMTP password, and `Niko Kadi` as sender name. Put the App Password only in Supabase SMTP settings, never in `.env.local`, source code, or Git. App Password availability can be restricted on managed Workspace or Advanced Protection accounts. The user cannot create an App Password for their current Google account, so this option is unavailable for now.

This is suitable for setup/testing or a small pilot, not dependable high-volume transactional delivery. For production scale, use a transactional email provider with a verified domain. Supabase's default sender is limited to organization members and low volume, so it cannot serve general public signup by itself.

## Google Flow Visual Generation

Google Flow was used as a visual-asset generator, not as the UI code generator. The user first supplied a cinematic Niko Kadi sign-in concept: a warm Kenyan card room, elevated view of a dark hardwood table, vintage cards, haze/window light, and a centered dark glass modal with brass and carved wood.

The image-generation workflow was to upload the reference image, describe the same composition/style, and request pieces separately: room/table background, modal/frame, logo and suit icons, verify-email button surface, disabled/enabled Create Account button surfaces, and email-verification status icons. The generated assets were downloaded into `images/`; the 2026-10-09 files include the account-creation concept and hardwood room/table background.

The account-creation UI concept is a visual reference, not a flattened page. Most downloaded controls are JPG concept/contact-sheet assets rather than clean transparent UI sprites, so they are not placed over live inputs or buttons. The app imports the generated hardwood scene as the registration background and renders accessible fields, verification controls, and tactile brass states with HTML/CSS. This keeps the controls editable and functional instead of baking text/buttons into an image.

## Current Integration Boundaries

- Local email OTP and password Auth calls are implemented, and the local browser constructs the configured Supabase client. The hosted Vercel deployment still lacks the two Vite variables. A real signup, SMTP delivery/OTP confirmation, trigger-created profile read, and password sign-in still need to be tested.
- Nickname availability is checked through a working boolean RPC; the database's lowercased/trimmed unique index is authoritative against simultaneous signups. The current UI gender values are `male` and `female`.
- No Google client credentials are stored in the repository.
- Password recovery is not yet connected to Supabase.
- No account/profile values are written to browser storage; Supabase Auth manages the session and the database stores the profile.
- Account/Auth integration and the initial visual handoff were pushed in commit `ed3f116`. Local Supabase credentials remain uncommitted.

## Validation Commands

Run from the project root:

```powershell
npm run lint
npm run test
npm run build
```

Last recorded code validation after the Auth integration: lint passed, all 11 game tests passed, and the Vite production build passed. Production dependency audit reported zero vulnerabilities. The unauthenticated profiles query returned the expected permission denial; real Auth/signup behavior remains unverified.

## GitHub and Working Agreement

Remote: `https://github.com/Kabatabrian5/Niko-Kadi.git`

Branch: `main`

Latest pushed commit before recording the Vercel environment-variable finding: `a8ea8d8` (`Document Supabase signup test preflight`). Registration, Supabase client, package, schema, and visual assets are on GitHub. Do not push `.env.local` or other credentials.

The user wants each completed milestone documented and pushed to GitHub. Before each push, preserve user changes, run the relevant validation commands, update this handoff, and report the commit and any live-service blockers. Do not commit local credentials.
