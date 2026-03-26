import staffService from '../services/staff.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(staff, 'Staff member added'));
});

export const listStaff = asyncHandler(async (req, res) => {
  const result = await staffService.listStaff(req.user.gym_id, req.query);
  res.json(ApiResponse.ok(result));
});

export const getStaffById = asyncHandler(async (req, res) => {
  const staff = await staffService.getStaffById(req.user.gym_id, req.params.staffId);
  res.json(ApiResponse.ok(staff));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.user.gym_id, req.params.staffId, req.body);
  res.json(ApiResponse.ok(staff, 'Staff member updated'));
});

export const deleteStaff = asyncHandler(async (req, res) => {
  await staffService.deleteStaff(req.user.gym_id, req.params.staffId);
  res.json(ApiResponse.ok(null, 'Staff member removed'));
});

export const assignMembers = asyncHandler(async (req, res) => {
  const result = await staffService.assignMembers(req.user.gym_id, req.params.staffId, req.body.member_ids);
  res.json(ApiResponse.ok(result, 'Members assigned to trainer'));
});

export const getTrainerMembers = asyncHandler(async (req, res) => {
  const members = await staffService.getTrainerMembers(req.user.gym_id, req.params.staffId);
  res.json(ApiResponse.ok(members));
});
