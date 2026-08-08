# Demo vertical built by ElevaForge — not a client project.

This repository contains a polished landing page demo for a fictional product called KOA Buds. It is designed as a portfolio piece to showcase an end-to-end static site with serverless lead capture, CMS-driven content, strong security defaults, and test coverage.

## What this project demonstrates

- Astro 7 static site rendering with React components for interactive UI.
- Sanity Studio CMS integration for managing content sections such as hero, gallery, testimonials, and FAQ.
- Serverless API routes for waitlist subscription, confirmation, and lead counting.
- Neon Postgres serverless database access via prepared statements.
- Resend email delivery for confirmation emails.
- Upstash Redis rate limiting for robust submission protection.
- Cloudflare Turnstile anti-bot verification.
- Strict TypeScript, ESLint, Prettier, Vitest unit tests, and Playwright E2E tests.
- Vercel deployment-ready configuration with production-friendly build scripts.

## Structure

- `src/pages/` – Astro public pages and API endpoint handlers.
- `src/lib/domain/` – Pure business logic for lead validation, token generation, and IP handling.
- `src/lib/adapters/` – External service integrations for Neon, Resend, Sanity, Turnstile, and Upstash.
- `src/components/` – UI components used on the landing page.
- `tests/unit/` – Unit tests for core logic.
- `tests/e2e/` – End-to-end tests covering waitlist form, bot protection, rate limiting, and confirmation flow.

## Key features

- Waitlist form with server-side validation and confirmation token workflow.
- Rate limiting by hashed IP via Upstash to prevent abuse.
- Confirmation email workflow using Resend.
- CMS-powered page sections in Sanity for rapid content updates without code changes.
- Clean, reusable Astro/React component design appropriate for a portfolio showcase.

## Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview the production build locally:
   ```bash
   npm run preview
   ```

## Testing

- Run unit tests:
  ```bash
  npm run test
  ```

- Run Playwright end-to-end tests:
  ```bash
  npm run test:e2e
  ```

## Notes for portfolio review

This demo is meant to show implementation quality, architecture, and product thinking rather than represent a real commercial client. It emphasizes a secure, maintainable, and testable landing page foundation for a future SaaS, hardware launch, or marketing campaign.

