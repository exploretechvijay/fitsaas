# Product Requirements Document
## FitSaaS — Member Mobile Application (Updated)
**Version:** 1.1
**Date:** March 2026
**Document Type:** Product Requirements Document (PRD)
**Platform:** Mobile Application (iOS & Android)
**Backend:** Shared with FitSaaS Web Portal (Node.js + Express + Supabase)

---

## 1. Product Overview

### 1.1 Vision
The FitSaaS Member App is an AI-powered personal fitness companion for gym members. It delivers personalized workout plans, Gemini AI-powered diet charts, goal tracking, and a virtual personal trainer chatbot — all as part of their gym membership.

### 1.2 Key Difference from Original PRD
This updated PRD aligns with the **existing FitSaaS backend** that powers the web admin portal. The mobile app will:
- Share the same Supabase database and Express API server
- Add new mobile-specific endpoints under `/api/v1/mobile/`
- Reuse existing services (auth, members, workouts, diet, subscriptions)
- Add new tables only for mobile-specific features (workout logs, water tracking, streaks)

### 1.3 Target Users
Gym members (18–55 years) enrolled in any gym running on the FitSaaS platform.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo) |
| Navigation | React Navigation v6 |
| State Management | Zustand |
| Styling | NativeWind (Tailwind for React Native) |
| HTTP Client | Axios |
| AI Integration | Google Gemini API (shared with web) |
| Auth | JWT (shared auth system) |
| Storage | Supabase (shared database) |
| Local Storage | AsyncStorage |
| Push Notifications | Expo Notifications + FCM |
| Charts | Victory Native |

---

## 3. Architecture — Shared Backend

### 3.1 How It Connects to Existing System

```
┌──────────────────────────────────────────────┐
│              Supabase (PostgreSQL)            │
│  Shared Database: members, subscriptions,    │
│  workouts, diet_plans, body_metrics, etc.    │
│  + New Tables: workout_logs, water_logs,     │
│    member_streaks, member_badges, push_tokens │
└──────────────────────┬───────────────────────┘
                       │
            ┌──────────┴──────────┐
            │  Express API Server  │
            │  (Single Backend)    │
            ├──────────────────────┤
            │ /api/v1/auth/*       │ ← Shared (login, refresh, me)
            │ /api/v1/members/*    │ ← Shared (admin manages)
            │ /api/v1/mobile/*     │ ← NEW (member-facing APIs)
            │ /api/v1/subscriptions│ ← Shared
            │ /api/v1/workout-plans│ ← Shared (admin creates)
            │ /api/v1/diet-plans/* │ ← Shared (admin creates)
            └──────┬─────────┬────┘
                   │         │
            ┌──────┴──┐  ┌───┴──────┐
            │ Web App  │  │Mobile App│
            │(Admin)   │  │(Member)  │
            │React+Vite│  │React     │
            │          │  │Native    │
            └──────────┘  └──────────┘
```

### 3.2 Authentication Flow
- Member logs in using **email + password** (same `users` table, role = `member`)
- OR uses existing `members` table credentials (new: member login support)
- JWT tokens work identically to web app
- After login, app fetches `gym_id` → loads gym branding (colors, logo)

### 3.3 Existing Data the Mobile App Can Access
| Data | Source Table | Already Exists? |
|---|---|---|
| Member profile | `members` | ✅ Yes |
| Subscription status | `member_subscriptions` + `subscription_plans` | ✅ Yes |
| Assigned workout plan | `member_workout_assignments` + `workout_plans` + `workout_days` + `workout_exercises` | ✅ Yes |
| Diet plan (AI/manual) | `diet_plans` (week_data JSONB) | ✅ Yes |
| Body metrics | `body_metrics` | ✅ Yes |
| Announcements | `announcements` | ✅ Yes |
| AI chat | `ai_chat_sessions` | ✅ Yes (table exists, needs service) |
| Gym branding | `tenants.branding` | ✅ Yes |

### 3.4 New Tables Needed for Mobile

```sql
-- Workout completion logs
CREATE TABLE member_workout_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  plan_id UUID REFERENCES workout_plans(plan_id),
  day_number INT,
  date DATE NOT NULL,
  exercises_done JSONB DEFAULT '[]',
  duration_minutes INT,
  calories_est INT,
  feeling_score INT CHECK (feeling_score BETWEEN 1 AND 4),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual set tracking
CREATE TABLE member_set_logs (
  set_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID NOT NULL REFERENCES member_workout_logs(log_id) ON DELETE CASCADE,
  exercise_name VARCHAR(200) NOT NULL,
  set_number INT NOT NULL,
  reps_done INT,
  weight_kg DECIMAL(5,1),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water intake tracking
CREATE TABLE water_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);

-- Streak tracking
CREATE TABLE member_streaks (
  streak_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_workout_date DATE,
  UNIQUE(member_id)
);

-- Achievement badges
CREATE TABLE member_badges (
  badge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tokens
CREATE TABLE push_tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform VARCHAR(10) CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member login credentials (extend users table)
-- Members will be added to the `users` table with role='member'
-- when gym admin creates them, a user record is auto-created
```

