import { body, param } from 'express-validator';

export const createPlanValidator = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('duration_days').isInt({ min: 1, max: 730 }).withMessage('Duration must be between 1 and 730 days'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional().trim(),
  body('features').optional().isArray(),
];

export const updatePlanValidator = [
  param('planId').isUUID().withMessage('Invalid plan ID'),
  body('name').optional().trim().notEmpty(),
  body('duration_days').optional().isInt({ min: 1, max: 730 }),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean(),
];

export const assignSubscriptionValidator = [
  body('member_id').isUUID().withMessage('Valid member ID is required'),
  body('plan_id').isUUID().withMessage('Valid plan ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('payment_amount').optional().isFloat({ min: 0 }),
  body('payment_mode').optional().isIn(['cash', 'upi', 'card', 'bank_transfer']),
];

export const renewSubscriptionValidator = [
  param('subId').isUUID().withMessage('Invalid subscription ID'),
  body('plan_id').isUUID().withMessage('Valid plan ID is required'),
  body('start_date').optional().isISO8601(),
  body('payment_amount').optional().isFloat({ min: 0 }),
  body('payment_mode').optional().isIn(['cash', 'upi', 'card', 'bank_transfer']),
];

export const pauseSubscriptionValidator = [
  param('subId').isUUID().withMessage('Invalid subscription ID'),
  body('pause_days').isInt({ min: 1, max: 90 }).withMessage('Pause days must be between 1 and 90'),
];

export const cancelSubscriptionValidator = [
  param('subId').isUUID().withMessage('Invalid subscription ID'),
  body('cancel_reason').trim().notEmpty().withMessage('Cancel reason is required'),
];

export const recordPaymentValidator = [
  body('sub_id').isUUID().withMessage('Valid subscription ID is required'),
  body('member_id').isUUID().withMessage('Valid member ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('mode').isIn(['cash', 'upi', 'card', 'bank_transfer']).withMessage('Invalid payment mode'),
  body('reference_id').optional().trim(),
  body('notes').optional().trim(),
];
