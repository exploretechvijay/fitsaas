import gymService from '../services/gym.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createGym = asyncHandler(async (req, res) => {
  const result = await gymService.createGym(req.body);
  res.status(201).json(ApiResponse.created(result, 'Gym created successfully'));
});

export const listGyms = asyncHandler(async (req, res) => {
  const result = await gymService.listGyms(req.query);
  res.json(ApiResponse.ok(result));
});

export const getGymById = asyncHandler(async (req, res) => {
  const gym = await gymService.getGymById(req.params.gymId);
  res.json(ApiResponse.ok(gym));
});

export const updateGym = asyncHandler(async (req, res) => {
  const gym = await gymService.updateGym(req.params.gymId, req.body);
  res.json(ApiResponse.ok(gym, 'Gym updated successfully'));
});

export const toggleGymStatus = asyncHandler(async (req, res) => {
  const gym = await gymService.toggleGymStatus(req.params.gymId, req.body.status);
  res.json(ApiResponse.ok(gym, 'Gym status updated'));
});

export const getGymStats = asyncHandler(async (req, res) => {
  const gymId = req.params.gymId || req.user.gym_id;
  const stats = await gymService.getGymStats(gymId);
  res.json(ApiResponse.ok(stats));
});

export const getPlatformStats = asyncHandler(async (req, res) => {
  const stats = await gymService.getPlatformStats();
  res.json(ApiResponse.ok(stats));
});

export const getGymProfile = asyncHandler(async (req, res) => {
  const gym = await gymService.getGymById(req.user.gym_id);
  res.json(ApiResponse.ok(gym));
});

export const updateGymProfile = asyncHandler(async (req, res) => {
  const gym = await gymService.updateGym(req.user.gym_id, req.body);
  res.json(ApiResponse.ok(gym, 'Gym profile updated'));
});