---

## 4. Mobile API Specification

### 4.1 Existing APIs the Mobile App Will Reuse

| Endpoint | Method | Used For |
|---|---|---|
| `/api/v1/auth/login` | POST | Member login |
| `/api/v1/auth/refresh` | POST | Token refresh |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/auth/change-password` | POST | Change password |
| `/api/v1/auth/forgot-password` | POST | Password reset |

### 4.2 New Mobile-Specific APIs (`/api/v1/mobile/`)

All mobile routes require `authenticate` middleware + `role = 'member'`

#### Profile & Onboarding
```
GET    /mobile/profile              → Get member profile + gym branding
PATCH  /mobile/profile              → Update profile (height, weight, goal, dietary_pref, photo)
POST   /mobile/profile/onboarding   → Complete first-time setup wizard
GET    /mobile/gym/branding         → Get gym branding (colors, logo, name)
```

#### Workout
```
GET    /mobile/workout/today        → Get today's workout (from assigned plan + day of week)
GET    /mobile/workout/week         → Get full week plan with all exercises
GET    /mobile/workout/plan/:planId → Get specific plan details
POST   /mobile/workout/log          → Log completed workout
GET    /mobile/workout/history      → Get workout history (calendar heatmap data)
GET    /mobile/workout/history/:date → Get specific day's workout log
POST   /mobile/workout/set-log     → Log individual set (weight, reps)
GET    /mobile/workout/prs          → Get personal records per exercise
```

#### Diet
```
GET    /mobile/diet/plan            → Get current diet plan (latest)
POST   /mobile/diet/regenerate      → AI regenerate diet plan (Gemini)
GET    /mobile/diet/plan/:dietId    → Get specific diet plan
```

#### AI Virtual Trainer
```
POST   /mobile/ai/chat              → Send message to AI trainer (Gemini)
GET    /mobile/ai/chat/history      → Get chat sessions
GET    /mobile/ai/chat/:sessionId   → Get specific session messages
GET    /mobile/ai/tip               → Get daily AI tip/motivation
```

#### Body Metrics & Goals
```
GET    /mobile/metrics              → Get body metrics history
POST   /mobile/metrics              → Log new metric (weight, body_fat, measurements)
GET    /mobile/streak               → Get current & longest streak
GET    /mobile/badges               → Get earned badges
GET    /mobile/progress             → Get goal progress summary
```

#### Water Tracking
```
GET    /mobile/water/today          → Get today's water intake
POST   /mobile/water/log            → Add water intake (glasses)
```

#### Subscription & Notifications
```
GET    /mobile/subscription         → Get active subscription + status
GET    /mobile/subscription/history → Get subscription history
GET    /mobile/announcements        → Get gym announcements
GET    /mobile/notifications        → Get notification history
POST   /mobile/push-token           → Register device push token
```

### 4.3 API Response Formats

#### Profile Response
```json
{
  "member": {
    "member_id": "uuid",
    "full_name": "Rahul Sharma",
    "email": "rahul@gmail.com",
    "phone": "9876543210",
    "dob": "1998-05-15",
    "gender": "male",
    "height": 175,
    "weight": 72,
    "goal": "muscle_gain",
    "dietary_pref": "non_veg",
    "photo_url": null,
    "created_at": "2026-01-15T..."
  },
  "gym": {
    "name": "Vijay's Gym",
    "logo_url": null,
    "branding": {
      "primary_color": "#6366F1",
      "secondary_color": "#8B5CF6"
    }
  },
  "subscription": {
    "plan_name": "Quarterly",
    "status": "active",
    "start_date": "2026-01-15",
    "end_date": "2026-04-15",
    "days_remaining": 20
  },
  "streak": {
    "current": 7,
    "longest": 14
  }
}
```

#### Today's Workout Response
```json
{
  "day_number": 1,
  "day_name": "Monday",
  "plan_name": "Beginner Full Body",
  "plan_type": "weight_training",
  "difficulty": "beginner",
  "is_rest_day": false,
  "estimated_duration_min": 45,
  "exercises": [
    {
      "exercise_id": "uuid",
      "name": "Bench Press",
      "sets": 4,
      "reps": "8-12",
      "rest_seconds": 60,
      "notes": "Focus on form",
      "order_index": 1
    }
  ],
  "previous_log": null
}
```

#### AI Chat Request/Response
```json
// Request
{
  "message": "What should I eat before workout?",
  "session_id": "uuid_or_null"
}

