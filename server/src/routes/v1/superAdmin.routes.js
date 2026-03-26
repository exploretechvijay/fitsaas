import { Router } from 'express';
import * as gymController from '../../controllers/gym.controller.js';
import { superAdminAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createGymValidator,
  updateGymValidator,
  gymIdParam,
  listGymsQuery,
} from '../../validators/gym.validator.js';

const router = Router();

router.use(superAdminAuth);

router.post('/gyms', createGymValidator, validate, gymController.createGym);
router.get('/gyms', listGymsQuery, validate, gymController.listGyms);
router.get('/gyms/:gymId', gymIdParam, validate, gymController.getGymById);
router.put('/gyms/:gymId', updateGymValidator, validate, gymController.updateGym);
router.patch('/gyms/:gymId/status', gymIdParam, validate, gymController.toggleGymStatus);
router.get('/gyms/:gymId/stats', gymIdParam, validate, gymController.getGymStats);
router.get('/platform-stats', gymController.getPlatformStats);

export default router;
