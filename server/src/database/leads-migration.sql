-- Lead Management Tables + Seed Data
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  age INT,
  source VARCHAR(50) DEFAULT 'walk_in' CHECK (source IN ('walk_in', 'phone', 'website', 'social_media', 'referral', 'advertisement', 'bulk_upload', 'other')),
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'follow_up', 'trial', 'converted', 'not_interested', 'lost')),
  interest VARCHAR(100),
  notes TEXT,
  assigned_to UUID REFERENCES users(user_id),
  created_by UUID REFERENCES users(user_id),
  converted_member_id UUID REFERENCES members(member_id),
  last_contacted_at TIMESTAMPTZ,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
  activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES tenants(gym_id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('call', 'email', 'sms', 'whatsapp', 'visit', 'follow_up', 'note', 'status_change', 'converted')),
  disposition VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_gym ON leads(gym_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(gym_id, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- ============================================
-- Seed Data: 50 Leads with varied statuses
-- ============================================
DO $$
DECLARE
  gym UUID := 'd8b941c5-4630-4cd9-969d-d9def6e09e03';
  lid UUID;
BEGIN

-- NEW leads (12)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, created_at)
VALUES
  (gym, 'Amit Rathore', '9812345001', 'amit.rathore@gmail.com', 'male', 28, 'walk_in', 'new', 'Weight training', 'Walked in today, asked about monthly plans', NOW() - interval '1 day'),
  (gym, 'Priya Kapoor', '9812345002', 'priya.k@yahoo.com', 'female', 24, 'social_media', 'new', 'Yoga, Zumba', 'Messaged on Instagram', NOW() - interval '2 days'),
  (gym, 'Rahul Thakur', '9812345003', NULL, 'male', 32, 'phone', 'new', 'General fitness', 'Called and asked about rates', NOW() - interval '3 days'),
  (gym, 'Snehal Jain', '9812345004', 'snehal.j@outlook.com', 'female', 22, 'website', 'new', 'Weight loss', 'Filled enquiry form on website', NOW() - interval '1 day'),
  (gym, 'Vikrant Patil', '9812345005', NULL, 'male', 35, 'advertisement', 'new', 'CrossFit', 'Saw newspaper ad', NOW() - interval '4 days'),
  (gym, 'Neeta Sharma', '9812345006', 'neeta.s@gmail.com', 'female', 29, 'referral', 'new', 'Cardio, Swimming', 'Referred by member Ravi Singh', NOW() - interval '2 days'),
  (gym, 'Kartik Verma', '9812345007', NULL, 'male', 26, 'walk_in', 'new', 'Bodybuilding', NULL, NOW() - interval '5 hours'),
  (gym, 'Divya Nair', '9812345008', 'divya.nair@gmail.com', 'female', 31, 'social_media', 'new', 'Pilates', 'Found us on Facebook', NOW() - interval '6 hours'),
  (gym, 'Sandeep Yadav', '9812345009', NULL, 'male', 40, 'phone', 'new', 'General fitness', 'Enquired about senior citizen batch', NOW() - interval '8 hours'),
  (gym, 'Meghna Das', '9812345010', 'meghna.d@yahoo.com', 'female', 27, 'website', 'new', 'Functional training', NULL, NOW() - interval '10 hours'),
  (gym, 'Rohit Kulkarni', '9812345011', NULL, 'male', 23, 'walk_in', 'new', 'Weight training', 'College student, budget conscious', NOW() - interval '12 hours'),
  (gym, 'Anita Bose', '9812345012', 'anita.b@gmail.com', 'female', 34, 'referral', 'new', 'Yoga', 'Referred by Priya Nair', NOW() - interval '1 day');

-- CONTACTED leads (8)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, created_at)
VALUES
  (gym, 'Manish Agarwal', '9812345013', 'manish.a@gmail.com', 'male', 30, 'walk_in', 'contacted', 'Weight training', 'Called, said will visit this weekend', NOW() - interval '1 day', NOW() - interval '5 days'),
  (gym, 'Pooja Reddy', '9812345014', 'pooja.r@outlook.com', 'female', 25, 'social_media', 'contacted', 'Zumba, Aerobics', 'WhatsApp msg sent, seen but no reply', NOW() - interval '2 days', NOW() - interval '7 days'),
  (gym, 'Aryan Shah', '9812345015', NULL, 'male', 21, 'phone', 'contacted', 'MMA, Boxing', 'Interested in combat training', NOW() - interval '3 days', NOW() - interval '8 days'),
  (gym, 'Kavita Mishra', '9812345016', 'kavita.m@gmail.com', 'female', 38, 'advertisement', 'contacted', 'Weight loss', 'Wants personal trainer', NOW() - interval '1 day', NOW() - interval '6 days'),
  (gym, 'Deepak Joshi', '9812345017', NULL, 'male', 27, 'referral', 'contacted', 'Strength training', 'Called twice, asked about annual plan discount', NOW() - interval '4 days', NOW() - interval '10 days'),
  (gym, 'Ritu Pandey', '9812345018', 'ritu.p@yahoo.com', 'female', 33, 'website', 'contacted', 'Yoga, Meditation', 'Email sent with brochure', NOW() - interval '2 days', NOW() - interval '9 days'),
  (gym, 'Suresh Hegde', '9812345019', NULL, 'male', 45, 'walk_in', 'contacted', 'General fitness', 'Doctor recommended gym, needs guidance', NOW() - interval '5 days', NOW() - interval '12 days'),
  (gym, 'Nandini Rao', '9812345020', 'nandini.r@gmail.com', 'female', 26, 'social_media', 'contacted', 'Dance fitness', 'Replied on Instagram DM', NOW() - interval '1 day', NOW() - interval '4 days');

