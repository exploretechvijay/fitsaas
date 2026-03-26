import memberService from '../services/member.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createMember = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  const member = await memberService.createMember(gymId, req.body);
  res.status(201).json(ApiResponse.created(member, 'Member added successfully'));
});

export const listMembers = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  const result = await memberService.listMembers(gymId, req.query);
  res.json(ApiResponse.ok(result));
});

export const getMemberById = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  const member = await memberService.getMemberById(gymId, req.params.memberId);
  res.json(ApiResponse.ok(member));
});

export const updateMember = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  const member = await memberService.updateMember(gymId, req.params.memberId, req.body);
  res.json(ApiResponse.ok(member, 'Member updated successfully'));
});

export const deleteMember = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  await memberService.deleteMember(gymId, req.params.memberId);
  res.json(ApiResponse.ok(null, 'Member deleted successfully'));
});

export const getMemberMetrics = asyncHandler(async (req, res) => {
  const metrics = await memberService.getMemberMetrics(req.params.memberId);
  res.json(ApiResponse.ok(metrics));
});

export const addBodyMetric = asyncHandler(async (req, res) => {
  const metric = await memberService.addBodyMetric(req.params.memberId, req.body);
  res.status(201).json(ApiResponse.created(metric));
});
