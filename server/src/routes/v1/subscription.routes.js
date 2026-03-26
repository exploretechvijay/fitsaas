import { Router } from 'express';
import * as subController from '../../controllers/subscription.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createPlanValidator,
  updatePlanValidator,
  assignSubscriptionValidator,
  renewSubscriptionValidator,
  pauseSubscriptionValidator,
  cancelSubscriptionValidator,
  recordPaymentValidator,
} from '../../validators/subscription.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/plans', createPlanValidator, validate, subController.createPlan);
router.get('/plans', subController.listPlans);
router.get('/plans/:planId', subController.getPlanById);
router.put('/plans/:planId', updatePlanValidator, validate, subController.updatePlan);
router.delete('/plans/:planId', subController.deletePlan);

router.post('/assign', assignSubscriptionValidator, validate, subController.assignSubscription);
router.post('/:subId/renew', renewSubscriptionValidator, validate, subController.renewSubscription);
router.post('/:subId/pause', pauseSubscriptionValidator, validate, subController.pauseSubscription);
router.post('/:subId/resume', subController.resumeSubscription);
router.post('/:subId/cancel', cancelSubscriptionValidator, validate, subController.cancelSubscription);
router.get('/expiring', subController.getExpiringSubscriptions);

router.post('/payments', recordPaymentValidator, validate, subController.recordPayment);
router.get('/payments', subController.getPayments);
router.put('/payments/:paymentId', subController.updatePayment);

export default router;
