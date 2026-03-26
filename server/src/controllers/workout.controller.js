import workoutService from '../services/workout.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.createPlan(req.user.gym_id, req.user.user_id, req.body);
  res.status(201).json(ApiResponse.created(plan));
});

export const listPlans = asyncHandler(async (req, res) => {
  const result = await workoutService.listPlans(req.user.gym_id, req.query);
  res.json(ApiResponse.ok(result));
});

export const getPlanById = asyncHandler(async (req, res) => {
  const plan = await workoutService.getPlanById(req.user.gym_id, req.params.planId);
  res.json(ApiResponse.ok(plan));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.updatePlan(req.user.gym_id, req.params.planId, req.body);
  res.json(ApiResponse.ok(plan, 'Workout plan updated'));
});

export const deletePlan = asyncHandler(async (req, res) => {
  await workoutService.deletePlan(req.user.gym_id, req.params.planId);
  res.json(ApiResponse.ok(null, 'Workout plan deleted'));
});

export const assignToMember = asyncHandler(async (req, res) => {
  const assignment = await workoutService.assignToMember(req.user.gym_id, {
    ...req.body,
    assigned_by: req.user.user_id,
  });
  res.status(201).json(ApiResponse.created(assignment, 'Workout plan assigned'));
});

export const getMemberAssignments = asyncHandler(async (req, res) => {
  const assignments = await workoutService.getMemberAssignments(req.user.gym_id, req.params.memberId);
  res.json(ApiResponse.ok(assignments));
});
