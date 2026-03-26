import announcementService from '../services/announcement.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const announcement = await announcementService.create(req.user.gym_id, req.body);
  res.status(201).json(ApiResponse.created(announcement));
});

export const list = asyncHandler(async (req, res) => {
  const result = await announcementService.list(req.user.gym_id, req.query);
  res.json(ApiResponse.ok(result));
});

export const getById = asyncHandler(async (req, res) => {
  const announcement = await announcementService.getById(req.user.gym_id, req.params.announcementId);
  res.json(ApiResponse.ok(announcement));
});

export const remove = asyncHandler(async (req, res) => {
  await announcementService.delete(req.user.gym_id, req.params.announcementId);
  res.json(ApiResponse.ok(null, 'Announcement deleted'));
});
