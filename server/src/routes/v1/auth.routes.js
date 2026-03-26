import { Router } from 'express';
import * as authController from '../../controllers/auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  loginValidator,
  resetPasswordRequestValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from '../../validators/auth.validator.js';

const router = Router();

router.post('/login', loginValidator, validate, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', resetPasswordRequestValidator, validate, authController.requestPasswordReset);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);
router.post('/change-password', authenticate, changePasswordValidator, validate, authController.changePassword);

export default router;
