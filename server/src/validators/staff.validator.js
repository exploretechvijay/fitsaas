import { body, param } from 'express-validator';

export const createStaffValidator = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('role')
    .isIn(['trainer', 'front_desk', 'manager'])
    .withMessage('Invalid staff role'),
  body('specialization').optional().trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const updateStaffValidator = [
  param('staffId').isUUID().withMessage('Invalid staff ID'),
  body('full_name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['trainer', 'front_desk', 'manager']),
  body('specialization').optional().trim(),
  body('is_active').optional().isBoolean(),
];

export const staffIdParam = [
  param('staffId').isUUID().withMessage('Invalid staff ID'),
];

export const assignMembersToTrainerValidator = [
  param('staffId').isUUID().withMessage('Invalid staff ID'),
  body('member_ids')
    .isArray({ min: 1 })
    .withMessage('At least one member ID is required'),
  body('member_ids.*')
    .isUUID()
    .withMessage('Invalid member ID'),
];
