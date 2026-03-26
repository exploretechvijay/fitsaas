import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(ApiResponse.ok(result, 'Login successful'));
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshToken(refreshToken);
  res.json(ApiResponse.ok(tokens, 'Token refreshed'));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.user_id, req.body.refreshToken);
  res.json(ApiResponse.ok(null, 'Logged out successfully'));
});

export const me = asyncHandler(async (req, res) => {
  res.json(ApiResponse.ok(req.user, 'User profile'));
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(ApiResponse.ok(result));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  res.json(ApiResponse.ok(result));
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.user_id,
    req.body.currentPassword,
    req.body.newPassword
  );
  res.json(ApiResponse.ok(result));
});
