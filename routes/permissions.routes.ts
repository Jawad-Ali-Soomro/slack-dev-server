import { Router } from 'express';
import {
  getAllUsersWithPermissions,
  getUserPermissions,
  createOrUpdatePermissions,
  deletePermissions
} from '../controllers/permissions.controller';
import { authenticate } from '../middlewares';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users with their permissions (Admin only)
router.get('/users', getAllUsersWithPermissions);

// Get permissions for a specific user
router.get('/user/:targetUserId', getUserPermissions);

// Create or update permissions (Admin only)
router.post('/user/:userId', createOrUpdatePermissions);

// Delete permissions (Admin only)
router.delete('/user/:userId', deletePermissions);

export default router;