// Response
{
  "reply": "Based on your goal of muscle gain, I recommend eating...",
  "session_id": "uuid",
  "messages_remaining": 18
}
```

---

## 5. Module Specifications (Updated)

### 5.1 Onboarding & Authentication

#### Login
- Email + Password (same auth system as web)
- Member role created when gym admin adds member (auto-create `users` record with role='member')
- Biometric login after first successful login
- Forgot Password → email OTP reset

#### First-Time Setup Wizard (6 steps)
Uses `PATCH /mobile/profile/onboarding` to save all at once:
1. Welcome: Greeting with member name + gym name
2. Body Stats: Height, Weight, Age (updates `members` table)
3. Fitness Goal: Select from existing enum (weight_loss, muscle_gain, endurance, flexibility, general_fitness)
4. Workout Preferences: Training type + days/week + duration
5. Diet Preference: Select from existing enum (veg, non_veg, vegan, eggetarian)
6. AI generates first workout + diet plan → celebration screen

### 5.2 Home Screen Dashboard
- **Greeting** + gym logo (from `tenants.branding`)
- **Streak badge** (from `member_streaks`)
- **Today's workout card** (from assigned `workout_plans` + day mapping)
- **Quick stats**: Workouts this week, current streak, subscription days left
- **Diet summary**: Today's meals from `diet_plans.week_data`
- **AI daily tip** (from Gemini, cached per day)
- **Announcements** (from `announcements` where target = 'all' or member-specific)

### 5.3 Workout Module
- **Weekly plan view**: From `member_workout_assignments` → `workout_plans` → `workout_days` → `workout_exercises`
- **Active workout**: Exercise-by-exercise flow with set tracking
- **Workout logging**: Saves to `member_workout_logs` + `member_set_logs`
- **Completion**: Updates `member_streaks`, checks for `member_badges`
- **History**: Calendar heatmap from `member_workout_logs`

### 5.4 Diet Plan Module
- **Weekly chart**: From `diet_plans.week_data` (same JSONB structure used by web)
- **AI regenerate**: Calls existing `dietService.generateDietPlan()` + saves via `dietService.saveDietPlan()`
- **Water tracker**: New `water_logs` table
- **Daily totals**: Calculated from `week_data.days[].daily_totals`

### 5.5 Virtual AI Trainer (Chat)
- Uses existing `ai_chat_sessions` table
- Gemini API (same key as web, gym-level or platform-level)
- Context injection with member profile data
- 20 messages/day limit (configurable per gym SaaS plan)
- Quick prompt chips for common questions

### 5.6 Goal & Progress Tracking
- **Body metrics**: Uses existing `body_metrics` table + existing API
- **Weight chart**: Victory Native line chart from metrics data
- **Workout history**: From new `member_workout_logs`
- **Streak system**: New `member_streaks` table
- **Badges**: New `member_badges` table (7, 14, 30, 60, 90 day streaks)

### 5.7 Profile & Subscription
- **Profile**: From `members` table (existing)
- **Subscription**: From `member_subscriptions` + `subscription_plans` (existing)
- **Gym info**: From `tenants` table (existing)
- **Trainer info**: From `trainer_member_assignments` → `users` (existing)

---

## 6. Member Account Creation Flow

### Current Gap
Currently, when a gym admin adds a member, only a `members` table record is created. The member has no login credentials. For mobile app, we need:

### Solution
When gym admin creates a member:
1. Insert into `members` table (existing)
2. **NEW**: Auto-create `users` record with `role='member'`, `gym_id`, temp password
3. Send welcome email/SMS with app download link + credentials

### Implementation
Add to existing `memberService.createMember()`:
```javascript
// After creating member, also create user account for mobile login
const tempPassword = generateTempPassword();
const passwordHash = await bcrypt.hash(tempPassword, 12);
await supabaseAdmin.from('users').insert({
  user_id: uuidv4(),
  gym_id: gymId,
  email: data.email,
  password_hash: passwordHash,
  role: 'member',
  full_name: data.full_name,
  phone: data.phone,
  is_active: true,
});
// Return tempPassword in response for gym to share with member
```

---

## 7. Notifications

| Notification | Trigger | Implementation |
|---|---|---|
| Daily Workout Reminder | Cron job at configured time | Push via FCM |
| Water Reminder | Every 2 hours (9 AM – 9 PM) | Local notification (Expo) |
| Streak at Risk | 8 PM if no workout logged today | Cron job + push |
| Subscription Expiry | 7, 3, 1 days before | Cron job (exists in web, extend to push) |
| New Plan Assigned | When gym assigns workout/diet | Trigger in existing assign endpoints |
| Gym Announcement | When gym admin creates | Trigger in existing announcement endpoint |
| Weekly Summary | Sunday evening | Cron job |
| Badge Earned | On streak milestone | Trigger in workout log endpoint |

---

## 8. App Navigation Structure

```
(Tab Bar - 5 tabs)
├── 🏠 Home
├── 💪 Workout
│   ├── Today's Workout (active session)
│   ├── Weekly Plan
│   └── History (calendar heatmap)
├── 🥗 Diet
│   ├── Weekly Chart (day tabs + meal timeline)
│   ├── Water Tracker
│   └── AI Regenerate
├── 🤖 AI Trainer (Chat)
└── 👤 Profile
    ├── Goals & Progress
    ├── Body Metrics
    ├── Subscription Status
    ├── Announcements
    └── Settings