-- INTERESTED leads (8) with follow-up dates
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, follow_up_date, created_at)
VALUES
  (gym, 'Vikas Tiwari', '9812345021', 'vikas.t@gmail.com', 'male', 29, 'walk_in', 'interested', 'Weight training, Cardio', 'Visited gym, liked facilities, comparing prices', NOW() - interval '1 day', CURRENT_DATE + interval '2 days', NOW() - interval '10 days'),
  (gym, 'Swati Chopra', '9812345022', 'swati.c@outlook.com', 'female', 24, 'referral', 'interested', 'Yoga, Pilates', 'Very interested, waiting for salary credit', NOW() - interval '2 days', CURRENT_DATE + interval '5 days', NOW() - interval '12 days'),
  (gym, 'Gaurav Mehta', '9812345023', NULL, 'male', 33, 'phone', 'interested', 'CrossFit', 'Asked for trial session', NOW() - interval '1 day', CURRENT_DATE + interval '1 day', NOW() - interval '8 days'),
  (gym, 'Pallavi Desai', '9812345024', 'pallavi.d@gmail.com', 'female', 28, 'website', 'interested', 'Swimming, Aqua aerobics', 'Wants to see pool facilities', NOW() - interval '3 days', CURRENT_DATE + interval '3 days', NOW() - interval '14 days'),
  (gym, 'Rajat Singh', '9812345025', NULL, 'male', 36, 'advertisement', 'interested', 'Personal training', 'Budget approved, deciding on plan', NOW() - interval '2 days', CURRENT_DATE, NOW() - interval '11 days'),
  (gym, 'Isha Malhotra', '9812345026', 'isha.m@yahoo.com', 'female', 22, 'social_media', 'interested', 'Group classes', 'Wants to join with friend', NOW() - interval '1 day', CURRENT_DATE + interval '4 days', NOW() - interval '7 days'),
  (gym, 'Nitin Banerjee', '9812345027', 'nitin.b@gmail.com', 'male', 42, 'walk_in', 'interested', 'Rehabilitation', 'Post knee surgery, needs special attention', NOW() - interval '4 days', CURRENT_DATE + interval '7 days', NOW() - interval '15 days'),
  (gym, 'Tanvi Ghosh', '9812345028', NULL, 'female', 30, 'referral', 'interested', 'HIIT, Functional', 'Trainer recommended our gym', NOW() - interval '2 days', CURRENT_DATE + interval '2 days', NOW() - interval '9 days');

