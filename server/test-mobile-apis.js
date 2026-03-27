import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://localhost:5000/api/v1';
const json = { 'Content-Type': 'application/json' };
const auth = (t) => ({ ...json, Authorization: 'Bearer ' + t });

let pass = 0, fail = 0;

async function test(num, name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${num}. ${name} — ${result}`);
    pass++;
  } catch (e) {
    console.log(`❌ ${num}. ${name} — ${e.message}`);
    fail++;
  }
}

async function run() {
  // Login
  const loginRes = await fetch(BASE + '/auth/login', { method: 'POST', headers: json, body: JSON.stringify({ email: 'deepak.rao94@gmail.com', password: 'Member@2026' }) });
  const loginData = await loginRes.json();
  if (!loginData.success) { console.log('LOGIN FAILED:', loginData.message); return; }
  const token = loginData.data.accessToken;
  console.log('Logged in as:', loginData.data.user.full_name, '(role:', loginData.data.user.role + ')\n');

  const get = async (path) => { const r = await fetch(BASE + path, { headers: auth(token) }); return r.json(); };
  const post = async (path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: auth(token), body: JSON.stringify(body) }); return r.json(); };
  const patch = async (path, body) => { const r = await fetch(BASE + path, { method: 'PATCH', headers: auth(token), body: JSON.stringify(body) }); return r.json(); };

  await test(1, 'GET /mobile/profile', async () => {
    const d = await get('/mobile/profile');
    if (!d.success) throw new Error(d.message);
    return `${d.data.member.full_name}, gym: ${d.data.gym?.name}, sub: ${d.data.subscription?.plan_name || 'none'}`;
  });

  await test(2, 'GET /mobile/gym/branding', async () => {
    const d = await get('/mobile/gym/branding');
    if (!d.success) throw new Error(d.message);
    return `${d.data.name}, color: ${d.data.branding?.primary_color}`;
  });

  await test(3, 'PATCH /mobile/profile', async () => {
    const d = await patch('/mobile/profile', { goal: 'muscle_gain', height: 175 });
    if (!d.success) throw new Error(d.message);
    return `goal: ${d.data.goal}`;
  });

  await test(4, 'POST /mobile/profile/onboarding', async () => {
    const d = await post('/mobile/profile/onboarding', { height: 175, weight: 73, goal: 'muscle_gain', dietary_pref: 'non_veg' });
    if (!d.success) throw new Error(d.message);
    return 'onboarding completed';
  });

  await test(5, 'GET /mobile/workout/today', async () => {
    const d = await get('/mobile/workout/today');
    if (!d.success) throw new Error(d.message);
    return `rest: ${d.data.is_rest_day}, exercises: ${d.data.exercises?.length || 0}, plan: ${d.data.plan_name || 'none'}`;
  });

  await test(6, 'GET /mobile/workout/week', async () => {
    const d = await get('/mobile/workout/week');
    if (!d.success) throw new Error(d.message);
    return `plan: ${d.data.plan?.name || 'none'}, days: ${d.data.days?.length || 0}`;
  });

  await test(7, 'POST /mobile/workout/log', async () => {
    const d = await post('/mobile/workout/log', {
      exercises_done: [
        { name: 'Bench Press', sets_completed: 4, reps: [12, 10, 8, 8], weight_kg: [40, 45, 50, 50] },
        { name: 'Squat', sets_completed: 3, reps: [10, 10, 8] },
      ],
      duration_minutes: 45,
      feeling_score: 3,
    });
    if (!d.success) throw new Error(d.message);
    return `log_id: ${d.data.log_id?.substring(0, 8)}`;
  });

  await test(8, 'GET /mobile/workout/history', async () => {
    const d = await get('/mobile/workout/history');
    if (!d.success) throw new Error(d.message);
    return `total: ${d.data.summary?.total_workouts}, this_week: ${d.data.summary?.this_week}`;
  });

  await test(9, 'GET /mobile/workout/prs', async () => {
    const d = await get('/mobile/workout/prs');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} personal records`;
  });

  await test(10, 'GET /mobile/diet/plan', async () => {
    const d = await get('/mobile/diet/plan');
    if (!d.success) throw new Error(d.message);
    return d.data ? `source: ${d.data.source}, days: ${d.data.week_data?.days?.length || 0}` : 'no plan';
  });

  await test(11, 'GET /mobile/subscription', async () => {
    const d = await get('/mobile/subscription');
    if (!d.success) throw new Error(d.message);
    return `active: ${d.data.active}, plan: ${d.data.subscription?.plan_name || 'none'}, days_left: ${d.data.subscription?.days_remaining || 0}`;
  });

  await test(12, 'GET /mobile/subscription/history', async () => {
    const d = await get('/mobile/subscription/history');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} subscriptions`;
  });

  await test(13, 'GET /mobile/announcements', async () => {
    const d = await get('/mobile/announcements');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} announcements`;
  });

  await test(14, 'GET /mobile/metrics', async () => {
    const d = await get('/mobile/metrics');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} metrics`;
  });

  await test(15, 'POST /mobile/metrics', async () => {
    const d = await post('/mobile/metrics', { weight: 73.5, body_fat_pct: 18.2 });
    if (!d.success) throw new Error(d.message);
    return `metric_id: ${d.data.metric_id?.substring(0, 8)}`;
  });

  await test(16, 'GET /mobile/streak', async () => {
    const d = await get('/mobile/streak');
    if (!d.success) throw new Error(d.message);
    return `current: ${d.data.current_streak}, longest: ${d.data.longest_streak}, badges: ${d.data.badges?.length || 0}`;
  });

  await test(17, 'GET /mobile/badges', async () => {
    const d = await get('/mobile/badges');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} badges`;
  });

  await test(18, 'GET /mobile/water/today', async () => {
    const d = await get('/mobile/water/today');
    if (!d.success) throw new Error(d.message);
    return `glasses: ${d.data.glasses_count}`;
  });

  await test(19, 'POST /mobile/water/log', async () => {
    const d = await post('/mobile/water/log', { glasses: 2 });
    if (!d.success) throw new Error(d.message);
    return `total glasses: ${d.data.glasses_count}`;
  });

  await test(20, 'POST /mobile/push-token', async () => {
    const d = await post('/mobile/push-token', { device_token: 'ExponentPushToken[test123]', platform: 'android' });
    if (!d.success) throw new Error(d.message);
    return 'token registered';
  });

  await test(21, 'POST /mobile/ai/chat', async () => {
    const d = await post('/mobile/ai/chat', { message: 'What should I eat before workout?' });
    if (!d.success) throw new Error(d.message);
    return `reply: ${d.data.reply?.substring(0, 60)}... remaining: ${d.data.messages_remaining}`;
  });

  await test(22, 'GET /mobile/ai/chat/history', async () => {
    const d = await get('/mobile/ai/chat/history');
    if (!d.success) throw new Error(d.message);
    return `${d.data?.length || 0} sessions`;
  });

  await test(23, 'GET /mobile/ai/tip', async () => {
    const d = await get('/mobile/ai/tip');
    if (!d.success) throw new Error(d.message);
    return `type: ${d.data.type}, tip: ${d.data.tip?.substring(0, 50)}...`;
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
}

run().catch(e => console.error('Fatal:', e.message));
