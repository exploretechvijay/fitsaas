import { body, param } from 'express-validator';

export const createWorkoutPlanValidator = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('type')
    .isIn(['weight_training', 'yoga', 'cardio', 'hiit', 'crossfit', 'calisthenics', 'mixed'])
    .withMessage('Invalid workout type'),
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  body('goal_tags')
    .optional()
    .isArray()
    .withMessage('Goal tags must be an array'),
  body('days')
    .isArray({ min: 1, max: 7 })
    .withMessage('Must have 1-7 workout days'),
  body('days.*.day_number')
    .isInt({ min: 1, max: 7 })
    .withMessage('Day number must be 1-7'),
  body('days.*.is_rest_day')
    .isBoolean()
    .withMessage('is_rest_day must be boolean'),
  body('days.*.exercises')
    .optional()
    .isArray(),
  body('days.*.exercises.*.name')
    .optional()
    .trim()
    .notEmpty(),
  body('days.*.exercises.*.sets')
    .optional()
    .isInt({ min: 1, max: 20 }),
  body('days.*.exercises.*.reps')
    .optional()
    .trim(),
  body('days.*.exercises.*.duration_seconds')
    .optional()
    .isInt({ min: 0 }),
  body('days.*.exercises.*.rest_seconds')
    .optional()
    .isInt({ min: 0, max: 600 }),
];

export const updateWorkoutPlanValidator = [
  param('planId').isUUID().withMessage('Invalid plan ID'),
  body('name').optional().trim().notEmpty(),
  body('type')
    .optional()
    .isIn(['weight_training', 'yoga', 'cardio', 'hiit', 'crossfit', 'calisthenics', 'mixed']),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']),
];

export const assignWorkoutValidator = [
  body('member_id').isUUID().withMessage('Valid member ID is required'),
  body('plan_id').isUUID().withMessage('Valid plan ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
];

export const workoutPlanIdParam = [
  param('planId').isUUID().withMessage('Invalid plan ID'),
];
