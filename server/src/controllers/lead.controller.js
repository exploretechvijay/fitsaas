import leadService from '../services/lead.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const lead = await leadService.create(req.user.gym_id, req.user.user_id, req.body);
  res.status(201).json(ApiResponse.created(lead, 'Lead created'));
});

export const bulkCreate = asyncHandler(async (req, res) => {
  const result = await leadService.bulkCreate(req.user.gym_id, req.user.user_id, req.body.leads);
  res.status(201).json(ApiResponse.created(result, `${result.inserted} leads uploaded`));
});

export const list = asyncHandler(async (req, res) => {
  const result = await leadService.list(req.user.gym_id, req.query);
  res.json(ApiResponse.ok(result));
});

export const getById = asyncHandler(async (req, res) => {
  const lead = await leadService.getById(req.user.gym_id, req.params.leadId);
  res.json(ApiResponse.ok(lead));
});

export const update = asyncHandler(async (req, res) => {
  const lead = await leadService.update(req.user.gym_id, req.params.leadId, req.body);
  res.json(ApiResponse.ok(lead, 'Lead updated'));
});

export const remove = asyncHandler(async (req, res) => {
  await leadService.delete(req.user.gym_id, req.params.leadId);
  res.json(ApiResponse.ok(null, 'Lead deleted'));
});

export const addActivity = asyncHandler(async (req, res) => {
  const activity = await leadService.addActivity(req.user.gym_id, req.params.leadId, req.user.user_id, req.body);
  res.status(201).json(ApiResponse.created(activity, 'Activity logged'));
});

export const getActivities = asyncHandler(async (req, res) => {
  const activities = await leadService.getActivities(req.params.leadId);
  res.json(ApiResponse.ok(activities));
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await leadService.getStats(req.user.gym_id);
  res.json(ApiResponse.ok(stats));
});

export const convertToMember = asyncHandler(async (req, res) => {
  const result = await leadService.convertToMember(req.user.gym_id, req.params.leadId);
  res.json(ApiResponse.ok(result, 'Lead converted to member'));
});
