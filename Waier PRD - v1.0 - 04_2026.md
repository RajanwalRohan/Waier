# Product Requirements Document

# Waier
## AI Health & Fitness Intelligence Platform

| | |
|---|---|
| **Author** | Rohan Rajanwal |
| **Version** | 1.0 \| MVP |
| **Date** | April 2026 |
| **Status** | Draft |
| **Classification** | Public |

---

## Contents

1. Executive Summary
2. Problem Statement
   - 2.1 Consumer Pain Points
   - 2.2 Industry Gaps
3. Vision & Strategy
   - 3.1 Product Vision
   - 3.2 Long-Term Hardware Vision
   - 3.3 Go-to-Market Strategy
4. Goals & Success Metrics
   - 4.1 Primary Goals
   - 4.2 Key Performance Indicators
5. Target Users
   - 5.1 Primary: Active Fitness Enthusiasts
   - 5.2 Secondary: Health-Conscious Beginners
   - 5.3 Tertiary: Medical-Aware Users
6. Product Scope
   - 6.1 What Ships in MVP
   - 6.2 Out of Scope for MVP
7. Core Features
   - 7.1 Account Creation & Authentication
   - 7.2 Onboarding & Goal Setting
   - 7.3 Dynamic Health Dashboard
   - 7.4 AI Health Coach (Wynn)
   - 7.5 Workout Logging & Live Tracking
   - 7.6 Nutrition Logging
   - 7.7 Health Metrics & Wearable Sync
   - 7.8 Progress & Percentile Rankings
   - 7.9 Presets & Templates
   - 7.10 Profile & Settings
8. AI Architecture
   - 8.1 Design Principles
   - 8.2 Model Routing Strategy
   - 8.3 Context Engineering
   - 8.4 Cost Control
9. Data Model
10. Security & Privacy Requirements
11. System Architecture
12. Launch Plan & Phasing
    - Phase 1: MVP Launch (Months 1-4)
    - Phase 2: Wearable Integration & Growth (Months 5-8)
    - Phase 3: Social & Engagement (Months 9-12)
    - Phase 4: Hardware & Platform (Months 13+)
13. Risks & Mitigations
14. Open Questions
15. Competitive Landscape
16. Appendix
    - 16.1 Wearable API Coverage
    - 16.2 Health Metric Types
    - 16.3 Metric Grading Ranges
    - 16.4 Revision History

---

## 1. Executive Summary

Waier is an AI-powered health and fitness intelligence platform that unifies data from wearables, manual workout logs, and nutrition tracking into a single personalized health profile. An AI coach named Wynn interprets the data, provides actionable recommendations, generates custom workout and diet plans, and delivers insights that go beyond what any single fitness app or wearable offers today.

The MVP is a mobile-first Progressive Web App (PWA) with a liquid glass UI design language. It connects to existing smartwatches and fitness bands through Open Wearables (a self-hosted data pipeline), and provides built-in workout logging, meal tracking, and an AI conversational coach.

**Core thesis:** Wearables collect data well but give shallow insights. Waier is the intelligence layer that makes health data actually useful. The AI coach does not replace professional medical advice, but it does what no current consumer product does well: correlate sleep, heart rate, nutrition, training load, and recovery into personalized, daily-actionable guidance.

**Long-term vision:** Waier becomes the standard AI health operating system. Phase 1 is the app. Future phases include a proprietary wearable device optimized for the Waier data pipeline, creating a vertically integrated hardware + software + AI product.

---

## 2. Problem Statement

The health and fitness technology market is fragmented. Users own wearables that track dozens of metrics, use separate apps for workout logging and calorie counting, and get generic advice that ignores their personal context. The result is data overload with insight scarcity.

### 2.1 Consumer Pain Points

**Fragmented Health Data**
A typical fitness-focused person uses 3-5 separate apps: one for their smartwatch, one for calories, one for workouts, one for sleep. None of these apps talk to each other in a meaningful way. Users manually cross-reference data or simply ignore most of it.

**Generic, Shallow Insights**
Wearables tell you your heart rate was 72 bpm or you slept 6.5 hours. They do not tell you why your recovery dropped 18% after high-carb dinners, or that your HRV trend suggests overtraining. The insight layer is primitive across the entire industry.

**No Personalized Coaching at Scale**
A personal trainer costs $50-150/hour. A nutritionist costs $100-300/session. Most people cannot afford both. Current AI fitness apps either generate one-size-fits-all plans or require expensive subscriptions for marginally better advice.

**Privacy Concerns**
Health data is among the most sensitive personal information. Many fitness apps share data with third-party advertisers, use it for targeted marketing, or store it insecurely. Users who understand this have no good alternative that is both feature-rich and privacy-respecting.

### 2.2 Industry Gaps

**No Unified Health Intelligence Platform**
Apple Health aggregates data but provides minimal analysis. Google Fit does the same. Whoop focuses on recovery. MyFitnessPal focuses on calories. No product combines wearable data, workout tracking, nutrition, AND AI coaching into a single coherent experience.

**Wearable Data is Underutilized**
Most users see less than 20% of what their wearable actually collects. HRV, respiratory rate, skin temperature, blood oxygen, and stress metrics go largely uninterpreted. The hardware is ahead of the software.

**Percentile Context is Missing**
Users have no idea how their metrics compare to others their age. "Is 45ms HRV good?" requires medical knowledge most people do not have. Anonymized benchmarking against age-group peers would make every metric immediately meaningful.

