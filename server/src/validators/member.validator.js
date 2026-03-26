import { body, param, query } from 'express-validator';

export const createMemberValidator = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('dob').optional().isISO8601().withMessage('Invalid date of birth'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('height').optional().isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50-300 cm'),
  body('weight').optional().isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20-500 kg'),
  body('goal').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
  body('dietary_pref').optional().isIn(['veg', 'non_veg', 'vegan', 'eggetarian']),
  body('medical_notes').optional().trim(),
  body('emergency_contact_name').optional().trim(),
  body('emergency_contact_phone').optional().trim(),
];

export const updateMemberValidator = [
  param('memberId').isUUID().withMessage('Invalid member ID'),
  body('full_name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('dob').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('height').optional().isFloat({ min: 50, max: 300 }),
  body('weight').optional().isFloat({ min: 20, max: 500 }),
  body('goal').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
  body('dietary_pref').optional().isIn(['veg', 'non_veg', 'vegan', 'eggetarian']),
];

export const memberIdParam = [
  param('memberId').isUUID().withMessage('Invalid member ID'),
];

export const listMembersQuery = [
  query('status').optional().isIn(['active', 'expired', 'paused', 'cancelled']),
  query('plan_id').optional().isUUID(),
  query('gender').optional().isIn(['male', 'female', 'other']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort_by').optional().isIn(['full_name', 'created_at', 'email']),
  query('sort_order').optional().isIn(['asc', 'desc']),
];
