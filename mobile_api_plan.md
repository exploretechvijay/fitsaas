# FitSaaS Mobile App — API Implementation Plan
## APIs to be built in the current Express backend

---

## Overview
All mobile APIs will be added under `/api/v1/mobile/` in the existing Express server.
They require `authenticate` middleware + `role = 'member'`.

---

## New Database Tables Required

Run this SQL in Supabase before building APIs:

```sql
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

CREATE TABLE member_set_logs (
  set_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID NOT NULL REFERENCES member_workout_logs(log_id) ON DELETE CASCADE,
  exercise_name VARCHAR(200) NOT NULL,
  set_number INT NOT NULL,
  reps_done INT,
  weight_kg DECIMAL(5,1),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE water_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);

CREATE TABLE member_streaks (
  streak_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_workout_date DATE,
  UNIQUE(member_id)
);

CREATE TABLE member_badges (
  badge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE push_tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform VARCHAR(10) CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_logs_member ON member_workout_logs(member_id, date);
CREATE INDEX idx_set_logs_log ON member_set_logs(log_id);
CREATE INDEX idx_water_logs_member ON water_logs(member_id, date);
CREATE INDEX idx_streaks_member ON member_streaks(member_id);
CREATE INDEX idx_badges_member ON member_badges(member_id);
CREATE INDEX idx_push_tokens_member ON push_tokens(member_id);
```

---

## Existing APIs Mobile App Will Reuse (No changes needed)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/auth/login` | POST | Member login |
| `/api/v1/auth/refresh` | POST | Refresh JWT token |
| `/api/v1/auth/me` | GET | Get current user info |
| `/api/v1/auth/change-password` | POST | Change password |
| `/api/v1/auth/forgot-password` | POST | Request password reset |
| `/api/v1/auth/reset-password` | POST | Reset with token |

---

## Backend Change: Auto-create member login

**File:** `server/src/services/member.service.js` → `createMember()`

When gym admin creates a member, auto-create a `users` record so the member can login to the mobile app:

```javascript
// After inserting into members table, also create user account
const tempPassword = `Fit@${Date.now().toString(36)}`;
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
// Return tempPassword in response
```

---

## New Mobile API Endpoints

### Files to Create
```
server/src/routes/v1/mobile.routes.js
server/src/controllers/mobile.controller.js
server/src/services/mobile.service.js
server/src/validators/mobile.validator.js
```

### Register in `server/src/routes/v1/index.js`:
```javascript
import mobileRoutes from './mobile.routes.js';
router.use('/mobile', mobileRoutes);
```

---

## Phase 1 — MVP APIs (16 endpoints)

### 1. Profile & Gym Info

#### `GET /mobile/profile`
Returns member profile + gym branding + active subscription + streak

**Reads from:** `members`, `tenants`, `member_subscriptions`, `subscription_plans`, `member_streaks`

```json
{
  "member": { "member_id", "full_name", "email", "phone", "dob", "gender", "height", "weight", "goal", "dietary_pref", "photo_url", "created_at" },
  "gym": { "name", "logo_url", "branding": { "primary_color", "secondary_color" } },
  "subscription": { "plan_name", "status", "start_date", "end_date", "days_remaining" },
  "streak": { "current": 7, "longest": 14 },
  "trainer": { "full_name", "phone", "specialization" }
}
```

#### `PATCH /mobile/profile`
Update member profile fields (height, weight, goal, dietary_pref, photo_url)

**Writes to:** `members`, also logs `body_metrics` if weight changed

#### `POST /mobile/profile/onboarding`
Complete first-time setup wizard. Saves all onboarding data at once.

**Body:**
```json
{
  "height": 175,
  "weight": 72,
  "goal": "muscle_gain",
  "dietary_pref": "non_veg",
  "workout_type": "weight_training",
  "days_per_week": 5,
  "workout_duration": 60
}
```
**Action:** Updates `members` table + triggers AI workout plan + diet plan generation

#### `GET /mobile/gym/branding`
Returns gym name, logo, colors for app theming

**Reads from:** `tenants`

---

### 2. Workout

#### `GET /mobile/workout/today`
Returns today's workout based on assigned plan + day of week

**Logic:**
1. Get member's latest `member_workout_assignments`
2. Map current day of week → `workout_days.day_number`
3. Get exercises for that day from `workout_exercises`
4. Check if already logged today from `member_workout_logs`

**Reads from:** `member_workout_assignments`, `workout_plans`, `workout_days`, `workout_exercises`, `member_workout_logs`

#### `GET /mobile/workout/week`
Returns full 7-day plan with exercises per day

**Reads from:** Same as above, all 7 days

#### `POST /mobile/workout/log`
Log a completed workout session

**Body:**
```json
{
  "plan_id": "uuid",
  "day_number": 1,
  "exercises_done": [
    { "name": "Bench Press", "sets_completed": 4, "reps": [12, 10, 8, 8], "weight_kg": [40, 45, 50, 50] }
  ],
  "duration_minutes": 45,
  "feeling_score": 3
}
```
**Writes to:** `member_workout_logs`, `member_set_logs`
**Side effects:** Update `member_streaks`, check for new `member_badges`

#### `GET /mobile/workout/history`
Returns workout history for calendar heatmap (last 90 days)

**Reads from:** `member_workout_logs`

