-- Mobile App Database Tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS member_workout_logs (
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

CREATE TABLE IF NOT EXISTS member_set_logs (
  set_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID NOT NULL REFERENCES member_workout_logs(log_id) ON DELETE CASCADE,
  exercise_name VARCHAR(200) NOT NULL,
  set_number INT NOT NULL,
  reps_done INT,
  weight_kg DECIMAL(5,1),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS water_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);

CREATE TABLE IF NOT EXISTS member_streaks (
  streak_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_workout_date DATE,
  UNIQUE(member_id)
);

CREATE TABLE IF NOT EXISTS member_badges (
  badge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform VARCHAR(10) CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_member ON member_workout_logs(member_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_gym ON member_workout_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_log ON member_set_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_member ON water_logs(member_id, date);
CREATE INDEX IF NOT EXISTS idx_streaks_member ON member_streaks(member_id);
CREATE INDEX IF NOT EXISTS idx_badges_member ON member_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON push_tokens(member_id);
