# Security

How m.studio.lab protects accounts, bank details and client data, what has to be
set in the hosted services, and what changes before the app is offered to other
companies.

## In the app

**Access to data is enforced by the database**, not only by the UI. Every table
has row-level security (RLS); `tests/integration/rls.test.ts` checks the rules
against a real database (studio, invited client, outsider, password-only session).

- A client sees only the projects they were invited to (or started after being
  invited). Other clients' projects, budgets, invoices and files are invisible.
- Accounts nobody invited can sign up (invitations need sign-up), but they can't
  create projects, read the studio's billing details or see anything else.
- Money-related writes — the studio's bank details, quote lines, invoice status —
  are studio-only, and once two-factor authentication is on they need a session
  that entered the code (`private.second_factor_ok()`, AAL2). A leaked password
  alone can't change where clients send money.
- Prices of add-ons are copied from the service catalog on the server; a client
  can't set their own price. Invoices are created only by `create_invoice()`,
  which snapshots the lines and numbers them.

**Sign-in**

- Passwords are handled by Supabase Auth (hashed with bcrypt; never stored or
  seen by the app). Sessions are short-lived JWTs with refresh-token rotation.
- Two-factor authentication with an authenticator app (Settings → Security). With
  it on, every new session asks for the 6-digit code before anything loads.
- "Sign out on all devices" revokes every session.
- "Forgot your password?" emails a one-time link that opens "Set a new password"
  (the reply is the same whether or not the address has an account). Signed-in
  users change their password in Settings → Security.
- Invitation links carry a 256-bit random token; only its SHA-256 hash is stored,
  it works once, for the invited email address, and expires after 30 days.
- Joining from the list of invitations (by email address) stays off until
  sign-up confirms email addresses — otherwise someone could register a client's
  address first. Turn it on with `update app_settings set emails_verified = true`
  after enabling email confirmation (below).

**Files and links**

- Files live in a private storage bucket; the browser gets short-lived signed
  URLs only for projects the viewer belongs to.
- Link previews are fetched server-side with SSRF protection (no private or
  metadata addresses, checked again after DNS lookup and on every redirect).

**Browser**

- Security headers on every response: HSTS (HTTPS only), no framing
  (clickjacking), no MIME sniffing, strict referrers, camera/mic/location off.
- Bank account numbers are masked in Settings until shown and are kept out of
  browser autofill.

**Transport and storage**: HTTPS everywhere; Supabase encrypts the database and
files at rest (AES-256). The app runs in the EU (Vercel fra1, Supabase
Frankfurt).

## Settings in the hosted services

Supabase (Dashboard):

0. **Authentication → URL Configuration**: Site URL `https://mstudiolab.vercel.app` and
   Redirect URL `https://mstudiolab.vercel.app/**` — otherwise links in emails (password
   reset, invitations) point at localhost.
1. **Authentication → Multi-Factor**: authenticator app (TOTP) enabled (default).
2. **Authentication → Sign In / Providers → Email**: set a minimum password length
   of 10 and require letters and digits.
3. **When you have a domain**: Authentication → Emails → SMTP with your domain
   (e.g. Resend), then turn **Confirm email** on and set
   `app_settings.emails_verified = true`. Set the Site URL and Redirect URLs to
   your domain.
4. Pro plan adds daily backups, point-in-time recovery and leaked-password
   protection — worth it once real clients are in.

Accounts that own everything — turn on two-factor authentication for each:
**Supabase, Vercel, GitHub** and the email account behind them.

## Before offering the app to other companies

The app is built for one studio. Selling it to other studios means each company
gets its own isolated space:

1. **Organizations**: an `organizations` table; every project, service, invoice
   sequence and billing record belongs to one; RLS checks membership of the
   organization in addition to the project. Tests prove one company can never
   read another's data.
2. Per-organization billing details and invoice numbering; optional custom
   domain per company.
3. Two-factor authentication required for studio accounts; audit log of
   sensitive changes (bank details, invoices, members).
4. Legal: privacy policy, terms, a data processing agreement (GDPR), data export
   and account deletion.
5. An external penetration test before launch.
