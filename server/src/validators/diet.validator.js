import { body, param } from 'express-validator';

export const generateDietPlanValidator = [
  body('member_id').isUUID().withMessage('Valid member ID is required'),
  body('goal')
    .isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness'])
    .withMessage('Invalid fitness goal'),
  body('dietary_pref')
    .isIn(['veg', 'non_veg', 'vegan', 'eggetarian'])
    .withMessage('Invalid dietary preference'),
  body('weight').isFloat({ min: 20, max: 500 }).withMessage('Invalid weight'),
  body('height').isFloat({ min: 50, max: 300 }).withMessage('Invalid height'),
  body('age').isInt({ min: 10, max: 100 }).withMessage('Invalid age'),
];

export const saveDietPlanValidator = [
  body('member_id').isUUID().withMessage('Valid member ID is required'),
  body('source').isIn(['ai', 'manual']).withMessage('Source must be ai or manual'),
  body('week_data').isObject().withMessage('Week data is required'),
];

export const dietPlanIdParam = [
  param('dietId').isUUID().withMessage('Invalid diet plan ID'),
];
