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

The profile table contains the Auth user ID, names, nickname, phone, gender, and timestamps. RLS policies permit authenticated users to select/update only their own profile. The signup trigger is `SECURITY DEFINER`, uses an empty `search_path`, and creates the profile. The schema explicitly grants authenticated profile read/update access; it does not grant anonymous table access.

The Supabase project and `profiles` table have been created. `.env.local` now contains the project URL and publishable key and is ignored by Git. Vite was restarted to load the configuration. A read-only query to `public.profiles` reached Supabase and returned PostgreSQL `42501` because it was unauthenticated; this is expected with anonymous table access revoked and does not yet verify an authenticated profile read.

## Supabase Setup Still Needed

- `.env.local` is configured locally with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; keep it ignored and never print or commit its contents.
- Supabase Auth email signup confirmation must be enabled. Since the app asks for a code, the Confirm signup email template must include `{{ .Token }}`.
- Add the local development URL `http://127.0.0.1:5173` to the allowed redirect URLs/site settings.
- Enable the Google provider and configure its OAuth credentials/redirects before Google sign-in can work.
- Run a real signup and verify that the email arrives, OTP succeeds, the trigger inserts the profile, and RLS permits reading that row.

Never commit `.env.local` or use a `service_role` key in the browser. The client uses only the publishable key; access control depends on Auth and RLS.

## Google Flow Visual Generation

Google Flow was used as a visual-asset generator, not as the UI code generator. The user first supplied a cinematic Niko Kadi sign-in concept: a warm Kenyan card room, elevated view of a dark hardwood table, vintage cards, haze/window light, and a centered dark glass modal with brass and carved wood.

The image-generation workflow was to upload the reference image, describe the same composition/style, and request pieces separately: room/table background, modal/frame, logo and suit icons, verify-email button surface, disabled/enabled Create Account button surfaces, and email-verification status icons. The generated assets were downloaded into `images/`; the 2026-10-09 files include the account-creation concept and hardwood room/table background.

The account-creation UI concept is a visual reference, not a flattened page. Most downloaded controls are JPG concept/contact-sheet assets rather than clean transparent UI sprites, so they are not placed over live inputs or buttons. The app imports the generated hardwood scene as the registration background and renders accessible fields, verification controls, and tactile brass states with HTML/CSS. This keeps the controls editable and functional instead of baking text/buttons into an image.

## Current Integration Boundaries

- Email OTP and password Auth calls are implemented and the client can reach the configured Supabase project. A real signup, OTP delivery/confirmation, trigger-created profile read, and password sign-in still need to be tested.
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

Latest pushed commit recorded before this connection-status documentation update: `ed3f116` (`Wire Supabase auth and document setup`). Registration, Supabase client, package, schema, and visual assets are on GitHub. Do not push `.env.local` or other credentials.

The user wants each completed milestone documented and pushed to GitHub. Before each push, preserve user changes, run the relevant validation commands, update this handoff, and report the commit and any live-service blockers. Do not commit local credentials.
