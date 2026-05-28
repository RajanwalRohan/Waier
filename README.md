# Waier

**AI health and fitness intelligence platform.** Waier unifies data from wearables, manual workout logs, and nutrition tracking into a single personalized health profile, then layers an AI coach on top that interprets the data and delivers daily-actionable guidance.

The core thesis: wearables collect data well but give shallow insights. Waier is the intelligence layer that makes health data actually useful.

> Mobile-first Progressive Web App with a liquid glass UI design language.

This public repository is a sanitized portfolio snapshot. The product requirements document, private planning notes, environment files, and build artifacts are intentionally omitted. The code and this README convey the architecture, feature set, and security posture without exposing confidential planning material.

---

## Highlights

- **AI Health Coach (Wynn)** - conversational coaching with full context of the user's profile, goals, metrics, and history. Streaming responses, persistent conversation history, and hands-free voice input via the Web Speech API.
- **Unified health dashboard** - a dynamic grid that adapts to whatever data the user has logged, supporting 18+ metric types with per-type formatting and medical-grade grading.
- **Workout logging and live tracking** - full exercise logging with a live workout mode, rest timer, and preset-driven templates for one-tap starts.
- **Nutrition tracking** - calorie and macro logging with reusable meal presets.
- **Wearable sync** - a self-hosted data pipeline (Open Wearables) normalizes data from Apple Watch, Garmin, Fitbit, Whoop, Oura, and more, then delivers it through HMAC-signed webhooks.
- **Percentile rankings** - compares the user's metrics against anonymized age-group peers across 11 metric types.
- **Goal-based metric grading** - a four-tier system (Excellent / Good / OK / Poor) driven by medical standards or personal goals.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5.5 |
| Styling | Tailwind CSS 3.4 with a custom liquid glass design system |
| Database | SQLite (dev) / PostgreSQL (production) via Prisma 5 |
| Auth | NextAuth v4 (credentials + Google + Apple OAuth), JWT sessions |
| AI | Vercel AI SDK with streaming, structured context injection |
| Validation | Zod schemas on every API route and environment variable |
| Testing | Vitest (unit and integration) |
| Wearables | Open Wearables, self-hosted via Docker |

## Architecture

Waier is built around one principle: **the LLM is the interpreter and coach, not the calculator.** All quantitative work (metric scoring, percentile calculations, trend detection, calorie math) runs in standard backend logic. The LLM is reserved for natural-language tasks: explanations, coaching, plan generation, and summaries. This keeps responses fast and costs predictable.

```
Wearable Data + Manual Logs + User Profile  ->  Waier AI Engine  ->  Personalized Coaching
```

## Security and Privacy

Health data security is the number one non-negotiable requirement. The implementation includes:

- bcrypt password hashing (cost factor 12) with a 12-character minimum and complexity rules
- Object-level ownership checks on every API route, plus Prisma middleware that rejects any query lacking a `userId` filter
- Zod input validation that rejects unexpected fields and enforces numeric ranges
- Sliding-window rate limiting tiered per endpoint
- CSRF protection via `X-Requested-With` header validation
- HMAC-SHA256 webhook verification with constant-time comparison for the wearable pipeline
- OAuth tokens encrypted at rest
- A structured logger that redacts PII (email, name, IP) from all output
- GDPR-style data deletion with an audit trail

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# then fill in NEXTAUTH_SECRET, ENCRYPTION_KEY, and an AI provider key

# Create the database schema
npm run db:push

# (Optional) Seed with synthetic population data
npm run db:seed

# Run the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### Testing

```bash
npm test
```

## Project Structure

```
src/
  app/            Next.js App Router pages and API routes
  components/     Liquid glass UI components
  lib/            Validation schemas, auth, AI, crypto, rate limiting
prisma/           Database schema and seed scripts
```

## Roadmap

The current build is the MVP (Phase 1). Future phases expand wearable integrations, AI-generated training plans, social features, and richer progress insights. Detailed product specifications are maintained in a private planning document and are not part of this public snapshot.

## Author

Built by **Rohan Rajanwal**.

Copyright 2026 Rohan Rajanwal. All rights reserved.
