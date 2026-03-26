import dietService from '../services/diet.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const generateDietPlan = asyncHandler(async (req, res) => {
  const weekData = await dietService.generateDietPlan(req.user.gym_id, req.body);
  res.json(ApiResponse.ok(weekData, 'Diet plan generated'));
});

export const saveDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.saveDietPlan(req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(plan, 'Diet plan saved'));
});

export const getMemberDietPlans = asyncHandler(async (req, res) => {
  const plans = await dietService.getMemberDietPlans(req.user.gym_id, req.params.memberId);
  res.json(ApiResponse.ok(plans));
});

export const getDietPlanById = asyncHandler(async (req, res) => {
  const plan = await dietService.getDietPlanById(req.params.dietId);
  res.json(ApiResponse.ok(plan));
});

export const updateDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.updateDietPlan(req.user.gym_id, req.params.dietId, req.body);
  res.json(ApiResponse.ok(plan, 'Diet plan updated'));
});

export const deleteDietPlan = asyncHandler(async (req, res) => {
  await dietService.deleteDietPlan(req.user.gym_id, req.params.dietId);
  res.json(ApiResponse.ok(null, 'Diet plan deleted'));
});
