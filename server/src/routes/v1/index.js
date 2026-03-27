import { Router } from 'express';
import authRoutes from './auth.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import gymRoutes from './gym.routes.js';
import memberRoutes from './member.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import workoutRoutes from './workout.routes.js';
import dietRoutes from './diet.routes.js';
import staffRoutes from './staff.routes.js';
import announcementRoutes from './announcement.routes.js';
import reportRoutes from './report.routes.js';
import leadRoutes from './lead.routes.js';
import mobileRoutes from './mobile.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/gym', gymRoutes);
router.use('/members', memberRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/workout-plans', workoutRoutes);
router.use('/diet-plans', dietRoutes);
router.use('/staff', staffRoutes);
router.use('/announcements', announcementRoutes);
router.use('/reports', reportRoutes);
router.use('/leads', leadRoutes);
router.use('/mobile', mobileRoutes);

export default router;
