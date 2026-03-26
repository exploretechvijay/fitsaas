import { body, param, query } from 'express-validator';

export const createGymValidator = [
  body('name').trim().notEmpty().withMessage('Gym name is required'),
  body('owner_name').trim().notEmpty().withMessage('Owner name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('address').trim().optional(),
  body('saas_plan_id').optional().isUUID().withMessage('Invalid SaaS plan ID'),
];

export const updateGymValidator = [
  param('gymId').isUUID().withMessage('Invalid gym ID'),
  body('name').trim().optional().notEmpty().withMessage('Gym name cannot be empty'),
  body('owner_name').trim().optional(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').trim().optional(),
  body('address').trim().optional(),
  body('logo_url').optional().isURL().withMessage('Invalid logo URL'),
  body('status').optional().isIn(['active', 'inactive', 'trial']).withMessage('Invalid status'),
];

export const gymIdParam = [
  param('gymId').isUUID().withMessage('Invalid gym ID'),
];

export const listGymsQuery = [
  query('status').optional().isIn(['active', 'inactive', 'trial']).withMessage('Invalid status filter'),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
