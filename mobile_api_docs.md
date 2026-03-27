# FitSaaS Mobile App — API Documentation
**Base URL (Local):** `http://localhost:5000/api/v1`
**Base URL (Production):** `https://fitsaas-api.onrender.com/api/v1`
**Version:** 1.0
**Last Updated:** March 2026

---

## Authentication

All mobile endpoints (except login) require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "email": "member@gmail.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "uuid",
      "gym_id": "uuid",
      "email": "member@gmail.com",
      "role": "member",
      "full_name": "Deepak Rao",
      "phone": "9876543210",
      "is_active": true
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Refresh Token
```
POST /auth/refresh
```
**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...(new)",
    "refreshToken": "eyJhbG...(new)"
  }
}
```

### Change Password
```
POST /auth/change-password
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "currentPassword": "oldPass123",
  "newPassword": "NewPass@2026"
}
```

### Forgot Password
```
POST /auth/forgot-password
```
**Body:**
```json
{
  "email": "member@gmail.com"
}
```

---

## Profile & Onboarding

### Get Full Profile
```
GET /mobile/profile
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "member": {
      "member_id": "uuid",
      "full_name": "Deepak Rao",
      "email": "deepak.rao94@gmail.com",
      "phone": "6741448886",
      "dob": "1994-05-15",
      "gender": "male",
      "height": 175.0,
      "weight": 73.0,
      "goal": "muscle_gain",
      "dietary_pref": "non_veg",
      "photo_url": null,
      "medical_notes": null,
      "created_at": "2026-01-15T..."
    },
    "gym": {
      "name": "Vijay's Gym",
      "logo_url": null,
      "branding": {
        "primary_color": "#6366F1",
        "secondary_color": "#8B5CF6",
        "gym_features": ["Gym access", "Locker facility", "..."]
      }
    },
    "subscription": {
      "sub_id": "uuid",
      "plan_name": "Half-Yearly",
      "price": 4499,
      "status": "active",
      "start_date": "2026-02-27T...",
      "end_date": "2026-08-26T...",
      "days_remaining": 153
    },
    "streak": {
      "current": 1,
      "longest": 1
    },
    "trainer": {
      "full_name": "Arjun Mehta",
      "phone": "9812345678",
      "specialization": "Weight Training & Bodybuilding"
    }
  }
}
```

### Update Profile
```
PATCH /mobile/profile
```
**Headers:** `Authorization: Bearer <token>`
**Body (all fields optional):**
```json
{
  "full_name": "Deepak Rao",
  "phone": "9876543210",
  "height": 175,
  "weight": 73,
  "goal": "muscle_gain",
  "dietary_pref": "non_veg",
  "gender": "male",
  "photo_url": "https://..."
}
```
**Allowed goal values:** `weight_loss`, `muscle_gain`, `endurance`, `flexibility`, `general_fitness`
**Allowed dietary_pref values:** `veg`, `non_veg`, `vegan`, `eggetarian`

**Note:** If `weight` is updated, a new body metric entry is automatically logged.

### Complete Onboarding
```
POST /mobile/profile/onboarding
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "height": 175,
  "weight": 73,
  "goal": "muscle_gain",
  "dietary_pref": "non_veg"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Onboarding completed",
    "member_id": "uuid"
  }
}
```

### Get Gym Branding
```
GET /mobile/gym/branding
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "name": "Vijay's Gym",
    "logo_url": null,
    "branding": {
      "primary_color": "#6366F1",
      "secondary_color": "#8B5CF6",
      "gym_features": ["Gym access", "Locker facility"]
    },
    "business_hours": {}
  }
}
```

---

## Workout

### Get Today's Workout
```
GET /mobile/workout/today
```
**Headers:** `Authorization: Bearer <token>`

**Response (200) — Workout Day:**
```json
{
  "success": true,
  "data": {
    "is_rest_day": false,
    "day_number": 4,
    "plan_id": "uuid",
    "plan_name": "Advanced Push Pull Legs",
    "plan_type": "weight_training",
    "difficulty": "advanced",
    "estimated_duration_min": 42,
    "exercises": [
      {
        "exercise_id": "uuid",
        "day_id": "uuid",
        "name": "Bench Press",
        "sets": 4,
        "reps": "10",
        "duration_seconds": null,
        "rest_seconds": 73,
        "notes": "Focus on form",
        "order_index": 1
      },
      {
        "exercise_id": "uuid",
        "name": "Deadlift",
        "sets": 5,
        "reps": "8",
        "rest_seconds": 60,
        "notes": null,
        "order_index": 2
      }
    ],
    "already_logged": false,
    "previous_log": null
  }
}
```

**Response (200) — Rest Day:**
```json
{
  "success": true,
  "data": {
    "is_rest_day": true,
    "day_number": 4,
    "plan_name": "Advanced Push Pull Legs",
    "plan_type": "weight_training",
    "exercises": []
  }
}
```

**Response (200) — No Plan Assigned:**
```json
{
  "success": true,
  "data": {
    "is_rest_day": true,
    "message": "No workout plan assigned yet",
    "plan": null,
    "exercises": []
  }
}
```

### Get Weekly Plan
```
GET /mobile/workout/week
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plan": {
      "plan_id": "uuid",
      "name": "Advanced Push Pull Legs",
      "type": "weight_training",
      "difficulty": "advanced"
    },
    "days": [
      {
        "day_id": "uuid",
        "day_number": 1,
        "day_name": "Monday",
        "is_rest_day": false,
        "exercise_count": 5,
        "workout_exercises": [
          {
            "exercise_id": "uuid",
            "name": "Bench Press",
            "sets": 4,
            "reps": "10",
            "rest_seconds": 73,
            "notes": null,
            "order_index": 1
          }
        ]
      },
      {
        "day_number": 4,
        "day_name": "Wednesday",
        "is_rest_day": true,
        "exercise_count": 0,
        "workout_exercises": []
      }
    ]
  }
}
```

### Log Completed Workout
```
POST /mobile/workout/log
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "plan_id": "uuid (optional)",
  "day_number": 1,
  "exercises_done": [
    {
      "name": "Bench Press",
      "sets_completed": 4,
      "reps": [12, 10, 8, 8],
      "weight_kg": [40, 45, 50, 50]
    },
    {
      "name": "Squat",
      "sets_completed": 3,
      "reps": [10, 10, 8]
    }
  ],
  "duration_minutes": 45,
  "feeling_score": 3
}
```
**feeling_score:** `1` = 😴 Tired, `2` = 😐 OK, `3` = 💪 Strong, `4` = 🔥 Beast mode

**Response (201):**
```json
{
  "success": true,
  "message": "Workout logged",
  "data": {
    "log_id": "uuid",
    "date": "2026-03-27",
    "duration_minutes": 45,
    "calories_est": 215,
    "feeling_score": 3,
    "exercises_done": [...]
  }
}
```
**Side Effects:** Updates streak, checks for badge milestones.

### Get Workout History
```
GET /mobile/workout/history?days=90
```
**Headers:** `Authorization: Bearer <token>`
**Query:** `days` — Number of days to look back (default: 90)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "date": "2026-03-27",
        "completed": true,
        "duration_minutes": 45,
        "calories_est": 215,
        "feeling_score": 3,
        "plan_name": "Advanced Push Pull Legs"
      }
    ],
    "summary": {
      "total_workouts": 1,
      "this_week": 1,
      "avg_duration": 45,
      "total_calories": 215
    }
  }
}
```