---

## 3. Vision & Strategy

### 3.1 Product Vision

Waier becomes the AI health operating system for your body. It ingests data from any wearable, interprets it through AI, and delivers coaching that feels like having a personal trainer, nutritionist, and health analyst in your pocket.

**Target state:**

```
Wearable Data + Manual Logs + User Profile → Waier AI Engine → Personalized Coaching
```

**End-state:** Waier is to health what Spotify is to music: it knows you, learns your patterns, gives you exactly what you need, and makes the experience shareable through annual Health Wrapped summaries.

### 3.2 Long-Term Hardware Vision

The app is Phase 1. Once the AI platform proves valuable, Waier will develop a proprietary wearable device optimized for the Waier data pipeline. This follows the proven path of software-first, hardware-second used by companies like Peloton (content first, bike second) and Whoop (analytics first, band refined over time).

The hardware advantage:
- Custom sensors optimized for Waier's AI models
- Tighter data pipeline with lower latency
- Vertically integrated experience that competitors cannot replicate
- Hardware + AI + software defensibility moat

### 3.3 Go-to-Market Strategy

Waier uses a bottom-up, community-driven approach:

1. **Build individual value first.** The MVP saves time and provides better insights immediately through the AI coach and unified dashboard. No network effects needed for day-one value.

2. **Target fitness communities.** Reddit (r/fitness, r/bodybuilding, r/loseit), fitness YouTube, Instagram fitness creators, and gym-culture social platforms. Focus on users who already track workouts and own wearables.

3. **Grow through shareability.** Health Wrapped, percentile rankings, and progress summaries are designed to be shared on social media (Instagram Stories, Snapchat, TikTok). Every share is organic marketing.

4. **Monetization through premium AI features.** Free tier includes basic tracking and limited AI interactions. Premium unlocks unlimited coaching, advanced analytics, custom plans, and Health Wrapped.

5. **Hardware expansion.** Once the user base reaches scale, launch a Waier wearable that provides the best possible experience within the ecosystem.

---

## 4. Goals & Success Metrics

### 4.1 Primary Goals

- Deliver an AI health coach that provides genuinely useful, personalized insights, not generic tips
- Unify wearable, workout, and nutrition data into a single coherent health profile
- Make health data meaningful through percentile rankings and goal-based grading
- Maintain the highest standard of data privacy and security for health information
- Build a mobile-first experience with premium design quality (liquid glass UI)

### 4.2 Key Performance Indicators

| Category | Metric | MVP Target (6 Months) |
|---|---|---|
| Adoption | Registered users | 5,000 |
| Adoption | Completed profiles (all onboarding steps) | 2,500 |
| Adoption | Wearable connections | 1,000 |
| Engagement | AI coach conversations per user per week | 3+ |
| Engagement | Workouts logged per active user per month | 8+ |
| Engagement | Meals logged per active user per month | 20+ |
| Retention | Weekly active users (WAU) | 35% of registered |
| Retention | 30-day retention rate | 40% |
| AI Quality | Coach response satisfaction (thumbs up/down) | 80%+ positive |
| Health | Users with 5+ metric types tracked | 40% of active |
| Shareability | Health Wrapped generated (annual) | 50% of active users |

---

## 5. Target Users

### 5.1 Primary: Active Fitness Enthusiasts

People who work out 3-6 days per week and already own a smartwatch or fitness tracker. They actively track workouts, care about progressive overload, and want to optimize performance. Age range: 18-35.

| Characteristic | Why It Matters |
|---|---|
| Owns a smartwatch or fitness band | Immediate data source for the AI engine |
| Tracks workouts manually or wants to | Core engagement loop |
| Interested in data-driven improvement | Receptive to AI insights and percentile rankings |
| Active on fitness social media | Organic growth through sharing |
| Spends on fitness (gym, supplements, gear) | Willingness to pay for premium features |

### 5.2 Secondary: Health-Conscious Beginners

People starting their fitness journey who need guidance but cannot afford a personal trainer. They benefit most from the AI coach's ability to generate plans, explain metrics, and provide encouragement. Age range: 16-45.

### 5.3 Tertiary: Medical-Aware Users

Users with specific health conditions (diabetes, hypertension, thyroid disorders) who want to monitor health metrics and share trends with their healthcare providers. They benefit from the medical history profile, metric grading system, and data export capabilities. This user segment becomes primary in later phases when medical record integration is explored.

---

## 6. Product Scope

### 6.1 What Ships in MVP

| Component | Description |
|---|---|
| Mobile-First PWA | Next.js web app optimized for mobile with liquid glass UI, installable as PWA |
| 3-Step Onboarding | Account creation, health profile, goal setting with computed recommendations |
| Dynamic Dashboard | Personalized metric cards, quick actions, recent workouts, AI insight card |
| AI Coach (Wynn) | Conversational health coaching with context from profile, metrics, and goals |
| Workout Logger | Full exercise logging with sets, reps, weight; live workout mode with rest timer |
| Meal Logger | Calorie and macro tracking with manual entry |
| Health Metrics | Manual entry + display of 18+ metric types with medical-grade grading |
| Progress Analytics | Time-filtered metrics with carousel view, averages, and goal-based color grading |
| Percentile Rankings | Age-group comparison across 11 metric types |
| Presets System | Reusable workout splits and meal templates for one-tap logging |
| Profile & Settings | Editable health profile, goals, medical history, unit system, connected devices |
| Social Auth | Google Sign-In, Apple Sign-In alongside email/password |
| Security Foundation | bcrypt passwords, JWT sessions, rate limiting, CSRF protection, input validation |

