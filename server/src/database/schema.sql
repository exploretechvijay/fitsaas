-- FitSaaS Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SaaS Plans (Platform-level pricing tiers)
-- ============================================
CREATE TABLE IF NOT EXISTS saas_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  max_members INT NOT NULL DEFAULT 100,
  max_staff INT NOT NULL DEFAULT 5,
  ai_credits INT NOT NULL DEFAULT 100,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Tenants (Gyms)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  gym_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  owner_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'inactive', 'trial')),
  saas_plan_id UUID REFERENCES saas_plans(plan_id),
  business_hours JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{"primary_color": "#6366F1", "secondary_color": "#8B5CF6"}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  website VARCHAR(500),
  notification_preferences JSONB DEFAULT '{"email_expiry": true, "email_new_joins": true}'::jsonb,
  gemini_api_key VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Users (All roles: super_admin, gym_admin, staff)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID REFERENCES tenants(gym_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'gym_admin', 'staff', 'member')),
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  profile_photo TEXT,
  specialization VARCHAR(200),
  staff_role VARCHAR(20) CHECK (staff_role IN ('trainer', 'front_desk', 'manager')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Password Resets
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
  reset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Members
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  dob DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  photo_url TEXT,
  height DECIMAL(5,1),
  weight DECIMAL(5,1),
  goal VARCHAR(50) CHECK (goal IN ('weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness')),
  dietary_pref VARCHAR(20) CHECK (dietary_pref IN ('veg', 'non_veg', 'vegan', 'eggetarian')),
  medical_notes TEXT,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gym_id, email)
);

-- ============================================
-- Subscription Plans (Gym-level)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  duration_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Member Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS member_subscriptions (
  sub_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused', 'cancelled')),
  paused_at TIMESTAMPTZ,
  pause_days INT DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_id UUID REFERENCES member_subscriptions(sub_id),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'bank_transfer')),
  reference_id VARCHAR(200),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Workout Plans
-- ============================================
CREATE TABLE IF NOT EXISTS workout_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('weight_training', 'yoga', 'cardio', 'hiit', 'crossfit', 'calisthenics', 'mixed')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  goal_tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Workout Days
-- ============================================
CREATE TABLE IF NOT EXISTS workout_days (
  day_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES workout_plans(plan_id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  is_rest_day BOOLEAN DEFAULT false
);

-- ============================================
-- Workout Exercises
-- ============================================
CREATE TABLE IF NOT EXISTS workout_exercises (
  exercise_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES workout_days(day_id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sets INT,
  reps VARCHAR(50),
  duration_seconds INT,
  rest_seconds INT,
  notes TEXT,
  order_index INT DEFAULT 1
);

-- ============================================
-- Member Workout Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS member_workout_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES workout_plans(plan_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(user_id),
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Diet Plans
-- ============================================
CREATE TABLE IF NOT EXISTS diet_plans (
  diet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  source VARCHAR(10) NOT NULL CHECK (source IN ('ai', 'manual')),
  week_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Announcements
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('all', 'plan', 'individual')),
  target_ids JSONB DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI Chat Sessions (Phase 2)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Body Metrics
-- ============================================
CREATE TABLE IF NOT EXISTS body_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  weight DECIMAL(5,1),
  bmi DECIMAL(4,1),
  body_fat_pct DECIMAL(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Trainer-Member Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS trainer_member_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, member_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(gym_id, email);
CREATE INDEX IF NOT EXISTS idx_member_subs_gym ON member_subscriptions(gym_id);
CREATE INDEX IF NOT EXISTS idx_member_subs_member ON member_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_subs_status ON member_subscriptions(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_member_subs_end_date ON member_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_payments_gym ON payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(gym_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_gym ON workout_plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_member ON diet_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_member ON body_metrics(member_id);
CREATE INDEX IF NOT EXISTS idx_announcements_gym ON announcements(gym_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_gym ON trainer_member_assignments(gym_id);

-- ============================================
-- Seed: Default Super Admin
-- ============================================
-- Password: SuperAdmin@2026 (bcrypt hash)
INSERT INTO users (user_id, email, password_hash, role, full_name, phone, is_active)
VALUES (
  uuid_generate_v4(),
  'admin@fitsaas.com',
  '$2a$12$LJ3x5Fx5Q5q5q5q5q5q5qOhIhIhIhIhIhIhIhIhIhIhIhIhIhIhI',
  'super_admin',
  'FitSaaS Admin',
  '+1234567890',
  true
) ON CONFLICT (email) DO NOTHING;

-- Seed: Default SaaS Plans
INSERT INTO saas_plans (name, max_members, max_staff, ai_credits, price, features) VALUES
  ('Starter', 50, 3, 50, 29.99, '["Basic dashboard", "Member management", "Subscription plans"]'),
  ('Growth', 200, 10, 200, 79.99, '["Everything in Starter", "Workout plans", "Diet plans (AI)", "Staff management"]'),
  ('Pro', 1000, 50, 1000, 199.99, '["Everything in Growth", "Analytics & Reports", "Announcements", "Priority support"]')
ON CONFLICT DO NOTHING;