### Get Personal Records
```
GET /mobile/workout/prs
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "exercise": "Bench Press", "weight_kg": 50, "reps": 8 },
    { "exercise": "Squat", "weight_kg": null, "reps": 10 }
  ]
}
```

---

## Diet Plan

### Get Current Diet Plan
```
GET /mobile/diet/plan
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "diet_id": "uuid",
    "member_id": "uuid",
    "source": "ai",
    "created_at": "2026-03-26T...",
    "week_data": {
      "days": [
        {
          "day": 1,
          "day_name": "Monday",
          "meals": {
            "breakfast": {
              "name": "Paneer Bhurji with Roti",
              "items": ["Paneer Bhurji - 1 katori", "Roti - 2", "Curd - 1 small bowl"],
              "calories": 450,
              "protein_g": 25,
              "carbs_g": 40,
              "fat_g": 20
            },
            "morning_snack": { "name": "...", "items": [...], "calories": 150, "protein_g": 8, "carbs_g": 20, "fat_g": 5 },
            "lunch": { "..." },
            "afternoon_snack": { "..." },
            "pre_workout": { "..." },
            "post_workout": { "..." },
            "dinner": { "..." }
          },
          "daily_totals": {
            "calories": 1900,
            "protein_g": 120,
            "carbs_g": 220,
            "fat_g": 60
          }
        }
      ],
      "notes": "Stay hydrated. Eat 2 hours before workout..."
    }
  }
}
```
**Returns `null` if no diet plan exists.**

