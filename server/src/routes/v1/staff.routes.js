import { Router } from 'express';
import * as staffController from '../../controllers/staff.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createStaffValidator,
  updateStaffValidator,
  staffIdParam,
  assignMembersToTrainerValidator,
} from '../../validators/staff.validator.js';

const router = Router();

router.use(gymAuth('gym_admin'));

router.post('/', createStaffValidator, validate, staffController.createStaff);
router.get('/', staffController.listStaff);
router.get('/:staffId', staffIdParam, validate, staffController.getStaffById);
router.put('/:staffId', updateStaffValidator, validate, staffController.updateStaff);
router.delete('/:staffId', staffIdParam, validate, staffController.deleteStaff);
router.post('/:staffId/assign-members', assignMembersToTrainerValidator, validate, staffController.assignMembers);
router.get('/:staffId/members', staffIdParam, validate, staffController.getTrainerMembers);

export default router;
