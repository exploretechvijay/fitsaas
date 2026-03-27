import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';

class MobileService {
  // ─── Profile ──────────────────────────────────────────
  async getProfile(memberId, gymId) {
    // Fetch member
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .single();
    if (error || !member) throw ApiError.notFound('Member not found');

    // Fetch gym branding
    const { data: gym } = await supabaseAdmin
      .from('tenants')
      .select('name, logo_url, branding')
      .eq('gym_id', gymId)
      .single();

    // Fetch active subscription
    const { data: subs } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, subscription_plans(name, price, duration_days)')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1);

    const activeSub = subs?.[0];
    let subscription = null;
    if (activeSub) {
      const daysRemaining = Math.max(0, Math.ceil((new Date(activeSub.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
      subscription = {
        sub_id: activeSub.sub_id,
        plan_name: activeSub.subscription_plans?.name,
        price: activeSub.subscription_plans?.price,
        status: activeSub.status,
        start_date: activeSub.start_date,
        end_date: activeSub.end_date,
        days_remaining: daysRemaining,
      };
    }

    // Fetch streak
    const { data: streak } = await supabaseAdmin
      .from('member_streaks')
      .select('current_streak, longest_streak, last_workout_date')
      .eq('member_id', memberId)
      .single();

    // Fetch assigned trainer
    const { data: trainerAssignment } = await supabaseAdmin
      .from('trainer_member_assignments')
      .select('users(full_name, phone, specialization)')
      .eq('member_id', memberId)
      .limit(1);

    const trainer = trainerAssignment?.[0]?.users || null;

    return {
      member,
      gym: gym ? { name: gym.name, logo_url: gym.logo_url, branding: gym.branding } : null,
      subscription,
      streak: streak ? { current: streak.current_streak, longest: streak.longest_streak } : { current: 0, longest: 0 },
      trainer,
    };
  }

  async updateProfile(memberId, gymId, updates) {
    const allowedFields = ['full_name', 'phone', 'dob', 'gender', 'height', 'weight', 'goal', 'dietary_pref', 'photo_url', 'medical_notes'];
    const updateData = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) updateData[key] = updates[key];
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('members')
      .update(updateData)
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update profile');

    // Log body metrics if weight changed
    if (updates.weight) {
      const height = updates.height || data.height;
      const bmi = updates.weight && height ? parseFloat((updates.weight / ((height / 100) ** 2)).toFixed(1)) : null;
      await supabaseAdmin.from('body_metrics').insert({
        metric_id: uuidv4(), member_id: memberId,
        weight: updates.weight, bmi, recorded_at: new Date().toISOString(),
      });
    }

    return data;
  }

  async completeOnboarding(memberId, gymId, data) {
    // Update member profile
    await this.updateProfile(memberId, gymId, {
      height: data.height,
      weight: data.weight,
      goal: data.goal,
      dietary_pref: data.dietary_pref,
    });

    return { message: 'Onboarding completed', member_id: memberId };
  }

  async getGymBranding(gymId) {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('name, logo_url, branding, business_hours')
      .eq('gym_id', gymId)
      .single();
    if (error || !data) throw ApiError.notFound('Gym not found');
    return data;
  }

  // ─── Workout ──────────────────────────────────────────
  async getTodayWorkout(memberId, gymId) {
    // Get latest assignment
    const { data: assignments } = await supabaseAdmin
      .from('member_workout_assignments')
      .select('*, workout_plans(plan_id, name, type, difficulty, goal_tags)')
      .eq('member_id', memberId)
      .order('start_date', { ascending: false })
      .limit(1);

    const assignment = assignments?.[0];
    if (!assignment) return { is_rest_day: true, message: 'No workout plan assigned yet', plan: null, exercises: [] };

    const plan = assignment.workout_plans;
    const dayOfWeek = new Date().getDay() || 7; // 1=Mon..7=Sun

    // Get today's day
    const { data: dayData } = await supabaseAdmin
      .from('workout_days')
      .select('*, workout_exercises(*)')
      .eq('plan_id', plan.plan_id)
      .eq('day_number', dayOfWeek)
      .single();

    if (!dayData || dayData.is_rest_day) {
      return { is_rest_day: true, day_number: dayOfWeek, plan_name: plan.name, plan_type: plan.type, exercises: [] };
    }

    // Sort exercises
    const exercises = (dayData.workout_exercises || []).sort((a, b) => a.order_index - b.order_index);

    // Check if already logged today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLog } = await supabaseAdmin
      .from('member_workout_logs')
      .select('log_id, completed_at, duration_minutes, feeling_score')
      .eq('member_id', memberId)
      .eq('date', today)
      .single();

    return {
      is_rest_day: false,
      day_number: dayOfWeek,
      plan_id: plan.plan_id,
      plan_name: plan.name,
      plan_type: plan.type,
      difficulty: plan.difficulty,
      estimated_duration_min: exercises.reduce((s, e) => s + ((e.sets || 3) * ((e.rest_seconds || 60) + 30)) / 60, 0) | 0,
      exercises,
      already_logged: !!existingLog,
      previous_log: existingLog || null,
    };
  }

  async getWeekPlan(memberId) {
    const { data: assignments } = await supabaseAdmin
      .from('member_workout_assignments')
      .select('*, workout_plans(plan_id, name, type, difficulty)')
      .eq('member_id', memberId)
      .order('start_date', { ascending: false })
      .limit(1);

    const assignment = assignments?.[0];
    if (!assignment) return { plan: null, days: [] };

    const plan = assignment.workout_plans;
    const { data: days } = await supabaseAdmin
      .from('workout_days')
      .select('*, workout_exercises(*)')
      .eq('plan_id', plan.plan_id)
      .order('day_number', { ascending: true });

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const formattedDays = (days || []).map(d => ({
      ...d,
      day_name: dayNames[d.day_number] || `Day ${d.day_number}`,
      exercise_count: d.is_rest_day ? 0 : (d.workout_exercises || []).length,
      workout_exercises: d.is_rest_day ? [] : (d.workout_exercises || []).sort((a, b) => a.order_index - b.order_index),
    }));

    return { plan, days: formattedDays };
  }

  async logWorkout(memberId, gymId, data) {
    const logId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    // Calculate estimated calories (rough: 5 cal per set)
    const totalSets = (data.exercises_done || []).reduce((s, e) => s + (e.sets_completed || 0), 0);
    const caloriesEst = data.calories_est || totalSets * 5 + (data.duration_minutes || 30) * 4;

    const { data: log, error } = await supabaseAdmin
      .from('member_workout_logs')
      .insert({
        log_id: logId,
        member_id: memberId,
        gym_id: gymId,
        plan_id: data.plan_id || null,
        day_number: data.day_number || null,
        date: today,
        exercises_done: data.exercises_done || [],
        duration_minutes: data.duration_minutes || null,
        calories_est: caloriesEst,
        feeling_score: data.feeling_score || null,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to log workout: ' + error.message);

    // Insert individual set logs
    if (data.exercises_done) {
      for (const exercise of data.exercises_done) {
        const reps = exercise.reps || [];
        const weights = exercise.weight_kg || [];
        for (let i = 0; i < (exercise.sets_completed || reps.length); i++) {
          await supabaseAdmin.from('member_set_logs').insert({
            set_log_id: uuidv4(),
            log_id: logId,
            exercise_name: exercise.name,
            set_number: i + 1,
            reps_done: reps[i] || null,
            weight_kg: weights[i] || null,
          });
        }
      }
    }

    // Update streak
    await this.updateStreak(memberId);

    return log;
  }

  async getWorkoutHistory(memberId, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs } = await supabaseAdmin
      .from('member_workout_logs')
      .select('date, duration_minutes, calories_est, feeling_score, plan_id, workout_plans(name)')
      .eq('member_id', memberId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Summary
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisWeekLogs = (logs || []).filter(l => new Date(l.date) >= thisWeekStart);

    return {
      logs: (logs || []).map(l => ({
        date: l.date,
        completed: true,
        duration_minutes: l.duration_minutes,
        calories_est: l.calories_est,
        feeling_score: l.feeling_score,
        plan_name: l.workout_plans?.name || null,
      })),
      summary: {
        total_workouts: (logs || []).length,
        this_week: thisWeekLogs.length,
        avg_duration: (logs || []).length > 0 ? Math.round((logs || []).reduce((s, l) => s + (l.duration_minutes || 0), 0) / logs.length) : 0,
        total_calories: (logs || []).reduce((s, l) => s + (l.calories_est || 0), 0),
      },
    };
  }

  // ─── Streak & Badges ──────────────────────────────────
  async updateStreak(memberId) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data: existing } = await supabaseAdmin
      .from('member_streaks')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (existing) {
      let newStreak = existing.current_streak;
      if (existing.last_workout_date === today) {
        return existing; // Already counted today
      } else if (existing.last_workout_date === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1; // Streak broken, start over
      }
      const longest = Math.max(existing.longest_streak, newStreak);

      await supabaseAdmin.from('member_streaks')
        .update({ current_streak: newStreak, longest_streak: longest, last_workout_date: today })
        .eq('member_id', memberId);

      // Check for badges
      await this.checkBadges(memberId, newStreak);

      return { current_streak: newStreak, longest_streak: longest, last_workout_date: today };
    } else {
      await supabaseAdmin.from('member_streaks').insert({
        streak_id: uuidv4(), member_id: memberId,
        current_streak: 1, longest_streak: 1, last_workout_date: today,
      });
      return { current_streak: 1, longest_streak: 1, last_workout_date: today };
    }
  }

  async checkBadges(memberId, streak) {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    for (const m of milestones) {
      if (streak >= m) {
        const badgeType = `streak_${m}`;
        const { data: existing } = await supabaseAdmin
          .from('member_badges')
          .select('badge_id')
          .eq('member_id', memberId)
          .eq('badge_type', badgeType)
          .single();

        if (!existing) {
          await supabaseAdmin.from('member_badges').insert({
            badge_id: uuidv4(), member_id: memberId, badge_type: badgeType,
          });
        }
      }
    }
  }

  async getStreak(memberId) {
    const { data: streak } = await supabaseAdmin
      .from('member_streaks')
      .select('*')
      .eq('member_id', memberId)
      .single();

    const { data: badges } = await supabaseAdmin
      .from('member_badges')
      .select('*')
      .eq('member_id', memberId)
      .order('earned_at', { ascending: false });

    return {
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
      last_workout_date: streak?.last_workout_date || null,
      badges: badges || [],
    };
  }

  // ─── Diet ─────────────────────────────────────────────
  async getCurrentDietPlan(memberId, gymId) {
    const { data, error } = await supabaseAdmin
      .from('diet_plans')
      .select('*')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw ApiError.internal('Failed to fetch diet plan');
    if (!data || data.length === 0) return null;

    const plan = data[0];
    let weekData = plan.week_data;
    if (typeof weekData === 'string') { try { weekData = JSON.parse(weekData); } catch { weekData = {}; } }

    return { ...plan, week_data: weekData };
  }

  async regenerateDietPlan(memberId, gymId, overrides) {
    // Get member profile
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('weight, height, dob, goal, dietary_pref')
      .eq('member_id', memberId)
      .single();

    if (!member) throw ApiError.notFound('Member not found');

    // Calculate age
    let age = 25;
    if (member.dob) {
      age = Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Get Gemini model
    let apiKey = config.gemini.apiKey;
    const { data: gym } = await supabaseAdmin.from('tenants').select('gemini_api_key').eq('gym_id', gymId).single();
    if (gym?.gemini_api_key) apiKey = gym.gemini_api_key;
    if (!apiKey || apiKey === 'your-gemini-api-key') throw ApiError.badRequest('Gemini API key not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const goal = overrides.goal || member.goal || 'general_fitness';
    const dietPref = overrides.dietary_pref || member.dietary_pref || 'non_veg';

    const prompt = `You are an Indian sports nutritionist. Create a 7-day Indian diet plan.
Member: ${member.weight || 70}kg, ${member.height || 170}cm, ${age} years
Goal: ${goal.replace(/_/g, ' ')}, Diet: ${dietPref.replace(/_/g, ' ')}
Use Indian foods (roti, dal, sabzi, rice, paneer, curd, etc). Simple names. Portions in Indian measurements.
Return ONLY valid JSON:
{"days":[{"day":1,"day_name":"Monday","meals":{"breakfast":{"name":"...","items":["item - portion"],"calories":400,"protein_g":30,"carbs_g":45,"fat_g":12},"morning_snack":{...},"lunch":{...},"afternoon_snack":{...},"pre_workout":{...},"post_workout":{...},"dinner":{...}},"daily_totals":{"calories":1900,"protein_g":120,"carbs_g":220,"fat_g":60}}],"notes":"..."}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw ApiError.internal('AI generated invalid response');

    const weekData = JSON.parse(jsonMatch[0]);

    // Save the plan
    const { data: plan, error } = await supabaseAdmin
      .from('diet_plans')
      .insert({
        diet_id: uuidv4(), member_id: memberId, gym_id: gymId,
        source: 'ai', week_data: weekData,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to save diet plan');
    return { ...plan, week_data: weekData };
  }

  // ─── AI Chat ──────────────────────────────────────────
  async chat(memberId, gymId, message, sessionId) {
    // Get member context
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('full_name, weight, height, goal, dietary_pref, dob')
      .eq('member_id', memberId)
      .single();

    // Get or create session
    let session;
    if (sessionId) {
      const { data } = await supabaseAdmin
        .from('ai_chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('member_id', memberId)
        .single();
      session = data;
    }

    if (!session) {
      sessionId = uuidv4();
      const { data, error } = await supabaseAdmin
        .from('ai_chat_sessions')
        .insert({ session_id: sessionId, member_id: memberId, gym_id: gymId, messages: [] })
        .select()
        .single();
      if (error) throw ApiError.internal('Failed to create chat session');
      session = data;
    }

    let messages = session.messages || [];
    if (typeof messages === 'string') { try { messages = JSON.parse(messages); } catch { messages = []; } }

    // Count today's messages
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('session_id', { count: 'exact' })
      .eq('member_id', memberId)
      .gte('created_at', today + 'T00:00:00');

    const dailyLimit = 20;
    const totalMsgToday = messages.filter(m => m.role === 'user' && m.timestamp?.startsWith(today)).length + (todayCount || 0);
    if (totalMsgToday >= dailyLimit) {
      throw ApiError.tooManyRequests('Daily chat limit reached. Try again tomorrow.');
    }

    // Get Gemini
    let apiKey = config.gemini.apiKey;
    const { data: gym } = await supabaseAdmin.from('tenants').select('gemini_api_key').eq('gym_id', gymId).single();
    if (gym?.gemini_api_key) apiKey = gym.gemini_api_key;
    if (!apiKey || apiKey === 'your-gemini-api-key') throw ApiError.badRequest('AI not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let age = 25;
    if (member?.dob) age = Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    const systemPrompt = `You are Alex, a friendly and knowledgeable virtual personal trainer for a gym member.
Member: ${member?.full_name || 'Member'}, Age: ${age}, Weight: ${member?.weight || '?'}kg, Height: ${member?.height || '?'}cm
Goal: ${(member?.goal || 'general fitness').replace(/_/g, ' ')}, Diet: ${(member?.dietary_pref || 'no preference').replace(/_/g, ' ')}
Keep answers concise, practical, motivational. Use simple language. If asked about injuries, recommend consulting a doctor.`;

    // Build conversation history for Gemini
    const history = messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Alex'}: ${m.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nConversation:\n${history}\nUser: ${message}\nAlex:`;

    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text().trim();

    // Update session messages
    const now = new Date().toISOString();
    messages.push({ role: 'user', content: message, timestamp: now });
    messages.push({ role: 'assistant', content: reply, timestamp: now });

    await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ messages })
      .eq('session_id', sessionId);

    return {
      reply,
      session_id: sessionId,
      messages_remaining: Math.max(0, dailyLimit - totalMsgToday - 1),
    };
  }

  async getChatHistory(memberId) {
    const { data } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('session_id, created_at, messages')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(30);

    return (data || []).map(s => {
      let msgs = s.messages;
      if (typeof msgs === 'string') { try { msgs = JSON.parse(msgs); } catch { msgs = []; } }
      return {
        session_id: s.session_id,
        created_at: s.created_at,
        message_count: msgs.length,
        last_message: msgs[msgs.length - 1]?.content?.substring(0, 100) || '',
      };
    });
  }

  async getDailyTip(gymId) {
    let apiKey = config.gemini.apiKey;
    const { data: gym } = await supabaseAdmin.from('tenants').select('gemini_api_key').eq('gym_id', gymId).single();
    if (gym?.gemini_api_key) apiKey = gym.gemini_api_key;
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      return { tip: 'Stay hydrated! Drink at least 8 glasses of water today.', type: 'hydration' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const categories = ['nutrition', 'exercise', 'recovery', 'motivation', 'hydration', 'sleep'];
    const category = categories[new Date().getDate() % categories.length];

    const result = await model.generateContent(
      `Give one short fitness tip (2-3 sentences max) about ${category}. Make it practical and motivational. No emojis.`
    );
    return { tip: result.response.text().trim(), type: category };
  }

  // ─── Subscription ─────────────────────────────────────
  async getSubscription(memberId, gymId) {
    const { data: subs } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, subscription_plans(name, price, duration_days, features)')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1);

    if (!subs || subs.length === 0) return { active: false, subscription: null };

    const sub = subs[0];
    const daysRemaining = Math.max(0, Math.ceil((new Date(sub.end_date) - new Date()) / (86400000)));
    const urgency = daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'warning' : 'ok';

    return {
      active: true,
      subscription: {
        ...sub,
        plan_name: sub.subscription_plans?.name,
        price: sub.subscription_plans?.price,
        features: sub.subscription_plans?.features,
        days_remaining: daysRemaining,
        urgency,
      },
    };
  }

  async getSubscriptionHistory(memberId, gymId) {
    const { data } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, subscription_plans(name, price, duration_days)')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .order('start_date', { ascending: false });

    return data || [];
  }

  // ─── Announcements ────────────────────────────────────
  async getAnnouncements(gymId, memberId) {
    const { data } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('gym_id', gymId)
      .or(`target_type.eq.all,target_ids.cs.["${memberId}"]`)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(20);

    return data || [];
  }

  // ─── Metrics ──────────────────────────────────────────
  async getMetrics(memberId) {
    const { data } = await supabaseAdmin
      .from('body_metrics')
      .select('*')
      .eq('member_id', memberId)
      .order('recorded_at', { ascending: true });
    return data || [];
  }

  async addMetric(memberId, metricData) {
    const { data, error } = await supabaseAdmin
      .from('body_metrics')
      .insert({
        metric_id: uuidv4(), member_id: memberId,
        weight: metricData.weight || null,
        bmi: metricData.bmi || null,
        body_fat_pct: metricData.body_fat_pct || null,
        recorded_at: metricData.recorded_at || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw ApiError.internal('Failed to add metric');
    return data;
  }

  // ─── Water Tracking ───────────────────────────────────
  async getWaterToday(memberId) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabaseAdmin
      .from('water_logs')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', today)
      .single();
    return data || { glasses_count: 0, date: today };
  }

  async logWater(memberId, glasses) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabaseAdmin
      .from('water_logs')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', today)
      .single();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('water_logs')
        .update({ glasses_count: existing.glasses_count + (glasses || 1), updated_at: new Date().toISOString() })
        .eq('member_id', memberId)
        .eq('date', today)
        .select()
        .single();
      if (error) throw ApiError.internal('Failed to log water');
      return data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('water_logs')
        .insert({ log_id: uuidv4(), member_id: memberId, date: today, glasses_count: glasses || 1 })
        .select()
        .single();
      if (error) throw ApiError.internal('Failed to log water');
      return data;
    }
  }

  // ─── Push Tokens ──────────────────────────────────────
  async registerPushToken(memberId, deviceToken, platform) {
    // Upsert - update if exists
    const { data: existing } = await supabaseAdmin
      .from('push_tokens')
      .select('token_id')
      .eq('member_id', memberId)
      .eq('device_token', deviceToken)
      .single();

    if (existing) return existing;

    const { data, error } = await supabaseAdmin
      .from('push_tokens')
      .insert({ token_id: uuidv4(), member_id: memberId, device_token: deviceToken, platform })
      .select()
      .single();
    if (error) throw ApiError.internal('Failed to register push token');
    return data;
  }

  // ─── Phase 2: Personal Records ────────────────────────
  async getPersonalRecords(memberId) {
    const { data } = await supabaseAdmin
      .from('member_set_logs')
      .select('exercise_name, weight_kg, reps_done, log_id, member_workout_logs!inner(member_id)')
      .eq('member_workout_logs.member_id', memberId)
      .not('weight_kg', 'is', null)
      .order('weight_kg', { ascending: false });

    // Group by exercise, take max weight
    const prs = {};
    (data || []).forEach(s => {
      if (!prs[s.exercise_name] || s.weight_kg > prs[s.exercise_name].weight_kg) {
        prs[s.exercise_name] = { exercise: s.exercise_name, weight_kg: s.weight_kg, reps: s.reps_done };
      }
    });

    return Object.values(prs).sort((a, b) => b.weight_kg - a.weight_kg);
  }

  // ─── Phase 2: Badges ──────────────────────────────────
  async getBadges(memberId) {
    const { data } = await supabaseAdmin
      .from('member_badges')
      .select('*')
      .eq('member_id', memberId)
      .order('earned_at', { ascending: false });

    const badgeInfo = {
      streak_7: { name: '7-Day Warrior', description: '7 day workout streak', icon: '🔥' },
      streak_14: { name: 'Two-Week Champion', description: '14 day workout streak', icon: '💪' },
      streak_30: { name: 'Monthly Beast', description: '30 day workout streak', icon: '🏆' },
      streak_60: { name: 'Iron Will', description: '60 day workout streak', icon: '⚡' },
      streak_90: { name: 'Unstoppable', description: '90 day workout streak', icon: '👑' },
      streak_180: { name: 'Half-Year Hero', description: '180 day workout streak', icon: '🌟' },
      streak_365: { name: 'Legend', description: '365 day workout streak', icon: '🎖️' },
    };

    return (data || []).map(b => ({
      ...b,
      ...badgeInfo[b.badge_type] || { name: b.badge_type, description: '', icon: '🏅' },
    }));
  }
}

export default new MobileService();
