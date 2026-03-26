import { Router } from 'express';
import * as memberController from '../../controllers/member.controller.js';
import { gymAuth, composeMw, authenticate, authorize, ensureGymAccess } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createMemberValidator,
  updateMemberValidator,
  memberIdParam,
  listMembersQuery,
} from '../../validators/member.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/', createMemberValidator, validate, memberController.createMember);
router.get('/', listMembersQuery, validate, memberController.listMembers);
router.get('/:memberId', memberIdParam, validate, memberController.getMemberById);
router.put('/:memberId', updateMemberValidator, validate, memberController.updateMember);
router.delete('/:memberId', composeMw(authenticate, authorize('gym_admin'), ensureGymAccess), memberIdParam, validate, memberController.deleteMember);
router.get('/:memberId/metrics', memberIdParam, validate, memberController.getMemberMetrics);
router.post('/:memberId/metrics', memberIdParam, validate, memberController.addBodyMetric);

export default router;