### 6.2 Out of Scope for MVP

- Native iOS / Android apps (PWA serves mobile initially)
- Real-time wearable streaming (batch sync only)
- Photo-based meal recognition (AI food image analysis)
- Health Wrapped annual summary
- Social features (friends, challenges, leaderboards)
- Medical record integration (HL7 FHIR)
- MyFitnessPal / CalAI sync
- Proprietary wearable hardware
- Voice-to-workout logging (beyond basic Web Speech API)
- Offline mode with local-first data sync
- Push notifications
- App Store / Play Store distribution

---

## 7. Core Features

### 7.1 Account Creation & Authentication

Users sign up with email and password, Google OAuth, or Apple Sign-In. The signup flow collects essential health data in three progressive steps to build the user's health model immediately.

**Authentication:**
- Passwords encrypted with bcrypt (cost factor 12)
- JWT strategy with 30-day session duration
- Google OAuth with automatic email account linking
- Apple Sign-In for iOS users
- OAuth users get an auto-created health profile with defaults on first sign-in

**Password Requirements:**
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 2 numbers
- At least 1 special character
- Real-time password strength checklist during signup

**Security:**
- Rate-limited login attempts (auth tier)
- CSRF protection via X-Requested-With header validation
- PrismaAdapter for OAuth account management
- Remember Me checkbox (default on)

### 7.2 Onboarding & Goal Setting

The signup process is designed to build a comprehensive health model in under 3 minutes through three steps:

**Step 1: Account Basics**
- Full name
- Date of birth (with age verification: 13+ required)
- Email
- Password with real-time checklist
- OR: Sign up with Google / Apple (skips to dashboard, profile filled later)

**Step 2: Health Profile**
- Unit system toggle (Imperial / Metric)
- Sex
- Height (custom wheel picker)
- Weight
- Activity level (Sedentary through Extremely Active)
- Fitness goal (optional)
- Medical conditions (multi-select from 15 common conditions + custom entry)
- Food allergies (triggered when "Food Allergies" selected, with 9 common allergens + custom)
- Medical notes (free text)

**Step 3: Goals & Preferences**
- Fitness goals multi-select (8 options: Lose Weight, Gain Muscle, Clean Bulk, Clean Cut, Build Strength, Mobility, Improve Endurance, General Health)
- Diet type (8 options: Omnivore through Whole30)
- Exercise preferences multi-select (15 activity types)
- Exercise days per week
- Daily steps goal
- Sleep goal (hours)
- Goal weight
- Computed recommendation card showing:
  - Recommended daily calories (Mifflin-St Jeor BMR * activity multiplier, adjusted for goals)
  - Recommended workouts per week
  - Expected muscle gain or fat loss rate based on selected goals

All Step 3 fields are editable after signup in Profile > Goals & Preferences.

### 7.3 Dynamic Health Dashboard

The home screen adapts to whatever data exists for the user. It is not hard-coded to specific metrics.

**Components:**
- Greeting with time-of-day awareness (Good morning/afternoon/evening)
- User's name from profile
- Wynn's Insight card (AI-generated contextual tip based on recent data)
- Quick action buttons (Workout, Meal, Coach, Metrics)
- Dynamic health metric grid (up to 8 cards):
  - Shows the latest reading of each metric type the user has logged
  - Prioritized by a defined order (steps > heart rate > sleep > HRV > blood oxygen > ...)
  - Falls back to empty-state placeholders if no wearable data exists
  - Always includes a "Calories" card showing today's meal total
- Recent workouts list (last 3)

**Metric card display:**
- Each metric type has a dedicated icon, label, and color scheme
- Supports 18 metric types with automatic formatting per type
- Units display as human-readable text ("percentage" not "%")

### 7.4 AI Health Coach (Wynn)

Wynn is the conversational AI coach that serves as the primary differentiator. It has full context of the user's health profile, goals, metrics, workout history, and nutrition data.

**Capabilities:**
- Explain health metrics in plain language ("Why was my sleep score low?")
- Generate personalized workout plans based on goals, preferences, and history
- Provide nutrition recommendations respecting dietary restrictions and allergies
- Analyze trends and correlations ("Your recovery drops after late-night high-carb meals")
- Motivate and encourage with awareness of the user's progress
- Answer health and fitness questions with profile-aware context

**Technical Implementation:**
- Streaming responses via Vercel AI SDK
- Conversation persistence in database (AIConversation + AIMessage models)
- Conversation history sidebar for returning to past chats
- System prompt includes: profile data, recent metrics, recent workouts, medical conditions, goals
- Voice input via Web Speech API (hands-free logging during workouts)
- Microphone button with visual feedback during recording

**Safety:**
- Wynn explicitly does not provide medical diagnoses
- Responses include appropriate disclaimers when discussing medical conditions
- Medical conditions from the profile inform coaching but do not trigger clinical advice

### 7.5 Workout Logging & Live Tracking

**Standard Logging:**
- Create a workout with name, date, and notes
- Add exercises with sets, reps, weight (kg or lbs), duration, and notes
- Exercises are ordered and reorderable
- Full CRUD on workouts and exercises via REST API

