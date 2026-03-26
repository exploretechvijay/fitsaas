import { Router } from 'express';
import * as dietController from '../../controllers/diet.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  generateDietPlanValidator,
  saveDietPlanValidator,
  dietPlanIdParam,
} from '../../validators/diet.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/generate', generateDietPlanValidator, validate, dietController.generateDietPlan);
router.post('/save', saveDietPlanValidator, validate, dietController.saveDietPlan);
router.get('/member/:memberId', dietController.getMemberDietPlans);
router.get('/:dietId', dietPlanIdParam, validate, dietController.getDietPlanById);
router.put('/:dietId', dietPlanIdParam, validate, dietController.updateDietPlan);
router.delete('/:dietId', dietPlanIdParam, validate, dietController.deleteDietPlan);

export default router;