```

---

## 9. Development Priority for Mobile APIs

### Phase 1 — MVP (Build these first)
| Priority | API | Reuses Existing? |
|---|---|---|
| P0 | Member login (auth) | ✅ Yes |
| P0 | Get profile + gym branding | 🔄 New endpoint, existing data |
| P0 | Get today's workout | 🔄 New endpoint, existing data |
| P0 | Get weekly workout plan | 🔄 New endpoint, existing data |
| P0 | Log completed workout | 🆕 New (new table) |
| P0 | Get current diet plan | 🔄 New endpoint, existing data |
| P0 | Get subscription status | 🔄 New endpoint, existing data |
| P1 | AI chat (virtual trainer) | 🆕 New service, existing table |
| P1 | Log body metrics | ✅ Yes (existing API) |
| P1 | Get body metrics | ✅ Yes (existing API) |
| P1 | Get announcements | 🔄 New endpoint, existing data |
| P1 | Register push token | 🆕 New |

### Phase 2
| Priority | API |
|---|---|
| P2 | Water tracking |
| P2 | Streak management |
| P2 | Badge system |
| P2 | Workout history (heatmap) |
| P2 | AI diet regeneration |
| P2 | Daily AI tip |
| P2 | Set-level logging |
| P2 | Personal records |

### Phase 3
| Priority | API |
|---|---|
| P3 | Profile photo upload |
| P3 | Workout feel logging |
| P3 | Exercise library browse |
| P3 | Social sharing |

---

## 10. Database Changes Summary

| Table | Action | Reason |
|---|---|---|
| `users` | Modify member creation flow | Auto-create member login |
| `members` | No change | Existing |
| `workout_plans` | No change | Existing |
| `diet_plans` | No change | Existing |
| `body_metrics` | No change | Existing |
| `ai_chat_sessions` | No change | Existing (add chat service) |
| `announcements` | No change | Existing |
| `member_workout_logs` | **NEW** | Track completed workouts |
| `member_set_logs` | **NEW** | Track individual sets |
| `water_logs` | **NEW** | Water intake tracking |
| `member_streaks` | **NEW** | Streak tracking |
| `member_badges` | **NEW** | Achievement badges |
| `push_tokens` | **NEW** | FCM push tokens |

---

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | App launch < 2s, API response < 500ms |
| Offline | Today's workout + diet cached in AsyncStorage |
| Security | JWT in SecureStore, biometric gating |
| API | Same Express server, shared Supabase connection pool |
| App Size | < 30MB initial download |
| Backend | Zero changes to existing web admin APIs |

---

## 12. Phased Rollout

| Phase | Features | Timeline |
|---|---|---|
| Phase 1 (MVP) | Auth + onboarding, Home dashboard, Today's workout + logging, Weekly plan, Diet chart, AI trainer chat, Subscription status, Push notifications | Month 1–3 |
| Phase 2 | Body metrics charts, Workout history heatmap, Streak + badges, Water tracker, Exercise library, Diet AI regeneration | Month 3–5 |
| Phase 3 | Profile photo upload, Social sharing, Wearable sync, Regional languages | Month 5–7 |

---

## 13. Key Decisions

1. **Shared Backend**: Mobile app shares the same Express server and Supabase database. No separate backend needed.
2. **New Routes Only**: Mobile adds `/api/v1/mobile/*` routes. All existing admin APIs remain untouched.
3. **Member Auth**: Members get auto-created `users` records when gym admin adds them. Same JWT system.
4. **Diet Data Format**: Mobile reads the same `week_data` JSONB structure that the web admin creates/edits.
5. **Workout Data**: Mobile reads from existing `workout_plans` → `workout_days` → `workout_exercises` chain.
6. **AI Integration**: Mobile uses the same Gemini API key (gym-level or platform-level) already configured.
