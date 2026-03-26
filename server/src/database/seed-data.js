import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GYM_ID = 'd8b941c5-4630-4cd9-969d-d9def6e09e03';

// ─── Helpers ──────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const daysAgo = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString(); };
const pastDate = (maxDaysAgo) => daysAgo(randInt(0, maxDaysAgo));

const maleFirst = ['Aarav','Vivaan','Aditya','Arjun','Rohan','Karan','Vihaan','Sai','Ansh','Ishaan','Reyansh','Ayaan','Krishna','Pranav','Atharva','Dhruv','Kabir','Ritvik','Yash','Nikhil','Raj','Amit','Suresh','Vikram','Ravi','Mohan','Deepak','Rahul','Sachin','Ajay','Manish','Pankaj','Gaurav','Sanjay','Harsh','Tarun','Varun','Kunal','Aman','Tushar','Akash','Nilesh','Jayesh','Pratik','Vishal','Omkar','Shubham','Abhishek','Siddharth','Tejas'];
const femaleFirst = ['Aadhya','Ananya','Diya','Myra','Sara','Aanya','Isha','Kavya','Navya','Riya','Priya','Sneha','Pooja','Meera','Nisha','Anjali','Shruti','Tanya','Komal','Swati','Neha','Pallavi','Divya','Sonal','Archana','Tanvi','Radhika','Madhuri','Simran','Jyoti','Nikita','Rina','Sonali','Preeti','Rekha','Alka','Bhavna','Chitra','Deepika','Garima'];
const lastNames = ['Sharma','Patel','Singh','Kumar','Gupta','Verma','Joshi','Reddy','Nair','Menon','Iyer','Rao','Mishra','Tiwari','Pandey','Dubey','Yadav','Srivastava','Agarwal','Malhotra','Chopra','Mehta','Shah','Desai','Kulkarni','Patil','Bhat','Hegde','Pillai','Kaur','Gill','Bose','Das','Sen','Mukherjee','Banerjee','Chatterjee','Ghosh','Dey','Roy'];

function genName(gender) {
  const first = gender === 'male' ? pick(maleFirst) : pick(femaleFirst);
  return `${first} ${pick(lastNames)}`;
}
function genPhone() { return `${pick(['6','7','8','9'])}${Array.from({length:9},()=>randInt(0,9)).join('')}`; }
function genEmail(name) { return name.toLowerCase().replace(/\s+/g,'.') + randInt(1,99) + pick(['@gmail.com','@yahoo.com','@outlook.com']); }

