import { Router } from 'express';
import * as mc from '../../controllers/mobile.controller.js';
import { composeMw, authenticate, authorize } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  updateProfileValidator,
  onboardingValidator,
  logWorkoutValidator,
  chatValidator,
  addMetricValidator,
  logWaterValidator,
  pushTokenValidator,
  regenerateDietValidator,
} from '../../validators/mobile.validator.js';

const router = Router();

// All mobile routes require member authentication
const memberAuth = composeMw(authenticate, authorize('member'));
router.use(memberAuth);

// ── Profile ─────────────────────────────────────────
router.get('/profile', mc.getProfile);
router.patch('/profile', updateProfileValidator, validate, mc.updateProfile);
router.post('/profile/onboarding', onboardingValidator, validate, mc.completeOnboarding);
router.get('/gym/branding', mc.getGymBranding);

// ── Workout ─────────────────────────────────────────
router.get('/workout/today', mc.getTodayWorkout);
router.get('/workout/week', mc.getWeekPlan);
router.post('/workout/log', logWorkoutValidator, validate, mc.logWorkout);
router.get('/workout/history', mc.getWorkoutHistory);
router.get('/workout/prs', mc.getPersonalRecords);

// ── Diet ────────────────────────────────────────────
router.get('/diet/plan', mc.getDietPlan);
router.post('/diet/regenerate', regenerateDietValidator, validate, mc.regenerateDiet);

// ── AI Chat ─────────────────────────────────────────
router.post('/ai/chat', chatValidator, validate, mc.chat);
router.get('/ai/chat/history', mc.getChatHistory);
router.get('/ai/tip', mc.getDailyTip);

// ── Metrics ─────────────────────────────────────────
router.get('/metrics', mc.getMetrics);
router.post('/metrics', addMetricValidator, validate, mc.addMetric);

// ── Subscription ────────────────────────────────────
router.get('/subscription', mc.getSubscription);
router.get('/subscription/history', mc.getSubscriptionHistory);

// ── Announcements ───────────────────────────────────
router.get('/announcements', mc.getAnnouncements);

// ── Streak & Badges ─────────────────────────────────
router.get('/streak', mc.getStreak);
router.get('/badges', mc.getBadges);

// ── Water ───────────────────────────────────────────
router.get('/water/today', mc.getWaterToday);
router.post('/water/log', logWaterValidator, validate, mc.logWater);

// ── Push ────────────────────────────────────────────
router.post('/push-token', pushTokenValidator, validate, mc.registerPushToken);

export default router;
