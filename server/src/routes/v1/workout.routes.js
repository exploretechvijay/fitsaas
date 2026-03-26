import { Router } from 'express';
import * as workoutController from '../../controllers/workout.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createWorkoutPlanValidator,
  updateWorkoutPlanValidator,
  assignWorkoutValidator,
  workoutPlanIdParam,
} from '../../validators/workout.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/', createWorkoutPlanValidator, validate, workoutController.createPlan);
router.get('/', workoutController.listPlans);
router.get('/:planId', workoutPlanIdParam, validate, workoutController.getPlanById);
router.put('/:planId', updateWorkoutPlanValidator, validate, workoutController.updatePlan);
router.delete('/:planId', workoutPlanIdParam, validate, workoutController.deletePlan);
router.post('/assign', assignWorkoutValidator, validate, workoutController.assignToMember);
router.get('/member/:memberId/assignments', workoutController.getMemberAssignments);

export default router;