### AI Regenerate Diet Plan
```
POST /mobile/diet/regenerate
```
**Headers:** `Authorization: Bearer <token>`
**Body (all optional — auto-fills from member profile):**
```json
{
  "goal": "muscle_gain",
  "dietary_pref": "non_veg"
}
```
**Response (200):** Same structure as GET diet plan — freshly AI-generated Indian meals.

---

## AI Virtual Trainer (Chat)

### Send Message
```
POST /mobile/ai/chat
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "message": "What should I eat before workout?",
  "session_id": null
}
```
- `session_id`: Pass `null` for new conversation, or existing session UUID to continue.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reply": "Hey Deepak! To fuel your muscle gain workout, have a small meal 1-2 hours before...",
    "session_id": "uuid",
    "messages_remaining": 17
  }
}
```
**Daily Limit:** 20 messages per day (resets at midnight).

### Get Chat History
```
GET /mobile/ai/chat/history
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "session_id": "uuid",
      "created_at": "2026-03-27T...",
      "message_count": 4,
      "last_message": "Hey Deepak! To fuel your muscle gain workout..."
    }
  ]
}
```

### Get Daily Tip
```
GET /mobile/ai/tip
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tip": "Focus on how you'll feel after your workout, not how hard it will be to start.",
    "type": "motivation"
  }
}
```
**Tip types rotate daily:** `nutrition`, `exercise`, `recovery`, `motivation`, `hydration`, `sleep`

---

## Body Metrics

### Get Metrics History
```
GET /mobile/metrics
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "metric_id": "uuid",
      "weight": 74.5,
      "bmi": 24.3,
      "body_fat_pct": 18.2,
      "recorded_at": "2026-03-27T..."
    },
    {
      "metric_id": "uuid",
      "weight": 73.0,
      "bmi": 23.8,
      "body_fat_pct": null,
      "recorded_at": "2026-02-15T..."
    }
  ]
}
```

### Log New Metric
```
POST /mobile/metrics
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "weight": 73.5,
  "bmi": 24.0,
  "body_fat_pct": 18.2
}
```
All fields optional but at least one should be provided.

---

## Subscription

### Get Active Subscription
```
GET /mobile/subscription
```
**Headers:** `Authorization: Bearer <token>`

**Response (200) — Active:**
```json
{
  "success": true,
  "data": {
    "active": true,
    "subscription": {
      "sub_id": "uuid",
      "plan_name": "Half-Yearly",
      "price": 4499,
      "status": "active",
      "start_date": "2026-02-27T...",
      "end_date": "2026-08-26T...",
      "days_remaining": 153,
      "urgency": "ok",
      "features": "[\"Gym access\",\"Locker\",\"Group classes\",\"Diet consultation\"]"
    }
  }
}
```
**Urgency levels:** `ok` (>7 days), `warning` (3-7 days), `critical` (≤3 days)

**Response (200) — No Active Subscription:**
```json
{
  "success": true,
  "data": {
    "active": false,
    "subscription": null
  }
}
```

### Get Subscription History
```
GET /mobile/subscription/history
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "sub_id": "uuid",
      "plan_id": "uuid",
      "start_date": "2026-02-27T...",
      "end_date": "2026-08-26T...",
      "status": "active",
      "subscription_plans": {
        "name": "Half-Yearly",
        "price": 4499,
        "duration_days": 180
      }
    }
  ]
}
```

---

## Announcements

### Get Gym Announcements
```
GET /mobile/announcements
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "announcement_id": "uuid",
      "title": "Gym Timings Updated",
      "message": "We are now open from 5 AM to 11 PM on weekdays...",
      "target_type": "all",
      "sent_at": "2026-03-25T...",
      "created_at": "2026-03-25T..."
    }
  ]
}
```

---

## Streak & Badges

### Get Streak
```
GET /mobile/streak
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "current_streak": 1,
    "longest_streak": 1,
    "last_workout_date": "2026-03-27",
    "badges": []
  }
}
```

### Get Badges
```
GET /mobile/badges
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "badge_id": "uuid",
      "badge_type": "streak_7",
      "earned_at": "2026-03-20T...",
      "name": "7-Day Warrior",
      "description": "7 day workout streak",
      "icon": "🔥"
    },
    {
      "badge_type": "streak_30",
      "name": "Monthly Beast",
      "description": "30 day workout streak",
      "icon": "🏆"
    }
  ]
}
```
**Badge milestones:** 7, 14, 30, 60, 90, 180, 365 days

---

## Water Tracking

### Get Today's Water Intake
```
GET /mobile/water/today
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "glasses_count": 2,
    "date": "2026-03-27"
  }
}
```

### Log Water
```
POST /mobile/water/log
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "glasses": 2
}
```
**`glasses`** defaults to 1 if not provided. Each glass = 250ml. Adds to today's total.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "glasses_count": 4,
    "date": "2026-03-27"
  }
}
```