-- FOLLOW UP leads (6) - some overdue
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, follow_up_date, created_at)
VALUES
  (gym, 'Ashish Kumar', '9812345029', 'ashish.k@gmail.com', 'male', 31, 'walk_in', 'follow_up', 'Weight training', 'Said call me next week', NOW() - interval '5 days', CURRENT_DATE - interval '2 days', NOW() - interval '20 days'),
  (gym, 'Sunita Gill', '9812345030', NULL, 'female', 35, 'phone', 'follow_up', 'Yoga', 'Travelling, will join after return', NOW() - interval '10 days', CURRENT_DATE + interval '3 days', NOW() - interval '25 days'),
  (gym, 'Pavan Srivastava', '9812345031', 'pavan.s@outlook.com', 'male', 28, 'social_media', 'follow_up', 'Bodybuilding', 'Shifting to nearby area', NOW() - interval '7 days', CURRENT_DATE - interval '1 day', NOW() - interval '18 days'),
  (gym, 'Rekha Iyer', '9812345032', 'rekha.i@gmail.com', 'female', 40, 'referral', 'follow_up', 'Swimming', 'Wants ladies-only batch timings', NOW() - interval '3 days', CURRENT_DATE + interval '1 day', NOW() - interval '15 days'),
  (gym, 'Ajay Pillai', '9812345033', NULL, 'male', 25, 'advertisement', 'follow_up', 'MMA', 'Checking other gyms too', NOW() - interval '4 days', CURRENT_DATE, NOW() - interval '12 days'),
  (gym, 'Bhavna Sen', '9812345034', 'bhavna.s@yahoo.com', 'female', 27, 'website', 'follow_up', 'Cardio, Dance', 'Wants to start after exams', NOW() - interval '8 days', CURRENT_DATE + interval '10 days', NOW() - interval '22 days');

-- TRIAL leads (4)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, created_at)
VALUES
  (gym, 'Siddharth Gupta', '9812345035', 'sid.g@gmail.com', 'male', 26, 'walk_in', 'trial', 'Weight training', 'Started 3-day trial yesterday', NOW() - interval '1 day', NOW() - interval '8 days'),
  (gym, 'Mira Chatterjee', '9812345036', 'mira.c@outlook.com', 'female', 23, 'social_media', 'trial', 'Zumba, Yoga', 'On day 2 of trial, enjoying classes', NOW() - interval '2 days', NOW() - interval '10 days'),
  (gym, 'Karthik Nair', '9812345037', NULL, 'male', 34, 'referral', 'trial', 'CrossFit', 'Trial ending tomorrow, likely to convert', NOW() - interval '1 day', NOW() - interval '6 days'),
  (gym, 'Shreya Bhat', '9812345038', 'shreya.b@gmail.com', 'female', 29, 'website', 'trial', 'Personal training', 'Impressed with trainer quality', NOW() - interval '3 days', NOW() - interval '12 days');

-- CONVERTED leads (4)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, created_at)
VALUES
  (gym, 'Arun Dey', '9812345039', 'arun.d@gmail.com', 'male', 30, 'walk_in', 'converted', 'Weight training', 'Joined quarterly plan', NOW() - interval '2 days', NOW() - interval '30 days'),
  (gym, 'Simran Kaur', '9812345040', 'simran.k@yahoo.com', 'female', 25, 'referral', 'converted', 'Yoga, Cardio', 'Joined annual plan after trial', NOW() - interval '5 days', NOW() - interval '25 days'),
  (gym, 'Tushar Pandey', '9812345041', NULL, 'male', 38, 'advertisement', 'converted', 'General fitness', 'Converted after 2 follow-ups', NOW() - interval '7 days', NOW() - interval '35 days'),
  (gym, 'Alka Roy', '9812345042', 'alka.r@gmail.com', 'female', 32, 'social_media', 'converted', 'Swimming, Yoga', 'Premium plan with personal trainer', NOW() - interval '3 days', NOW() - interval '20 days');

