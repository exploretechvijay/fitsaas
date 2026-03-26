import { body, param } from 'express-validator';

export const createAnnouncementValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('target_type')
    .isIn(['all', 'plan', 'individual'])
    .withMessage('Invalid target type'),
  body('target_ids')
    .optional()
    .isArray(),
  body('scheduled_at')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled date'),
];

export const announcementIdParam = [
  param('announcementId').isUUID().withMessage('Invalid announcement ID'),
];