---

## Push Notifications

### Register Device Token
```
POST /mobile/push-token
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "device_token": "ExponentPushToken[abc123...]",
  "platform": "android"
}
```
**platform:** `ios` or `android`

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

**Common Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 429 | Too many requests (rate limit or chat limit) |
| 500 | Server error |

---

## Rate Limits
- **API:** 500 requests per minute per IP
- **AI Chat:** 20 messages per day per member

---

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Member | `deepak.rao94@gmail.com` | `Member@2026` |
| Gym Admin | `vijay@gmail.com` | `GymAdmin@2026` |
| Super Admin | `admin@fitsaas.com` | `SuperAdmin@2026` |

---

## Endpoint Summary

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/auth/login` | Member login |
| 2 | POST | `/auth/refresh` | Refresh token |
| 3 | POST | `/auth/change-password` | Change password |
| 4 | POST | `/auth/forgot-password` | Forgot password |
| 5 | GET | `/mobile/profile` | Get full profile + gym + subscription + streak |
| 6 | PATCH | `/mobile/profile` | Update profile |
| 7 | POST | `/mobile/profile/onboarding` | Complete first-time setup |
| 8 | GET | `/mobile/gym/branding` | Get gym branding for theming |
| 9 | GET | `/mobile/workout/today` | Get today's workout exercises |
| 10 | GET | `/mobile/workout/week` | Get full 7-day plan |
| 11 | POST | `/mobile/workout/log` | Log completed workout |
| 12 | GET | `/mobile/workout/history` | Workout history (calendar heatmap) |
| 13 | GET | `/mobile/workout/prs` | Personal records per exercise |
| 14 | GET | `/mobile/diet/plan` | Get current diet plan |
| 15 | POST | `/mobile/diet/regenerate` | AI regenerate diet plan |
| 16 | POST | `/mobile/ai/chat` | Send message to AI trainer |
| 17 | GET | `/mobile/ai/chat/history` | Chat session history |
| 18 | GET | `/mobile/ai/tip` | Daily AI fitness tip |
| 19 | GET | `/mobile/metrics` | Body metrics history |
| 20 | POST | `/mobile/metrics` | Log body metric |
| 21 | GET | `/mobile/subscription` | Active subscription status |
| 22 | GET | `/mobile/subscription/history` | Subscription history |
| 23 | GET | `/mobile/announcements` | Gym announcements |
| 24 | GET | `/mobile/streak` | Current streak + badges |
| 25 | GET | `/mobile/badges` | All earned badges |
| 26 | GET | `/mobile/water/today` | Today's water intake |
| 27 | POST | `/mobile/water/log` | Log water glasses |
| 28 | POST | `/mobile/push-token` | Register push notification token |