-- NOT INTERESTED leads (4)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, created_at)
VALUES
  (gym, 'Manoj Dubey', '9812345043', NULL, 'male', 45, 'phone', 'not_interested', 'General fitness', 'Too expensive for him', NOW() - interval '10 days', NOW() - interval '30 days'),
  (gym, 'Archana Mukherjee', '9812345044', 'archana.m@gmail.com', 'female', 28, 'walk_in', 'not_interested', 'Zumba', 'Found closer gym near home', NOW() - interval '15 days', NOW() - interval '25 days'),
  (gym, 'Jayesh Patil', '9812345045', NULL, 'male', 22, 'social_media', 'not_interested', 'Boxing', 'We dont offer boxing classes', NOW() - interval '20 days', NOW() - interval '28 days'),
  (gym, 'Komal Shetty', '9812345046', 'komal.s@outlook.com', 'female', 36, 'advertisement', 'not_interested', 'Weight loss', 'Decided to hire home trainer instead', NOW() - interval '12 days', NOW() - interval '22 days');

-- LOST leads (4)
INSERT INTO leads (gym_id, full_name, phone, email, gender, age, source, status, interest, notes, last_contacted_at, created_at)
VALUES
  (gym, 'Pratik Sharma', '9812345047', NULL, 'male', 33, 'referral', 'lost', 'Weight training', 'Joined competitor gym', NOW() - interval '20 days', NOW() - interval '40 days'),
  (gym, 'Jyoti Menon', '9812345048', 'jyoti.m@gmail.com', 'female', 30, 'website', 'lost', 'Yoga', 'Number not reachable after 5 attempts', NOW() - interval '25 days', NOW() - interval '45 days'),
  (gym, 'Harsh Verma', '9812345049', NULL, 'male', 27, 'walk_in', 'lost', 'CrossFit', 'Relocated to another city', NOW() - interval '30 days', NOW() - interval '50 days'),
  (gym, 'Sonali Ghosh', '9812345050', 'sonali.g@yahoo.com', 'female', 24, 'phone', 'lost', 'Dance fitness', 'No response after multiple follow-ups', NOW() - interval '35 days', NOW() - interval '55 days');

-- ============================================
-- Seed: Activity history for some leads
-- ============================================

-- Get some lead IDs for activities
FOR lid IN SELECT lead_id FROM leads WHERE gym_id = gym AND status IN ('contacted', 'interested', 'follow_up', 'trial', 'converted') LIMIT 20
LOOP
  -- First call
  INSERT INTO lead_activities (lead_id, gym_id, type, disposition, notes, created_at)
  VALUES (lid, gym, 'call', 'Connected - Interested', 'Explained membership plans and facilities', NOW() - interval '10 days');

  -- Follow up WhatsApp
  INSERT INTO lead_activities (lead_id, gym_id, type, notes, created_at)
  VALUES (lid, gym, 'whatsapp', 'Sent gym brochure and rate card PDF', NOW() - interval '8 days');

  -- Second call
  INSERT INTO lead_activities (lead_id, gym_id, type, disposition, notes, created_at)
  VALUES (lid, gym, 'call', 'Connected - Call Back Later', 'Was busy at work, asked to call after 6 PM', NOW() - interval '5 days');

  -- Visit
  INSERT INTO lead_activities (lead_id, gym_id, type, notes, created_at)
  VALUES (lid, gym, 'visit', 'Visited gym for facility tour, impressed with equipment', NOW() - interval '3 days');
END LOOP;

-- Extra activities for converted leads
FOR lid IN SELECT lead_id FROM leads WHERE gym_id = gym AND status = 'converted'
LOOP
  INSERT INTO lead_activities (lead_id, gym_id, type, notes, created_at)
  VALUES (lid, gym, 'converted', 'Lead converted to member successfully', NOW() - interval '2 days');
END LOOP;

-- Extra activities for trial leads
FOR lid IN SELECT lead_id FROM leads WHERE gym_id = gym AND status = 'trial'
LOOP
  INSERT INTO lead_activities (lead_id, gym_id, type, disposition, notes, created_at)
  VALUES (lid, gym, 'call', 'Trial Scheduled', 'Scheduled 3-day free trial', NOW() - interval '4 days');
END LOOP;

END $$;
