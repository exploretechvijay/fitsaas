import { body, param, query } from 'express-validator';

export const createLeadValidator = [
  body('full_name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email'),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('age').optional({ values: 'falsy' }).isInt({ min: 10, max: 100 }),
  body('source').optional().isIn(['walk_in', 'phone', 'website', 'social_media', 'referral', 'advertisement', 'bulk_upload', 'other']),
  body('status').optional().isIn(['new', 'contacted', 'interested', 'follow_up', 'trial', 'converted', 'not_interested', 'lost']),
  body('interest').optional().trim(),
  body('notes').optional().trim(),
  body('follow_up_date').optional({ values: 'falsy' }).isISO8601(),
];

export const updateLeadValidator = [
  param('leadId').isUUID().withMessage('Invalid lead ID'),
  body('full_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('status').optional().isIn(['new', 'contacted', 'interested', 'follow_up', 'trial', 'converted', 'not_interested', 'lost']),
  body('follow_up_date').optional({ values: 'falsy' }).isISO8601(),
];

export const leadIdParam = [
  param('leadId').isUUID().withMessage('Invalid lead ID'),
];

export const addActivityValidator = [
  param('leadId').isUUID().withMessage('Invalid lead ID'),
  body('type').isIn(['call', 'email', 'sms', 'whatsapp', 'visit', 'follow_up', 'note', 'status_change', 'converted']).withMessage('Invalid activity type'),
  body('disposition').optional().trim(),
  body('notes').optional().trim(),
];

export const bulkUploadValidator = [
  body('leads').isArray({ min: 1 }).withMessage('At least one lead is required'),
  body('leads.*.full_name').trim().notEmpty().withMessage('Name is required'),
  body('leads.*.phone').trim().notEmpty().withMessage('Phone is required'),
];

export const listLeadsQuery = [
  query('status').optional().isIn(['new', 'contacted', 'interested', 'follow_up', 'trial', 'converted', 'not_interested', 'lost']),
  query('source').optional(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