**Live Workout Mode:**
- Start from a workout preset (e.g., "Chest Day")
- Pre-populated exercises from the preset template
- Built-in rest timer between sets (configurable default: 30s-15min)
- Log actual reps and weight per set in real-time
- Calendar view for selecting workout date
- Save completed workout to history

**Progressive Overload Tracking:**
- Weight and rep history per exercise over time
- AI coach can analyze volume trends and suggest progressions

### 7.6 Nutrition Logging

**Meal Logging:**
- Log meals with name, description, calories, protein, carbs, fat, fiber
- Categorize by meal type (Breakfast, Lunch, Dinner, Snack)
- Optional image attachment via file upload
- Date-stamped entries

**Meal Presets:**
- Save frequently eaten meals as one-tap templates
- Full CRUD on meal presets
- Apply preset to quickly log a meal without re-entering macros

**Integration Plans (Post-MVP):**
- MyFitnessPal sync for automatic calorie import
- CalAI-style photo meal recognition
- Barcode scanning for packaged foods

### 7.7 Health Metrics & Wearable Sync

**Manual Metric Entry:**
- Log any health metric type with value, unit, source, and date
- Extensible type system: any lowercase snake_case string accepted
- Known types get proper labels; unknown types auto-format

**Supported Metric Types (18+):**

| Metric | Unit | Source |
|---|---|---|
| Steps | steps | Wearable / Manual |
| Heart Rate | bpm | Wearable |
| Resting Heart Rate | bpm | Wearable |
| Sleep Hours | hours | Wearable / Manual |
| Calories Burned | kcal | Wearable |
| Active Calories | kcal | Wearable |
| Blood Oxygen (SpO2) | percentage | Wearable |
| Respiratory Rate | brpm | Wearable |
| Heart Rate Variability (HRV) | ms | Wearable |
| Weight | kg / lbs | Manual |
| Skin Temperature | celsius / fahrenheit | Wearable |
| Blood Pressure (Systolic) | mmHg | Manual |
| Blood Pressure (Diastolic) | mmHg | Manual |
| Blood Glucose | mg/dL | Manual |
| VO2 Max | mL/kg/min | Wearable |
| Body Fat Percentage | percentage | Manual / Wearable |
| Distance | km / mi | Wearable |
| Floors Climbed | floors | Wearable |
| Stress Level | score | Wearable |
| Body Battery | score | Wearable (Garmin) |

**Wearable Integration (via Open Wearables):**

```
User Devices                          Waier App
Apple Watch → HealthKit ─┐
Huawei Band → Health Connect ─┤
Garmin / Whoop / Samsung ─┤       POST /api/wearables/ingest
                          ├──→ Open Wearables ──webhook──→ Verify HMAC → Validate → Store
                          │    (self-hosted Docker)
Oura / Polar / Suunto ───┘
```

- Open Wearables runs as a self-hosted Docker container on internal network
- Normalizes data from all wearable providers into a unified schema
- Sends HMAC-signed webhooks to Waier's ingest endpoint
- Waier verifies signature, validates payload, deduplicates, and stores metrics
- IP allowlist restricts webhook access to internal Docker network
- All ingestion events are audit-logged (counts only, no PII)

**Wearable Connection Management:**
- Connect/disconnect devices from Profile settings
- View connection status, last sync time, device name
- Revoke tokens on disconnect (set to "REVOKED", never deleted)
- Token rotation tracking for security monitoring

### 7.8 Progress & Percentile Rankings

**Progress View:**
- Time range filter (Today, 7/30/60/90 days, All Time)
- Summary card showing workout count and meals logged in range
- Metric carousel with fade transitions:
  - 3 metrics per page in a unified card
  - Color-coded accent bar per metric based on grading system
  - Shows latest value, reading count, and average
  - Swipe or tap dots to navigate pages
  - Touch swipe detection (50px threshold)

**4-Tier Metric Grading System:**

| Grade | Color | Meaning |
|---|---|---|
| Excellent | Green (emerald-500) | Optimal range per medical standards or personal goals |
| Good | Blue (blue-500) | Within healthy range |
| OK | Amber (amber-500) | Below optimal but not concerning |
| Poor | Red (red-500) | Outside healthy range, attention needed |

Grading is based on two sources:

1. **Medical recommendations** for metrics with universal health standards (heart rate, blood oxygen, HRV, respiratory rate, blood glucose, skin temperature)
2. **Personal goals** for metrics that depend on the user's targets (calories, steps, sleep, weight). For example:
   - Bulking: 95-115% of calorie goal = Excellent
   - Cutting: 85-105% of calorie goal = Excellent
   - Steps: 100%+ of daily goal = Excellent

**Percentile Rankings:**
- Compare user's metrics against anonymized age-group peers
- Supported for 11 metric types: steps, heart rate, sleep, calories burned, blood oxygen, HRV, respiratory rate, weight, VO2 max, stress level, body battery
- Weight conversion for imperial users
- Percentile displayed with visual indicator and descriptive label

### 7.9 Presets & Templates

**Workout Presets:**
- Create named workout templates (e.g., "Chest Day", "Leg Day")
- Add exercises with default sets, reps, weight
- Assign recurring days of the week
- Start a live workout from any preset

**Meal Presets:**
- Save meal templates with full macro information
- One-tap logging from saved meals
- Friendly UI copy ("Your saved meals" not "Your meal presets")

