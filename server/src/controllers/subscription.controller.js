import subscriptionService from '../services/subscription.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Plans
export const createPlan = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.createPlan(req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(plan));
});

export const listPlans = asyncHandler(async (req, res) => {
  const includeInactive = req.query.include_inactive === 'true';
  const plans = await subscriptionService.listPlans(req.user.gym_id, includeInactive);
  res.json(ApiResponse.ok(plans));
});

export const getPlanById = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.getPlanById(req.user.gym_id, req.params.planId);
  res.json(ApiResponse.ok(plan));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.updatePlan(req.user.gym_id, req.params.planId, req.body);
  res.json(ApiResponse.ok(plan, 'Plan updated'));
});

export const deletePlan = asyncHandler(async (req, res) => {
  await subscriptionService.deletePlan(req.user.gym_id, req.params.planId);
  res.json(ApiResponse.ok(null, 'Plan deleted'));
});

// Subscriptions
export const assignSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.assignSubscription(req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(sub, 'Subscription assigned'));
});

export const renewSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.renewSubscription(req.user.gym_id, req.params.subId, req.body);
  res.json(ApiResponse.ok(sub, 'Subscription renewed'));
});

export const pauseSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.pauseSubscription(req.user.gym_id, req.params.subId, req.body.pause_days);
  res.json(ApiResponse.ok(sub, 'Subscription paused'));
});

export const resumeSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.resumeSubscription(req.user.gym_id, req.params.subId);
  res.json(ApiResponse.ok(sub, 'Subscription resumed'));
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.cancelSubscription(req.user.gym_id, req.params.subId, req.body.cancel_reason);
  res.json(ApiResponse.ok(sub, 'Subscription cancelled'));
});

export const getExpiringSubscriptions = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const subs = await subscriptionService.getExpiringSubscriptions(req.user.gym_id, days);
  res.json(ApiResponse.ok(subs));
});

// Payments
export const recordPayment = asyncHandler(async (req, res) => {
  const payment = await subscriptionService.recordPayment({
    ...req.body,
    gym_id: req.user.gym_id,
  });
  res.status(201).json(ApiResponse.created(payment, 'Payment recorded'));
});

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await subscriptionService.updatePayment(req.user.gym_id, req.params.paymentId, req.body);
  res.json(ApiResponse.ok(payment, 'Payment updated'));
});

export const getPayments = asyncHandler(async (req, res) => {
  const payments = await subscriptionService.getPayments(req.user.gym_id, req.query);
  res.json(ApiResponse.ok(payments));
});
