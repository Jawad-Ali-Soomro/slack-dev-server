import express from 'express';
import {
  getAllUsersWithPermissions,
  getUserPermissions,
  createOrUpdatePermissions,
  deletePermissions
} from '../controllers/permissions.controller';
import { authenticate } from '../middlewares/index';

const permissionsRouter = express.Router();

// global authentication middleware
permissionsRouter.use(authenticate)

permissionsRouter.get('/users', getAllUsersWithPermissions);
permissionsRouter.get('/user/:targetUserId', getUserPermissions);
permissionsRouter.post('/user/:userId', createOrUpdatePermissions);
permissionsRouter.delete('/user/:userId', deletePermissions);

export default permissionsRouter;
