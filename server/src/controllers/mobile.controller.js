import mobileService from '../services/mobile.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper to get member_id from user context
const getMemberId = async (req) => {
  // The user is a member - find their member record by email + gym_id
  const { supabaseAdmin } = await import('../config/supabase.js');
  const { data } = await supabaseAdmin
    .from('members')
    .select('member_id')
    .eq('gym_id', req.user.gym_id)
    .eq('email', req.user.email)
    .single();
  if (!data) {
    const { ApiError } = await import('../utils/ApiError.js');
    throw ApiError.default?.notFound?.('Member profile not found') || new Error('Member profile not found');
  }
  return data.member_id;
};

// Profile
export const getProfile = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const profile = await mobileService.getProfile(memberId, req.user.gym_id);
  res.json(ApiResponse.ok(profile));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.updateProfile(memberId, req.user.gym_id, req.body);
  res.json(ApiResponse.ok(data, 'Profile updated'));
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const result = await mobileService.completeOnboarding(memberId, req.user.gym_id, req.body);
  res.json(ApiResponse.ok(result));
});

export const getGymBranding = asyncHandler(async (req, res) => {
  const data = await mobileService.getGymBranding(req.user.gym_id);
  res.json(ApiResponse.ok(data));
});

// Workout
export const getTodayWorkout = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getTodayWorkout(memberId, req.user.gym_id);
  res.json(ApiResponse.ok(data));
});

export const getWeekPlan = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getWeekPlan(memberId);
  res.json(ApiResponse.ok(data));
});

export const logWorkout = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const log = await mobileService.logWorkout(memberId, req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(log, 'Workout logged'));
});

export const getWorkoutHistory = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const days = parseInt(req.query.days, 10) || 90;
  const data = await mobileService.getWorkoutHistory(memberId, days);
  res.json(ApiResponse.ok(data));
});

// Diet
export const getDietPlan = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const plan = await mobileService.getCurrentDietPlan(memberId, req.user.gym_id);
  res.json(ApiResponse.ok(plan));
});

export const regenerateDiet = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const plan = await mobileService.regenerateDietPlan(memberId, req.user.gym_id, req.body);
  res.json(ApiResponse.ok(plan, 'Diet plan generated'));
});

// AI Chat
export const chat = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const result = await mobileService.chat(memberId, req.user.gym_id, req.body.message, req.body.session_id);
  res.json(ApiResponse.ok(result));
});

export const getChatHistory = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getChatHistory(memberId);
  res.json(ApiResponse.ok(data));
});

export const getDailyTip = asyncHandler(async (req, res) => {
  const tip = await mobileService.getDailyTip(req.user.gym_id);
  res.json(ApiResponse.ok(tip));
});

// Metrics
export const getMetrics = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getMetrics(memberId);
  res.json(ApiResponse.ok(data));
});

export const addMetric = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.addMetric(memberId, req.body);
  res.status(201).json(ApiResponse.created(data));
});

// Subscription
export const getSubscription = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getSubscription(memberId, req.user.gym_id);
  res.json(ApiResponse.ok(data));
});

export const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getSubscriptionHistory(memberId, req.user.gym_id);
  res.json(ApiResponse.ok(data));
});

// Announcements
export const getAnnouncements = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getAnnouncements(req.user.gym_id, memberId);
  res.json(ApiResponse.ok(data));
});

// Streak & Badges
export const getStreak = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getStreak(memberId);
  res.json(ApiResponse.ok(data));
});

export const getBadges = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getBadges(memberId);
  res.json(ApiResponse.ok(data));
});

// Water
export const getWaterToday = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getWaterToday(memberId);
  res.json(ApiResponse.ok(data));
});

export const logWater = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.logWater(memberId, req.body.glasses);
  res.json(ApiResponse.ok(data, 'Water logged'));
});

// Push Token
export const registerPushToken = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.registerPushToken(memberId, req.body.device_token, req.body.platform);
  res.json(ApiResponse.ok(data));
});

// Personal Records
export const getPersonalRecords = asyncHandler(async (req, res) => {
  const memberId = await getMemberId(req);
  const data = await mobileService.getPersonalRecords(memberId);
  res.json(ApiResponse.ok(data));
});
