import { body } from 'express-validator';

export const updateProfileValidator = [
  body('full_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('height').optional({ values: 'falsy' }).isFloat({ min: 50, max: 300 }),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 20, max: 500 }),
  body('goal').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
  body('dietary_pref').optional().isIn(['veg', 'non_veg', 'vegan', 'eggetarian']),
  body('gender').optional().isIn(['male', 'female', 'other']),
];

export const onboardingValidator = [
  body('height').isFloat({ min: 50, max: 300 }).withMessage('Invalid height'),
  body('weight').isFloat({ min: 20, max: 500 }).withMessage('Invalid weight'),
  body('goal').isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']).withMessage('Invalid goal'),
  body('dietary_pref').isIn(['veg', 'non_veg', 'vegan', 'eggetarian']).withMessage('Invalid dietary preference'),
];

export const logWorkoutValidator = [
  body('exercises_done').isArray().withMessage('exercises_done must be an array'),
  body('duration_minutes').optional().isInt({ min: 1, max: 300 }),
  body('feeling_score').optional().isInt({ min: 1, max: 4 }),
];

export const chatValidator = [
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('session_id').optional({ values: 'falsy' }).isUUID(),
];

export const addMetricValidator = [
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 20, max: 500 }),
  body('bmi').optional({ values: 'falsy' }).isFloat({ min: 10, max: 60 }),
  body('body_fat_pct').optional({ values: 'falsy' }).isFloat({ min: 1, max: 60 }),
];

export const logWaterValidator = [
  body('glasses').optional().isInt({ min: 1, max: 20 }),
];

export const pushTokenValidator = [
  body('device_token').trim().notEmpty().withMessage('Device token is required'),
  body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android'),
];

export const regenerateDietValidator = [
  body('goal').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
  body('dietary_pref').optional().isIn(['veg', 'non_veg', 'vegan', 'eggetarian']),
];
