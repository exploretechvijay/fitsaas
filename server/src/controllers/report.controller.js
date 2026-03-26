import reportService from '../services/report.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const gymId = req.user.gym_id;
  const stats = await reportService.getDashboardStats(gymId);
  res.json(ApiResponse.ok(stats));
});

export const getMemberReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const report = await reportService.getMemberReport(req.user.gym_id, start_date, end_date);
  res.json(ApiResponse.ok(report));
});

export const getRevenueReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const report = await reportService.getRevenueReport(req.user.gym_id, start_date, end_date);
  res.json(ApiResponse.ok(report));
});

export const getSubscriptionReport = asyncHandler(async (req, res) => {
  const report = await reportService.getSubscriptionReport(req.user.gym_id);
  res.json(ApiResponse.ok(report));
});
