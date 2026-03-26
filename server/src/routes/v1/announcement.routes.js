import { Router } from 'express';
import * as announcementController from '../../controllers/announcement.controller.js';
import { gymAuth } from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createAnnouncementValidator,
  announcementIdParam,
} from '../../validators/announcement.validator.js';

const router = Router();

router.use(gymAuth('gym_admin', 'staff'));

router.post('/', createAnnouncementValidator, validate, announcementController.create);
router.get('/', announcementController.list);
router.get('/:announcementId', announcementIdParam, validate, announcementController.getById);
router.delete('/:announcementId', announcementIdParam, validate, announcementController.remove);

export default router;
