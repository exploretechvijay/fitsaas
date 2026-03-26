# Product Requirements Document
## FitSaaS — Gym Admin Web Portal
**Version:** 1.0  
**Date:** March 2026  
**Document Type:** Product Requirements Document (PRD)  
**Platform:** Web Application  

---

## 1. Product Overview

### 1.1 Vision
FitSaaS is a multi-tenant SaaS fitness platform that empowers gyms and fitness centers to manage their business operations digitally — while providing their members access to an AI-powered personal trainer experience at zero extra cost.

### 1.2 Problem Statement
Personal training is unaffordable for most gym members. Gym owners lack a unified, affordable SaaS tool to manage members, subscriptions, and training programs. FitSaaS bridges this gap by offering a gym management portal (web) and an AI-powered fitness companion (mobile app) under one SaaS umbrella.

### 1.3 Target Users
| User Type | Description |
|---|---|
| SaaS Super Admin | FitSaaS platform owner — onboards gyms |
| Gym Admin | Gym/fitness center owner or manager |
| Gym Staff | Trainers, front desk staff added by Gym Admin |
| Members (via web) | Customers who can also access a limited web dashboard |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| HTTP Client | Axios |
| Backend | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT-based) |
| AI Integration | Google Gemini API |
| Security | Helmet, CORS, dotenv |
| Compression | Compression middleware |
| Deployment | IIS + iisnode |

---

## 3. Multi-Tenant SaaS Architecture

### 3.1 Tenant Model
- Each gym is a **tenant** identified by a unique `gym_id` (UUID)
- All data (members, plans, subscriptions) is scoped to `gym_id`
- Row-Level Security (RLS) enforced at Supabase level
- Custom subdomain support: `gymname.fitsaas.com` (Phase 2)

### 3.2 Tenant Onboarding Flow
1. Super Admin creates gym account from Super Admin Panel
2. System auto-generates gym credentials and unique `gym_id`
3. Gym Admin receives email invite with temporary password
4. Gym Admin completes profile setup (gym name, logo, contact, address, business hours)
5. Gym goes live — members can be added/invited

---

## 4. Module Specifications

---

### 4.1 Authentication & Authorization

#### 4.1.1 Login
- Email + Password login via Supabase Auth
- Role-based redirect post-login: Super Admin → `/super-admin`, Gym Admin → `/dashboard`, Staff → `/dashboard`
- Remember Me (persistent session)
- Forgot Password → email OTP reset flow

#### 4.1.2 Roles & Permissions
| Role | Permissions |
|---|---|
| Super Admin | Full platform access, gym CRUD, billing, analytics |
| Gym Admin | Full gym-level access, member CRUD, subscription management |
| Gym Staff/Trainer | View members, manage assigned workout plans |
| Member (Web) | View own profile, workout history, subscription status |

---

### 4.2 Super Admin Panel

#### 4.2.1 Gym Management
- List all onboarded gyms with status (Active / Inactive / Trial)
- Create new gym (name, owner name, email, phone, address, plan tier)
- Edit gym details
- Activate / Deactivate gym account
- View gym-level stats: total members, active subscriptions, revenue

#### 4.2.2 SaaS Plan Management
- Create SaaS subscription tiers (e.g., Starter, Growth, Pro)
- Define limits per tier: max members, staff accounts, AI chat credits
- Assign/change plan for a gym

#### 4.2.3 Platform Analytics
- Total gyms, active gyms, churned gyms
- Total members across all gyms
- MRR (Monthly Recurring Revenue) — manual or Stripe integration (Phase 2)
- Top performing gyms by member count

---

### 4.3 Gym Admin Dashboard

#### 4.3.1 Dashboard Overview (Home)
- KPI Cards:
  - Total Active Members
  - New Members This Month
  - Expiring Subscriptions (next 7 days)
  - Total Revenue This Month
- Quick Actions: Add Member, Create Plan, View Expiring Subscriptions
- Recent Activity Feed (new joins, cancellations, check-ins)
- Member Growth Chart (line chart — last 6 months)
- Subscription Distribution Chart (pie — Active / Expired / Paused)

---

### 4.4 Member Management

#### 4.4.1 Member List
- Searchable, filterable table
- Filters: Subscription Status, Plan Type, Join Date, Gender, Age Group
- Columns: Name, Phone, Email, Plan, Start Date, Expiry Date, Status, Actions
- Bulk Actions: Export CSV, Send Reminder, Deactivate

