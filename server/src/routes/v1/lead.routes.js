import { Router } from 'express';
import * as leadController from '../../controllers/lead.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createLeadValidator,
  updateLeadValidator,
  leadIdParam,
  addActivityValidator,
  bulkUploadValidator,
  listLeadsQuery,
} from '../../validators/lead.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/', createLeadValidator, validate, leadController.create);
router.post('/bulk', bulkUploadValidator, validate, leadController.bulkCreate);
router.get('/', listLeadsQuery, validate, leadController.list);
router.get('/stats', leadController.getStats);
router.get('/:leadId', leadIdParam, validate, leadController.getById);
router.put('/:leadId', updateLeadValidator, validate, leadController.update);
router.delete('/:leadId', leadIdParam, validate, leadController.remove);
router.post('/:leadId/activities', addActivityValidator, validate, leadController.addActivity);
router.get('/:leadId/activities', leadIdParam, validate, leadController.getActivities);
router.post('/:leadId/convert', leadIdParam, validate, leadController.convertToMember);

export default router;