### 7.10 Profile & Settings

**Settings Card:**
- Dark mode toggle
- Unit system (Imperial / Metric) with automatic value conversion
- Default rest timer duration (10s-15min)
- Link to Presets page

**Connected Devices Card:**
- List of connected wearables with status indicator
- Provider name, device name, last sync time
- Disconnect button per device
- Data management: Delete Synced Data / Delete All Health Data
- Confirmation modal for destructive actions

**Profile Info Card:**
- Name, email (read-only), date of birth, sex
- Height, weight, fitness goal, activity level
- Save triggers JWT refresh for dashboard name update

**Goals & Preferences Card:**
- Fitness goals (multi-select pills)
- Diet type (dropdown)
- Exercise preferences (multi-select pills)
- Exercise days per week, daily steps goal, sleep goal
- Goal weight (with unit conversion), daily calorie target
- Independent save from profile info

**Medical History Card:**
- Medical conditions (multi-select + custom entry)
- Food allergies (expanded panel when "Food Allergies" selected)
- Medical notes (free text)
- Independent save from other sections

**Account:**
- Sign Out button

---

## 8. AI Architecture

### 8.1 Design Principles

The AI system is designed around one core principle: **the LLM is the interpreter and coach, not the calculator.**

All quantitative work (metric scoring, percentile calculations, trend detection, calorie math, progressive overload tracking) is handled by standard backend logic. The LLM is called only for natural language tasks: explanations, coaching, plan generation, question answering, and summaries.

This keeps costs manageable and responses fast.

### 8.2 Model Routing Strategy

| Tier | Model | Use Cases |
|---|---|---|
| No LLM | Backend logic | Metric scoring, percentile calculation, workout volume, trend detection, grading, calorie math, baseline detection |
| Tier 1 (Cheap) | GPT-4o-mini or equivalent | Structured extraction, message classification, simple summaries, tagging |
| Tier 2 (Default) | GPT-4o or Claude Sonnet | User-facing coach chat, workout plans, nutrition recommendations, metric explanations |
| Tier 3 (Premium) | GPT-4 / Claude Opus | Complex multi-metric correlation analysis, Health Wrapped narrative generation (rare) |

### 8.3 Context Engineering

Every AI coach request includes a compact context payload built from the user's structured profile, NOT full conversation history:

```
User Context:
- Age: 24, Sex: Male, Activity: Very Active
- Goals: Clean Bulk, Build Strength
- Diet: Omnivore, Calorie Target: 3,100 kcal
- Medical: None
- Recent metrics: HR avg 62, HRV 48ms, Sleep 7.2h, Steps 11k
- Recent workouts: Push (Mon), Pull (Wed), Legs (Fri)
- Today's calories: 2,400 / 3,100
```

This keeps input tokens small while giving the AI full personalization context.

### 8.4 Cost Control

- **Compact context:** Send structured profile + recent metrics, not full history
- **Short outputs:** Instruct the model to give concise, actionable responses
- **Batch offline jobs:** Weekly summaries and monthly reports run on schedules
- **Cache repeated patterns:** Use cached system prompts where supported
- **Rate limit AI calls:** Prevent abuse through tiered rate limits

---

## 9. Data Model

The backend stores all data using Prisma ORM with the following entity relationships. The schema is built for extensibility, supporting future metric types and wearable providers without code changes.

| Entity | Key Fields | Relationships |
|---|---|---|
| User | id, email, passwordHash, name, image, emailVerified | Has one Profile; has many Workouts, Meals, HealthMetrics, WearableConnections, AIConversations, Presets |
| Account | id, userId, type, provider, providerAccountId, tokens | Belongs to User (NextAuth OAuth) |
| Profile | id, userId, age, heightCm, weightKg, sex, activityLevel, fitnessGoal, unitSystem, medicalConditions, foodAllergies, fitnessGoals, dietType, exercisePreferences, dailyStepsGoal, sleepGoalHours, goalWeightKg, calorieGoal | Belongs to User |
| Workout | id, userId, name, notes, durationMin, date | Belongs to User; has many Exercises |
| Exercise | id, workoutId, name, sets, reps, weightKg, durationSec, order | Belongs to Workout |
| Meal | id, userId, name, calories, proteinG, carbsG, fatG, fiberG, mealType, date | Belongs to User |
| HealthMetric | id, userId, type, value, unit, source, date | Belongs to User |
| WearableConnection | id, userId, provider, accessToken (encrypted), refreshToken, externalUserId, providerDevice, isActive, lastSyncAt | Belongs to User |
| AIConversation | id, userId, title | Belongs to User; has many AIMessages |
| AIMessage | id, conversationId, role, content | Belongs to AIConversation |
| WorkoutPreset | id, userId, name, recurringDays | Belongs to User; has many PresetExercises |
| MealPreset | id, userId, name, calories, proteinG, carbsG, fatG, fiberG, mealType | Belongs to User |
| AuditLog | id, userId, action, detail (no PII), ip | Indexed by userId + createdAt |
| DataDeletionRequest | id, userId, scope, status, requestedAt, completedAt | Belongs to User |

**Key design decisions:**
- JSON arrays stored as strings in SQLite (medicalConditions, fitnessGoals, exercisePreferences)
- Metric types are extensible strings, not enums, so new wearable data flows through without schema changes
- OAuth tokens encrypted at the application layer, not stored in plaintext
- Audit logs never contain PII or actual health values, only action types and counts