// ─── Data Generators ──────────────────────────────────
function generateMembers(count) {
  const members = [];
  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.35 ? 'male' : 'female';
    const name = genName(gender);
    const createdDaysAgo = randInt(0, 180); // spread over 6 months
    members.push({
      member_id: uuidv4(),
      gym_id: GYM_ID,
      full_name: name,
      email: genEmail(name),
      phone: genPhone(),
      dob: `${randInt(1970, 2006)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,
      gender,
      height: randFloat(150, 190),
      weight: randFloat(45, 120),
      goal: pick(['weight_loss','muscle_gain','endurance','flexibility','general_fitness']),
      dietary_pref: pick(['veg','non_veg','vegan','eggetarian']),
      medical_notes: Math.random() > 0.85 ? pick(['Mild asthma','Knee injury - avoid heavy squats','Diabetic - Type 2','Lower back pain','Hypertension - monitor BP','None']) : null,
      emergency_contact_name: genName(pick(['male','female'])),
      emergency_contact_phone: genPhone(),
      created_at: daysAgo(createdDaysAgo),
    });
  }
  return members;
}

function generateSubPlans() {
  return [
    { plan_id: uuidv4(), gym_id: GYM_ID, name: 'Monthly Basic', duration_days: 30, price: 999, description: 'Basic monthly gym access', features: JSON.stringify(['Gym access','Locker facility']), is_active: true },
    { plan_id: uuidv4(), gym_id: GYM_ID, name: 'Quarterly', duration_days: 90, price: 2499, description: '3-month gym membership', features: JSON.stringify(['Gym access','Locker','Group classes']), is_active: true },
    { plan_id: uuidv4(), gym_id: GYM_ID, name: 'Half-Yearly', duration_days: 180, price: 4499, description: '6-month membership with perks', features: JSON.stringify(['Gym access','Locker','Group classes','Diet consultation']), is_active: true },
    { plan_id: uuidv4(), gym_id: GYM_ID, name: 'Annual', duration_days: 365, price: 7999, description: 'Best value yearly plan', features: JSON.stringify(['All access','Personal trainer 2x/week','Diet plan','Free merchandise']), is_active: true },
    { plan_id: uuidv4(), gym_id: GYM_ID, name: 'Premium Monthly', duration_days: 30, price: 1999, description: 'Premium monthly with trainer', features: JSON.stringify(['All access','Personal trainer daily','Custom diet plan','Supplements discount']), is_active: true },
  ];
}

function generateSubscriptions(members, plans) {
  const subs = [];
  const payments = [];
  const statusDist = [];
  // 140 active, 30 expired, 15 paused, 15 cancelled
  for (let i = 0; i < 140; i++) statusDist.push('active');
  for (let i = 0; i < 30; i++) statusDist.push('expired');
  for (let i = 0; i < 15; i++) statusDist.push('paused');
  for (let i = 0; i < 15; i++) statusDist.push('cancelled');

  members.forEach((member, idx) => {
    const plan = pick(plans);
    const status = statusDist[idx] || 'active';
    const startDaysAgo = randInt(10, 180);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDaysAgo);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const subId = uuidv4();
    const sub = {
      sub_id: subId,
      member_id: member.member_id,
      gym_id: GYM_ID,
      plan_id: plan.plan_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status,
      pause_days: 0,
      created_at: startDate.toISOString(),
    };

    if (status === 'paused') {
      sub.paused_at = daysAgo(randInt(1, 20));
      sub.pause_days = randInt(5, 30);
    }
    if (status === 'cancelled') {
      sub.cancelled_at = daysAgo(randInt(1, 30));
      sub.cancel_reason = pick(['Relocating to another city','Financial reasons','Not satisfied with facilities','Health issues','Found a closer gym','Personal reasons']);
    }
    if (status === 'expired') {
      // Make sure end_date is in the past
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - randInt(1, 60));
      sub.end_date = pastEnd.toISOString();
    }

    subs.push(sub);

    // Payment for this subscription
    const mode = pick(['cash','upi','card','bank_transfer']);
    payments.push({
      payment_id: uuidv4(),
      sub_id: subId,
      member_id: member.member_id,
      gym_id: GYM_ID,
      amount: plan.price,
      mode,
      reference_id: mode !== 'cash' ? `TXN${Date.now().toString(36).toUpperCase()}${randInt(1000,9999)}` : null,
      paid_at: startDate.toISOString(),
      notes: mode === 'cash' ? 'Cash collected at front desk' : null,
      created_at: startDate.toISOString(),
    });
  });

  return { subs, payments };
}

function generateWorkoutPlans() {
  const exercises = {
    weight_training: ['Bench Press','Deadlift','Squat','Overhead Press','Barbell Row','Dumbbell Curl','Tricep Pushdown','Lateral Raise','Leg Press','Calf Raise','Chest Fly','Cable Crossover','Hammer Curl','Skull Crushers','Shrugs','Romanian Deadlift','Lunges','Leg Curl','Leg Extension','Face Pull'],
    cardio: ['Treadmill Run','Cycling','Rowing Machine','Jump Rope','Stair Climber','Elliptical','Battle Ropes','Box Jumps','Burpees','Mountain Climbers'],
    yoga: ['Sun Salutation','Warrior I','Warrior II','Tree Pose','Downward Dog','Cobra Pose','Triangle Pose','Bridge Pose','Child Pose','Plank Hold','Boat Pose','Pigeon Pose'],
    hiit: ['Burpees','Box Jumps','Kettlebell Swings','Thrusters','Wall Balls','Battle Ropes','Sled Push','Medicine Ball Slam','Jump Squats','Sprint Intervals'],
  };

  const planDefs = [
    { name: 'Beginner Full Body', type: 'weight_training', difficulty: 'beginner', goal_tags: ['general_fitness','muscle_gain'] },
    { name: 'Advanced Push Pull Legs', type: 'weight_training', difficulty: 'advanced', goal_tags: ['muscle_gain'] },
    { name: 'Fat Burner HIIT', type: 'hiit', difficulty: 'intermediate', goal_tags: ['weight_loss','endurance'] },
    { name: 'Morning Yoga Flow', type: 'yoga', difficulty: 'beginner', goal_tags: ['flexibility','general_fitness'] },
    { name: 'Cardio Blast', type: 'cardio', difficulty: 'intermediate', goal_tags: ['weight_loss','endurance'] },
    { name: 'Strength & Conditioning', type: 'mixed', difficulty: 'intermediate', goal_tags: ['muscle_gain','endurance'] },
    { name: 'CrossFit WOD', type: 'crossfit', difficulty: 'advanced', goal_tags: ['endurance','muscle_gain'] },
    { name: 'Bodyweight Basics', type: 'calisthenics', difficulty: 'beginner', goal_tags: ['general_fitness','flexibility'] },
  ];

  const plans = [];
  const days = [];
  const exList = [];

  for (const def of planDefs) {
    const planId = uuidv4();
    plans.push({
      plan_id: planId,
      gym_id: GYM_ID,
      name: def.name,
      type: def.type,
      difficulty: def.difficulty,
      goal_tags: JSON.stringify(def.goal_tags),
    });

    for (let d = 1; d <= 7; d++) {
      const isRest = d === 4 || d === 7; // Wed and Sun rest
      const dayId = uuidv4();
      days.push({ day_id: dayId, plan_id: planId, day_number: d, is_rest_day: isRest });

      if (!isRest) {
        const pool = exercises[def.type] || exercises.weight_training;
        const count = randInt(4, 7);
        for (let e = 0; e < count; e++) {
          exList.push({
            exercise_id: uuidv4(),
            day_id: dayId,
            name: pool[e % pool.length],
            sets: randInt(3, 5),
            reps: `${randInt(8, 15)}`,
            duration_seconds: def.type === 'cardio' || def.type === 'yoga' ? randInt(30, 120) : null,
            rest_seconds: randInt(30, 90),
            notes: Math.random() > 0.7 ? pick(['Focus on form','Slow eccentric','Increase weight weekly','Breathe deeply']) : null,
            order_index: e + 1,
          });
        }
      }
    }
  }

  return { plans, days, exercises: exList };
}

function generateDietPlans(members) {
  const dietPlans = [];
  const mealNames = {
    breakfast: ['Oats with banana and nuts','Poha with peanuts','Egg white omelette with toast','Idli sambar','Upma with vegetables','Smoothie bowl','Besan chilla'],
    lunch: ['Brown rice with dal and sabzi','Chicken breast with quinoa','Paneer tikka with roti','Rajma chawal','Fish curry with rice','Chole roti','Tofu stir fry with rice'],
    dinner: ['Grilled chicken salad','Paneer bhurji with roti','Moong dal with jeera rice','Vegetable soup with multigrain bread','Egg curry with chapati','Mixed veg dal khichdi','Sprouts salad with soup'],
    snacks: ['Greek yogurt with berries','Handful of almonds','Protein shake','Fruit salad','Roasted makhana','Peanut butter toast','Sprout chaat'],
  };

  const selectedMembers = members.slice(0, 30);
  for (const member of selectedMembers) {
    const weekData = { days: [] };
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    for (let d = 0; d < 7; d++) {
      const cals = randInt(1600, 2800);
      weekData.days.push({
        day: d + 1,
        day_name: dayNames[d],
        meals: {
          breakfast: { name: pick(mealNames.breakfast), calories: randInt(300, 500), protein_g: randInt(15, 35), carbs_g: randInt(30, 60), fat_g: randInt(5, 20) },
          lunch: { name: pick(mealNames.lunch), calories: randInt(400, 700), protein_g: randInt(20, 45), carbs_g: randInt(40, 80), fat_g: randInt(10, 25) },
          dinner: { name: pick(mealNames.dinner), calories: randInt(350, 600), protein_g: randInt(20, 40), carbs_g: randInt(30, 60), fat_g: randInt(8, 20) },
          snacks: { name: pick(mealNames.snacks), calories: randInt(150, 300), protein_g: randInt(8, 20), carbs_g: randInt(15, 40), fat_g: randInt(5, 15) },
        },
        daily_totals: { calories: cals, protein_g: randInt(80, 180), carbs_g: randInt(150, 350), fat_g: randInt(40, 90) },
      });
    }

    dietPlans.push({
      diet_id: uuidv4(),
      member_id: member.member_id,
      gym_id: GYM_ID,
      source: Math.random() > 0.5 ? 'ai' : 'manual',
      week_data: JSON.stringify(weekData),
      created_at: pastDate(60),
    });
  }
  return dietPlans;
}

function generateBodyMetrics(members) {
  const metrics = [];
  for (const member of members) {
    const baseWeight = member.weight || 70;
    const height = member.height || 170;
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      const w = parseFloat((baseWeight + randFloat(-3, 3)).toFixed(1));
      const bmi = parseFloat((w / ((height / 100) ** 2)).toFixed(1));
      metrics.push({
        metric_id: uuidv4(),
        member_id: member.member_id,
        weight: w,
        bmi,
        body_fat_pct: randFloat(10, 35),
        recorded_at: daysAgo(i * randInt(20, 40)),
      });
    }
  }
  return metrics;
}

function generateAnnouncements() {
  return [
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Gym Timings Updated', message: 'We are now open from 5 AM to 11 PM on weekdays. Saturday hours remain 6 AM to 9 PM.', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(2), created_at: daysAgo(2) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'New Zumba Classes!', message: 'Starting this Monday, join our Zumba classes every Mon/Wed/Fri at 7 PM. Free for all members!', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(5), created_at: daysAgo(5) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Annual Day Celebration', message: 'Join us for our 2nd Anniversary celebration on April 15th. Games, prizes, and refreshments!', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(8), created_at: daysAgo(8) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Equipment Maintenance Notice', message: 'The cardio section will be under maintenance on Sunday from 2 PM - 6 PM. We apologize for the inconvenience.', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(12), created_at: daysAgo(12) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Refer & Earn Program', message: 'Refer a friend and get 1 month free! Your friend gets 20% off on their first subscription. T&C apply.', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(15), created_at: daysAgo(15) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Summer Body Challenge', message: 'Join our 8-week Summer Body Challenge starting April 1st. Prizes worth ₹50,000 for winners!', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(20), created_at: daysAgo(20) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Personal Training Discount', message: 'Get 30% off on personal training packages this month. Limited slots available!', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(25), created_at: daysAgo(25) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Holiday Schedule', message: 'The gym will remain open on Holi (March 14) with reduced hours: 8 AM - 2 PM.', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(30), created_at: daysAgo(30) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'Protein Supplements Available', message: 'We now stock premium whey protein, BCAAs, and pre-workout supplements at the front desk. Members get 15% off!', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(35), created_at: daysAgo(35) },
    { announcement_id: uuidv4(), gym_id: GYM_ID, title: 'WiFi Password Changed', message: 'New WiFi password: FitGym@2026. Connect to "Vijays-Gym-5G" network.', target_type: 'all', target_ids: JSON.stringify([]), sent_at: daysAgo(40), created_at: daysAgo(40) },
  ];
}

async function generateStaff() {
  const hash = await bcrypt.hash('Staff@2026', 12);
  const staffDefs = [
    { full_name: 'Arjun Mehta', email: 'arjun.trainer@gmail.com', phone: genPhone(), staff_role: 'trainer', specialization: 'Weight Training & Bodybuilding' },
    { full_name: 'Priya Nair', email: 'priya.trainer@gmail.com', phone: genPhone(), staff_role: 'trainer', specialization: 'Yoga & Flexibility' },
    { full_name: 'Karan Singh', email: 'karan.trainer@gmail.com', phone: genPhone(), staff_role: 'trainer', specialization: 'CrossFit & HIIT' },
    { full_name: 'Sneha Reddy', email: 'sneha.trainer@gmail.com', phone: genPhone(), staff_role: 'trainer', specialization: 'Cardio & Weight Loss' },
    { full_name: 'Rohit Sharma', email: 'rohit.trainer@gmail.com', phone: genPhone(), staff_role: 'trainer', specialization: 'Strength & Conditioning' },
    { full_name: 'Anjali Desai', email: 'anjali.frontdesk@gmail.com', phone: genPhone(), staff_role: 'front_desk', specialization: null },
    { full_name: 'Deepak Verma', email: 'deepak.frontdesk@gmail.com', phone: genPhone(), staff_role: 'front_desk', specialization: null },
  ];

  return staffDefs.map(s => ({
    user_id: uuidv4(),
    gym_id: GYM_ID,
    email: s.email,
    password_hash: hash,
    role: 'staff',
    full_name: s.full_name,
    phone: s.phone,
    specialization: s.specialization,
    staff_role: s.staff_role,
    is_active: true,
  }));
}

// ─── Batch Insert Helper ──────────────────────────────
async function batchInsert(table, rows, batchSize = 50) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  Error inserting into ${table} (batch ${Math.floor(i/batchSize)+1}):`, error.message);
      // Try one by one to find the problematic row
      for (const row of batch) {
        const { error: singleErr } = await supabase.from(table).insert(row);
        if (singleErr) console.error(`    Row error:`, singleErr.message, 'row:', JSON.stringify(row).substring(0, 100));
      }
    }
  }
}

