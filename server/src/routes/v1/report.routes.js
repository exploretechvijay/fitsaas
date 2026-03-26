import { Router } from 'express';
import * as reportController from '../../controllers/report.controller.js';
import { gymAuth } from '../../middleware/auth.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.get('/dashboard', reportController.getDashboardStats);
router.get('/members', reportController.getMemberReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/subscriptions', reportController.getSubscriptionReport);

export default router;