---

## 10. Security & Privacy Requirements

Health data security is the number one non-negotiable requirement for Waier. Users trust us with their most sensitive personal information. Zero tolerance for leaks, unauthorized access, or data exploitation.

| Category | Requirement | Implementation |
|---|---|---|
| Transport | HTTPS everywhere | TLS enforced on all connections |
| Password Storage | bcrypt with cost factor 12 | No plaintext passwords; minimum 12 characters with complexity rules |
| Authentication | JWT sessions, OAuth 2.0 | 30-day JWT tokens; Google + Apple OAuth; PrismaAdapter for account management |
| Authorization | Object-level ownership checks | Every API route verifies userId from session; Prisma middleware rejects bulk queries without userId filter |
| Data Isolation | Defense-in-depth userId enforcement | Prisma `$use` middleware throws if HealthMetric, WearableConnection, Workout, or Meal queries lack userId in where clause |
| Input Validation | Zod schemas on all endpoints | Strict schemas reject unexpected fields; numeric ranges enforced; string lengths capped |
| Rate Limiting | Sliding window per endpoint tier | Auth: 10/min, Mutation: 30/min, General: 60/min, AI Chat: 20/min, Webhook: 30/min |
| CSRF Protection | X-Requested-With header check | All mutation endpoints require `X-Requested-With: XMLHttpRequest` header |
| Webhook Security | HMAC-SHA256 signature verification | Constant-time comparison; shared secret between Open Wearables and Waier |
| Network Isolation | Internal-only wearable pipeline | Open Wearables container not exposed to internet; communicates only via Docker internal network |
| PII Protection | Structured logger with redaction | email, name, ip, resetUrl fields automatically redacted in all log output |
| Token Security | Encrypted OAuth tokens at rest | Tokens encrypted before database storage; set to "REVOKED" on disconnect, never deleted for audit trail |
| Password Reset | Hash-only storage | Reset tokens stored as SHA-256 hashes; plaintext sent to user email only; 1-hour expiry |
| Data Deletion | GDPR-style deletion requests | Users can delete wearable data or all health data; creates audit trail; deactivates connections |
| Audit Logging | Append-only security log | All wearable syncs, data deletions, connection changes, and webhook rejections logged with timestamps |

**Privacy Principles:**
1. All health data stays on our infrastructure. No third-party analytics touches it.
2. Users can export or delete all their data at any time.
3. Anonymized benchmarking uses aggregated statistics only. No individual user data is ever exposed to other users.
4. Percentile rankings are computed from population statistics, not by querying other users' data.
5. The AI coach context includes health data but it is never stored or used for model training.

---

## 11. System Architecture

Waier is built as a Next.js 14 full-stack application with server-side rendering, API routes, and a self-hosted wearable data pipeline.

| Component | Technology | Responsibility |
|---|---|---|
| Web Application | Next.js 14 (App Router), React 18, Tailwind CSS | Mobile-first PWA with liquid glass UI, SSR pages, client components |
| API Layer | Next.js API Routes | Authentication, CRUD operations, AI chat orchestration, webhook receiver |
| Database | SQLite (dev) / PostgreSQL (production) | Stores all user data, metrics, conversations, presets, audit logs |
| ORM | Prisma 5 | Type-safe database access with data isolation middleware |
| Authentication | NextAuth v4 | JWT strategy, credentials + Google + Apple providers, PrismaAdapter |
| AI Engine | Vercel AI SDK + OpenAI API | Streaming AI responses with structured context injection |
| Wearable Pipeline | Open Wearables (Docker) | Self-hosted data normalizer for all wearable providers |
| Styling | Tailwind CSS 3.4 + custom design tokens | Liquid glass UI with backdrop-blur, custom shadows, accent colors |
| Validation | Zod | Runtime type checking on all API inputs and environment variables |
| Testing | Vitest | Unit and integration tests for validations, crypto, rate limiting, API utils |
| Security | Custom middleware stack | Rate limiting, CSRF, input sanitization, PII redaction, webhook HMAC |

**Deployment Architecture (Production):**

```
                    ┌────────────────────────┐
                    │   Vercel / VPS          │
                    │   Next.js App           │
    Internet ──────►│   (Port 3000)           │
                    │                         │
                    │   /api/wearables/ingest │◄───webhook───┐
                    └────────────┬───────────┘              │
                                 │                          │
                                 ▼                          │
                    ┌────────────────────────┐   ┌─────────┴──────────┐
                    │   PostgreSQL            │   │   Open Wearables   │
                    │   (Managed DB)          │   │   (Docker, internal│
                    └────────────────────────┘   │    network only)   │
                                                 └────────────────────┘
```

---

## 12. Launch Plan & Phasing

### Phase 1: MVP Launch (Months 1-4)

Core product delivery focused entirely on individual user value. This is the current build phase.

**Completed:**
- 3-step onboarding with goal setting and computed recommendations
- Dynamic health dashboard with 18 metric types
- AI coach (Wynn) with streaming responses, conversation persistence, and voice input
- Full workout logger with live workout mode and rest timer
- Meal logger with macro tracking
- Health metric tracking with manual entry
- Progress analytics with carousel view and metric grading
- Percentile rankings for 11 metric types
- Workout and meal presets system
- Profile management with goals, medical history, and connected devices
- Email/password auth with Google and Apple OAuth
- Security foundation (rate limiting, CSRF, validation, PII redaction, audit logging)
- Wearable ingest endpoint with HMAC verification
- Data deletion with GDPR-style request tracking
- Docker Compose configuration for Open Wearables

