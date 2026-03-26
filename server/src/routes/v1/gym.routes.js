import { Router } from 'express';
import * as gymController from '../../controllers/gym.controller.js';
import { gymAuth } from '../../middleware/auth.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.get('/profile', gymController.getGymProfile);
router.put('/profile', gymController.updateGymProfile);
router.get('/stats', gymController.getGymStats);

export default router;
