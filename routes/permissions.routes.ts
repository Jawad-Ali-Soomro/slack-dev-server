import { Router } from 'express';
import {
  getAllUsersWithPermissions,
  getUserPermissions,
  createOrUpdatePermissions,
  deletePermissions
} from '../controllers/permissions.controller';
import { authenticate } from '../middlewares';

const router = Router();

router.use(authenticate);

router.get('/users', getAllUsersWithPermissions);

router.get('/user/:targetUserId', getUserPermissions);

router.post('/user/:userId', createOrUpdatePermissions);

router.delete('/user/:userId', deletePermissions);

export default router;