**Response:**
```json
{
  "logs": [
    { "date": "2026-03-25", "completed": true, "duration_minutes": 45, "plan_name": "Beginner Full Body" },
    { "date": "2026-03-24", "completed": true, "duration_minutes": 50 }
  ],
  "summary": { "total_workouts": 23, "this_week": 4, "avg_duration": 42 }
}
```

---

### 3. Diet

#### `GET /mobile/diet/plan`
Returns latest diet plan for the member

**Reads from:** `diet_plans` (most recent by `created_at`)

**Response:** Full `week_data` JSONB with all 7 days, meals, calories, macros

#### `POST /mobile/diet/regenerate`
AI regenerates a new diet plan using Gemini

**Reuses:** Existing `dietService.generateDietPlan()` + `dietService.saveDietPlan()`

**Body:**
```json
{
  "goal": "muscle_gain",
  "dietary_pref": "non_veg"
}
```
Weight, height, age auto-fetched from member profile

---

### 4. AI Virtual Trainer

#### `POST /mobile/ai/chat`
Send message to AI trainer, get response

**Body:**
```json
{
  "message": "What should I eat before workout?",
  "session_id": "uuid_or_null"
}
```

**Logic:**
1. If `session_id` null → create new `ai_chat_sessions` record
2. Inject member context into Gemini system prompt
3. Send message to Gemini with conversation history
4. Append user message + AI reply to `messages` JSONB
5. Check daily message limit (from gym's SaaS plan)

**Response:**
```json
{
  "reply": "Based on your goal of muscle gain, I recommend...",
  "session_id": "uuid",
  "messages_remaining": 18
}
```

#### `GET /mobile/ai/chat/history`
Returns list of chat sessions (last 30 days)

**Reads from:** `ai_chat_sessions`

#### `GET /mobile/ai/tip`
Returns a daily motivational tip/fitness fact from Gemini (cached per day)

---

### 5. Body Metrics

#### `GET /mobile/metrics`
Get body metrics history (weight, BMI, body fat trend)

**Reuses:** Existing `memberService.getMemberMetrics()`

#### `POST /mobile/metrics`
Log new body metric

**Reuses:** Existing `memberService.addBodyMetric()`

---

### 6. Subscription & Announcements

#### `GET /mobile/subscription`
Get active subscription with plan details + days remaining

**Reads from:** `member_subscriptions`, `subscription_plans`

#### `GET /mobile/subscription/history`
Get all past subscriptions

#### `GET /mobile/announcements`
Get gym announcements (targeted to all or this member)

**Reads from:** `announcements` where `target_type = 'all'` or member in `target_ids`

---

### 7. Push & Streak

#### `POST /mobile/push-token`
Register device for push notifications

**Writes to:** `push_tokens`

#### `GET /mobile/streak`
Get current streak + longest streak + badges

**Reads from:** `member_streaks`, `member_badges`

---

## Phase 2 APIs (8 endpoints)

| Endpoint | Method | Description |
|---|---|---|
| `/mobile/water/today` | GET | Get today's water intake |
| `/mobile/water/log` | POST | Log water glasses |
| `/mobile/workout/prs` | GET | Personal records per exercise |
| `/mobile/workout/history/:date` | GET | Specific day's workout detail |
| `/mobile/workout/set-log` | POST | Log individual set during workout |
| `/mobile/badges` | GET | All earned badges |
| `/mobile/ai/chat/:sessionId` | GET | Get specific chat session |
| `/mobile/exercises` | GET | Browse exercise library |

---

## Phase 3 APIs (4 endpoints)

| Endpoint | Method | Description |
|---|---|---|
| `/mobile/profile/photo` | POST | Upload profile photo |
| `/mobile/workout/share` | POST | Generate share card |
| `/mobile/notifications` | GET | Notification history |
| `/mobile/settings` | PATCH | App settings (units, notifications) |

---

## Service Reuse Map

| Mobile Feature | Existing Service | New Code Needed? |
|---|---|---|
| Login | `authService.login()` | No |
| Profile | `memberService.getMemberById()` | Thin wrapper |
| Today's workout | `workoutService.getMemberAssignments()` + `getPlanById()` | New logic (day mapping) |
| Diet plan | `dietService.getMemberDietPlans()` | Thin wrapper |
| AI diet regenerate | `dietService.generateDietPlan()` + `saveDietPlan()` | Thin wrapper |
| Body metrics | `memberService.getMemberMetrics()` + `addBodyMetric()` | No |
| Subscription | New query on `member_subscriptions` | New query |
| Announcements | `announcementService.list()` | Filter for member |
| AI chat | New service (Gemini integration) | **New** |
| Workout logging | New service | **New** |
| Water tracking | New service | **New** |
| Streak/badges | New service | **New** |
| Push tokens | New service | **New** |

---

## Total API Count

| Phase | New Endpoints | Reused Endpoints | Total |
|---|---|---|---|
| Phase 1 (MVP) | 16 | 6 (auth) | 22 |
| Phase 2 | 8 | 0 | 8 |
| Phase 3 | 4 | 0 | 4 |
| **Total** | **28** | **6** | **34** |
```

---

## Implementation Order

1. Create new DB tables (SQL migration)
2. Modify `memberService.createMember()` to auto-create user login
3. Create `mobile.service.js` with all mobile-specific logic
4. Create `mobile.controller.js` with route handlers
5. Create `mobile.validator.js` with input validation
6. Create `mobile.routes.js` and register in route index
7. Test all 16 Phase 1 endpoints
8. Deploy to Render