#### 4.4.2 Add Member
- Fields: Full Name, Email, Phone, Date of Birth, Gender, Profile Photo (upload)
- Emergency Contact: Name, Phone, Relationship
- Health Info: Height, Weight, Medical Conditions (optional), Fitness Goal
- Assign Subscription Plan
- Assign Trainer (optional)
- Auto-send welcome email with mobile app download link + login credentials

#### 4.4.3 Member Profile Page
- Personal info + edit
- Subscription history timeline
- Assigned workout plan summary
- Diet plan summary (AI-generated)
- Attendance / Check-in history (Phase 2 — QR scan)
- Notes from trainer
- Body metrics log (Weight, BMI over time — chart)

---

### 4.5 Subscription Management

#### 4.5.1 Subscription Plans (Gym Level)
- Create / Edit / Delete plans
- Plan Fields: Name, Duration (Monthly / Quarterly / Half-Yearly / Annual / Custom), Price, Description, Features (tags)
- Toggle plan active/inactive

#### 4.5.2 Member Subscription
- Assign plan to member with start date
- Auto-calculate expiry date
- Subscription Status: Active / Expired / Paused / Cancelled
- Renew Subscription (extend from current expiry or from today)
- Pause Subscription (freeze days — e.g., member is travelling)
- Cancel Subscription with reason
- Manual Payment Recording: Amount, Mode (Cash/UPI/Card/Bank Transfer), Date, Reference ID, Notes
- Payment Receipt generation (PDF export)

#### 4.5.3 Expiry Alerts
- Dashboard widget for expiring in 7 / 15 / 30 days
- Manual WhatsApp/SMS reminder button (opens pre-filled message) — Phase 2 auto-send

---

### 4.6 Workout Plan Management

#### 4.6.1 Plan Library
- Gym Admin / Staff can create master workout plan templates
- Plan Type: Weight Training, Yoga, Cardio, HIIT, CrossFit, Calisthenics, Mixed
- Difficulty: Beginner / Intermediate / Advanced
- Goal Tags: Weight Loss, Muscle Gain, Endurance, Flexibility, General Fitness

#### 4.6.2 Plan Builder
- 7-day weekly schedule builder (drag-and-drop days)
- Per Day: Add exercises with Sets, Reps/Duration, Rest Time, Notes
- Exercise library with search (pre-seeded with 200+ exercises across all categories)
- Rest day assignment
- Clone plan / edit plan

#### 4.6.3 Assign Plan to Member
- Select member → assign workout plan
- Plan start date
- Override individual days if needed
- Member sees plan in mobile app

---

### 4.7 Diet Plan Management

#### 4.7.1 AI-Generated Diet Plan (Gemini Powered)
- Input: Member's goal, weight, height, age, dietary preference (Veg / Non-Veg / Vegan)
- Gemini API generates a weekly diet chart (Breakfast, Lunch, Dinner, Snacks, Pre/Post Workout)
- Calories and macros breakdown per meal
- Admin can review, edit, and save the plan
- Member views plan on mobile app

#### 4.7.2 Manual Diet Plan
- Gym staff can manually create diet plans using the same structure
- Add custom meals, portion sizes, notes

---

### 4.8 Staff Management

#### 4.8.1 Staff List
- Add / Edit / Remove staff (Trainer / Front Desk / Manager)
- Fields: Name, Email, Phone, Role, Specialization (for trainers), Profile Photo

#### 4.8.2 Trainer-Member Assignment
- Assign one or more members to a trainer
- Trainer sees their assigned members on their dashboard

---

### 4.9 Announcements & Notifications (Gym Level)
- Create announcements: Title, Message, Target (All Members / Plan-specific / Individual)
- Delivery channel: In-app notification (mobile) + Web notification
- Schedule announcement for future date/time
- Notification history log

---

### 4.10 Reports & Analytics

| Report | Description |
|---|---|
| Member Report | New joins, churn, active count by month |
| Revenue Report | Revenue by plan type, by month |
| Subscription Report | Expiry forecast, renewal rate |
| Attendance Report | Check-in frequency (Phase 2) |
| Workout Completion Report | Plan adherence per member (from mobile app data) |

- Export all reports as CSV / PDF
- Date range filter on all reports

---

### 4.11 Gym Settings

- Gym Profile: Name, Logo, Address, Phone, Email, Website, Social Links
- Business Hours: Day-wise open/close time
- Notification Preferences: Email alerts for expiry, new joins
- Branding: Primary color, secondary color (used in member-facing views)
- API Keys: Gemini API key input (gym-level or platform default)
- Staff Role Permissions (toggle per-role)