// ─── Main Seed Function ───────────────────────────────
async function seed() {
  console.log('🌱 Starting FitSaaS data seeding...\n');

  // 1. Subscription Plans
  console.log('📋 Creating subscription plans...');
  const plans = generateSubPlans();
  await batchInsert('subscription_plans', plans);
  console.log(`   ✅ ${plans.length} plans created`);

  // 2. Members
  console.log('👥 Creating 200 members...');
  const members = generateMembers(200);
  await batchInsert('members', members);
  console.log(`   ✅ ${members.length} members created`);

  // 3. Subscriptions & Payments
  console.log('💳 Creating subscriptions & payments...');
  const { subs, payments } = generateSubscriptions(members, plans);
  await batchInsert('member_subscriptions', subs);
  console.log(`   ✅ ${subs.length} subscriptions created`);
  await batchInsert('payments', payments);
  console.log(`   ✅ ${payments.length} payments created`);

  // 4. Workout Plans
  console.log('🏋️ Creating workout plans...');
  const { plans: wPlans, days, exercises } = generateWorkoutPlans();
  await batchInsert('workout_plans', wPlans);
  await batchInsert('workout_days', days);
  await batchInsert('workout_exercises', exercises);
  console.log(`   ✅ ${wPlans.length} workout plans, ${days.length} days, ${exercises.length} exercises`);

  // 5. Workout Assignments (assign to first 100 members)
  console.log('📌 Assigning workouts to members...');
  const assignments = members.slice(0, 100).map(m => ({
    assignment_id: uuidv4(),
    member_id: m.member_id,
    plan_id: pick(wPlans).plan_id,
    start_date: new Date().toISOString().split('T')[0],
  }));
  await batchInsert('member_workout_assignments', assignments);
  console.log(`   ✅ ${assignments.length} workout assignments`);

  // 6. Diet Plans
  console.log('🥗 Creating diet plans...');
  const dietPlans = generateDietPlans(members);
  await batchInsert('diet_plans', dietPlans);
  console.log(`   ✅ ${dietPlans.length} diet plans created`);

  // 7. Body Metrics
  console.log('📊 Creating body metrics...');
  const metrics = generateBodyMetrics(members);
  await batchInsert('body_metrics', metrics);
  console.log(`   ✅ ${metrics.length} metric entries created`);

  // 8. Announcements
  console.log('📢 Creating announcements...');
  const announcements = generateAnnouncements();
  await batchInsert('announcements', announcements);
  console.log(`   ✅ ${announcements.length} announcements created`);

  // 9. Staff
  console.log('👨‍💼 Creating staff members...');
  const staff = await generateStaff();
  await batchInsert('users', staff);
  console.log(`   ✅ ${staff.length} staff members created`);

  // 10. Trainer-Member Assignments
  console.log('🔗 Assigning members to trainers...');
  const trainers = staff.filter(s => s.staff_role === 'trainer');
  const trainerAssignments = [];
  members.slice(0, 80).forEach((m, idx) => {
    const trainer = trainers[idx % trainers.length];
    trainerAssignments.push({
      assignment_id: uuidv4(),
      trainer_id: trainer.user_id,
      member_id: m.member_id,
      gym_id: GYM_ID,
    });
  });
  await batchInsert('trainer_member_assignments', trainerAssignments);
  console.log(`   ✅ ${trainerAssignments.length} trainer assignments`);

  console.log('\n🎉 Seeding complete! Your gym now has:');
  console.log(`   • 200 members (spread over 6 months)`);
  console.log(`   • 5 subscription plans`);
  console.log(`   • 200 subscriptions (140 active, 30 expired, 15 paused, 15 cancelled)`);
  console.log(`   • 200 payments`);
  console.log(`   • 8 workout plans with full exercise schedules`);
  console.log(`   • 100 workout assignments`);
  console.log(`   • 30 AI/manual diet plans`);
  console.log(`   • ~700 body metric entries`);
  console.log(`   • 10 announcements`);
  console.log(`   • 7 staff (5 trainers + 2 front desk)`);
  console.log(`   • 80 trainer-member assignments`);
}

seed().catch(console.error);