**Remaining for MVP ship:**
- Deploy to production (Vercel + managed PostgreSQL)
- Configure real OAuth credentials (Google, Apple)
- Set up Open Wearables on VPS for wearable connectivity
- End-to-end testing of full user journey
- PWA manifest and service worker for installability
- Loading states and error boundaries across all pages
- Empty state illustrations for first-time users
- Onboarding success screen after signup
- Email verification flow
- Terms of Service and Privacy Policy pages

### Phase 2: Wearable Integration & Growth (Months 5-8)

Expand wearable support, improve AI quality, and add engagement features.

- Direct Apple HealthKit integration (for users who install as PWA on iOS)
- Google Health Connect integration for Android wearables
- Fitbit and Garmin direct API connections
- Photo-based meal recognition (CalAI or custom vision model)
- MyFitnessPal nutrition sync
- Job-tailored AI workout plans (periodized programs)
- Weekly and monthly AI summary reports
- Push notifications for coaching nudges
- Improved onboarding with 7-day baseline calibration period
- Referral program
- Performance optimization and caching

### Phase 3: Social & Engagement (Months 9-12)

Build shareable, sticky features that drive organic growth.

- Health Wrapped (annual shareable summary like Spotify Wrapped)
- Shareable progress cards for social media (Instagram Stories, Snapchat)
- Streak tracking and achievement badges
- Friends and accountability partners
- Challenge system (step challenges, workout streaks)
- Advanced analytics dashboard (trend graphs, correlation insights)
- Native mobile app (React Native or Flutter)
- SOC 2 Type I certification process

### Phase 4: Hardware & Platform (Months 13+)

Build the proprietary hardware and expand into platform territory.

- Waier wearable device design and prototyping
- Custom sensors optimized for Waier AI models
- Real-time data streaming (not batch sync)
- Medical record integration exploration (HL7 FHIR)
- Healthcare provider dashboard (share trends with doctors)
- API for third-party integrations
- Recruiter/employer wellness program partnerships
- Open health data specification

---

## 13. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Wearable API access:** Major wearable companies may restrict or change API access without warning | High | Use Open Wearables as an abstraction layer. Support multiple providers so no single vendor is a dependency. Monitor API changelogs and maintain fallback data entry. |
| **AI cost scaling:** As user base grows, AI API costs could become unsustainable | High | Route 80% of logic through non-LLM backend code. Use tiered model routing (cheap models for simple tasks). Implement strict rate limits. Cache common responses. Batch offline jobs. |
| **Health data privacy breach:** A security incident with health data would be catastrophic for trust | Critical | Defense-in-depth architecture. Prisma middleware for data isolation. Encrypted tokens. Audit logging. No PII in logs. Regular security audits. GDPR-style deletion. |
| **AI hallucination in health context:** Incorrect health advice could be harmful or create liability | High | AI never provides medical diagnoses. Clear disclaimers in responses. Medical conditions inform coaching but don't trigger clinical advice. Human review of system prompts. Feedback mechanism for users to flag bad advice. |
| **User adoption:** The fitness app market is crowded | Medium | Focus on the AI coaching differentiator. Target power users who already track data. Make sharing frictionless for organic growth. Build in communities where target users already exist. |
| **Wearable data accuracy:** Consumer wearables have variable accuracy for some metrics | Medium | Display data as-is from the wearable with source attribution. Use trends over time rather than individual readings for coaching. Clearly label metric sources. |
| **Regulatory risk:** Health-adjacent products face increasing regulatory scrutiny | Medium | Position as wellness/fitness, not medical. No diagnostic claims. Clear Terms of Service. Consult health-tech legal counsel before medical record integration. |

---

## 14. Open Questions

These decisions should be resolved before or during Phase 2 development:

1. **Monetization model:** Freemium with limited AI interactions? Monthly subscription? What price point? What features gate the paywall?

2. **Native app timing:** When does the PWA stop being sufficient? At what user count or feature requirement should React Native / Flutter development begin?

3. **Wearable priority:** Which wearable integrations should come first beyond Open Wearables? Direct Apple HealthKit vs. Fitbit API vs. Garmin API?

4. **AI model provider:** OpenAI vs. Anthropic vs. Google for the primary coaching model? Cost, quality, and latency trade-offs need benchmarking.

5. **Data residency:** Do we need regional data storage for EU/UK/Canadian users? This shapes cloud infrastructure decisions significantly.

6. **Hardware timeline:** When should hardware R&D begin? What form factor (watch, band, clip, ring)? What sensors are highest priority?

7. **Medical disclaimer:** What legal framework is needed for health coaching? Do we need a medical advisory board? At what point does the product need FDA or equivalent clearance?

8. **Social features scope:** How deep should social features go? Leaderboards create competition but also anxiety. What's the right balance for a health product?

---

## 15. Competitive Landscape

Waier sits at the intersection of wearable analytics, AI coaching, and fitness tracking. No current product combines all three with a privacy-first approach.