---

## 5. Database Schema (Supabase / PostgreSQL)

```sql
-- Core Tables

tenants (gym_id, name, owner_name, email, phone, address, logo_url, status, saas_plan_id, created_at)

users (user_id, gym_id, email, role, full_name, phone, profile_photo, created_at)

members (member_id, gym_id, full_name, email, phone, dob, gender, photo_url, height, weight, goal, dietary_pref, medical_notes, emergency_contact_name, emergency_contact_phone, created_at)

subscription_plans (plan_id, gym_id, name, duration_days, price, description, is_active)

member_subscriptions (sub_id, member_id, gym_id, plan_id, start_date, end_date, status, paused_at, pause_days, cancelled_at, cancel_reason)

payments (payment_id, sub_id, member_id, gym_id, amount, mode, reference_id, paid_at, notes)

workout_plans (plan_id, gym_id, name, type, difficulty, goal_tags, created_by, created_at)

workout_days (day_id, plan_id, day_number, is_rest_day)

workout_exercises (exercise_id, day_id, name, sets, reps, duration_seconds, rest_seconds, notes, order)

member_workout_assignments (assignment_id, member_id, plan_id, assigned_by, start_date)

diet_plans (diet_id, member_id, gym_id, source [ai/manual], week_data jsonb, created_at)

announcements (announcement_id, gym_id, title, message, target_type, target_ids, scheduled_at, sent_at)

ai_chat_sessions (session_id, member_id, gym_id, messages jsonb, created_at)

body_metrics (metric_id, member_id, weight, bmi, body_fat_pct, recorded_at)
```

---

## 6. API Structure (Express.js)

```
/api/v1/
  auth/         login, logout, refresh, reset-password
  super-admin/  gyms CRUD, saas-plans, platform-stats
  gym/          profile, settings, branding
  members/      CRUD, search, assign-plan, metrics
  subscriptions/ create, renew, pause, cancel, payments
  workout-plans/ CRUD, exercises, assign
  diet-plans/   generate (Gemini), save, get
  staff/        CRUD, assignments
  reports/      members, revenue, subscriptions
  ai/           chat (Gemini), diet-generate
  notifications/ send, history
```

---

## 7. UI/UX Specifications

### 7.1 Design Language
- **Style:** Clean, modern SaaS (inspired by Linear, Notion, Vercel dashboard aesthetic)
- **Mode:** Light mode default, Dark mode toggle
- **Primary Color:** Customizable per gym (default: `#6366F1` — Indigo)
- **Typography:** Inter font family
- **Border Radius:** Rounded-lg (8px) cards, Rounded-xl modals
- **Sidebar:** Collapsible left navigation with icons + labels

### 7.2 Layout
- Fixed sidebar (240px expanded, 64px collapsed)
- Top header: Gym logo, page title, notification bell, user avatar dropdown
- Main content area: Responsive grid
- Breadcrumb navigation on all inner pages

### 7.3 Component Patterns
- Data tables with pagination (10/25/50 per page)
- Slide-over panels for Add/Edit forms (not full-page modals)
- Toast notifications (success/error/info)
- Skeleton loaders on data fetch
- Empty states with illustration + CTA
- Confirmation dialogs before delete/cancel actions

---

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Page load < 2s, API response < 500ms p95 |
| Security | Supabase RLS enforced, JWT auth, Helmet headers, input sanitization |
| Scalability | Stateless Express API, connection pooling via Supabase client |
| Availability | 99.9% uptime target |
| Accessibility | WCAG 2.1 AA compliance (keyboard nav, contrast ratios) |
| SEO | N/A (auth-gated app) |
| Audit Logs | All critical actions logged (Phase 2) |

---

## 9. Phased Rollout

| Phase | Features | Timeline |
|---|---|---|
| Phase 1 (MVP) | Auth, Gym onboarding, Member CRUD, Subscription management, Basic workout plan builder, Diet plan (AI), Dashboard KPIs | Month 1–3 |
| Phase 2 | AI Virtual Trainer chat (web), Reports & Analytics, Staff management, Announcements, Body metrics tracking | Month 4–5 |
| Phase 3 | QR check-in, WhatsApp integration, Stripe billing, Custom subdomain, Mobile app launch | Month 6–8 |

---

## 10. Out of Scope (v1.0)
- Payment gateway integration (manual payment recording only in v1)
- Live video streaming / class booking
- Wearable device integration
- Native mobile web admin (mobile app is separate — see Mobile PRD)