| Product | What It Does | How Waier Is Different |
|---|---|---|
| **Apple Health** | Aggregates data from Apple devices and third-party apps | Data warehouse with minimal analysis. No AI coaching. No workout logging. No nutrition. Apple-only ecosystem. |
| **Whoop** | Recovery and strain tracking with subscription model | Proprietary hardware required ($30/month). No workout logging. No nutrition. No AI conversational coach. Limited to Whoop's metrics. |
| **Oura Ring** | Sleep and readiness tracking via smart ring | Sleep-focused. No workout logging. No nutrition. No AI coaching. Requires Oura hardware ($299+). |
| **MyFitnessPal** | Calorie and macro tracking | Nutrition-only. No wearable integration. No AI coaching. No workout logging beyond basic cardio. Ad-heavy free tier. |
| **Fitbod** | AI workout generation | Workout-only. No nutrition. No wearable metrics beyond basic. No holistic health coaching. |
| **Strong** | Workout logging app | Pure logging tool. No AI. No nutrition. No wearable integration. No health insights. |
| **Google Fit** | Health data aggregation for Android | Similar to Apple Health. Minimal analysis. No AI. No coaching. Android-only focus. |
| **Noom** | Behavioral weight loss coaching | Weight loss focused. Psychology-based, not data-driven. No wearable depth. No workout programming. Expensive ($60/month). |
| **ChatGPT / AI chatbots** | General-purpose AI that can discuss fitness | No persistent health profile. No wearable data. No metric tracking. No progress history. Generic advice every session. |

**Waier's unique position:** The only product that combines wearable data ingestion + structured workout logging + nutrition tracking + AI coaching with persistent health context + privacy-first architecture + percentile rankings + goal-based grading + shareable progress, all in a single platform.

---

## 16. Appendix

### 16.1 Wearable API Coverage

| Provider | Data Available | Integration Method |
|---|---|---|
| Apple Watch | HR, HRV, SpO2, sleep, steps, calories, respiratory rate, workouts | Apple HealthKit (via PWA or native app) |
| Garmin | HR, HRV, SpO2, sleep, steps, stress, body battery, respiration, temperature | Garmin Connect API / Open Wearables |
| Fitbit | HR, HRV, SpO2, sleep, steps, calories, breathing rate, temperature | Fitbit Web API / Open Wearables |
| Samsung Galaxy Watch | HR, SpO2, sleep, steps, stress, body composition | Samsung Health / Google Health Connect |
| Huawei Band/Watch | HR, SpO2, sleep, steps, stress | Google Health Connect / Open Wearables |
| Whoop | HR, HRV, sleep, strain, recovery, respiratory rate | Whoop API / Open Wearables |
| Oura Ring | HR, HRV, sleep, temperature, SpO2, activity | Oura API / Open Wearables |
| Polar | HR, HRV, sleep, training load | Polar AccessLink API / Open Wearables |

### 16.2 Health Metric Types

Full list of supported metric types with their standard units and grading availability:

| Type Key | Display Label | Unit | Grading |
|---|---|---|---|
| steps | Steps | steps | Goal-based |
| heart_rate | Heart Rate | bpm | Medical |
| resting_heart_rate | Resting Heart Rate | bpm | Medical |
| sleep_hours | Sleep | hours | Goal-based |
| calories_burned | Calories Burned | kcal | None |
| active_calories | Active Calories | kcal | None |
| calories_logged | Calories Logged | kcal | Goal-based |
| blood_oxygen | Blood Oxygen | percentage | Medical |
| respiratory_rate | Respiratory Rate | brpm | Medical |
| hrv | Heart Rate Variability | ms | Medical |
| weight | Weight | kg / lbs | Goal-based |
| skin_temperature | Skin Temperature | celsius | Medical |
| blood_pressure_systolic | Blood Pressure (Systolic) | mmHg | Medical |
| blood_pressure_diastolic | Blood Pressure (Diastolic) | mmHg | Medical |
| blood_glucose | Blood Glucose | mg/dL | Medical |
| vo2_max | VO2 Max | mL/kg/min | Medical |
| body_fat_percentage | Body Fat | percentage | None |
| distance | Distance | km / mi | None |
| floors_climbed | Floors Climbed | floors | None |
| stress_level | Stress Level | score | Medical |
| body_battery | Body Battery | score | Medical |

### 16.3 Metric Grading Ranges (Medical-Based)

| Metric | Excellent | Good | OK | Poor |
|---|---|---|---|---|
| Heart Rate | < 60 bpm | 60-72 bpm | 73-84 bpm | > 84 bpm |
| Blood Oxygen | >= 98% | 95-97% | 92-94% | < 92% |
| HRV | > 50 ms | 30-50 ms | 20-29 ms | < 20 ms |
| Respiratory Rate | 12-16 brpm | 10-11 or 17-18 brpm | 8-9 or 19-20 brpm | < 8 or > 20 brpm |
| Blood Glucose (fasting) | 70-99 mg/dL | 100-110 mg/dL | 111-125 mg/dL | > 125 mg/dL |
| Skin Temperature | 36.1-37.2 C | 35.5-36.0 or 37.3-37.5 C | 35.0-35.4 or 37.6-38.0 C | < 35.0 or > 38.0 C |

### 16.4 Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | April 2026 | Rohan Rajanwal | Initial PRD. MVP scope with feature specs, data model, security requirements, AI architecture, system architecture, go-to-market strategy, competitive analysis, and phased launch plan. |

---

*Copyright 2026 Rohan Rajanwal. All rights reserved.*
