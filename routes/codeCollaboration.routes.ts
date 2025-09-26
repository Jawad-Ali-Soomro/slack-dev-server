import { Router } from 'express';
import {
  createSession,
  getSessionById,
  getUserSessions,
  getPublicSessions,
  joinSession,
  leaveSession,
  updateCode,
  updateCursor,
  getSessionStats,
  endSession,
  deleteSession,
  generateInviteCode,
  joinByInviteCode,
  getSessionByInviteCode,
  inviteUser
} from '../controllers/codeCollaboration.controller';
import { authenticate } from '../middlewares';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a new code session
router.post('/', createSession);

// Get session by ID
router.get('/:sessionId', getSessionById);

// Get user's sessions
router.get('/user/sessions', getUserSessions);

// Get public sessions
router.get('/public/sessions', getPublicSessions);

// Join a session
router.post('/:sessionId/join', joinSession);

// Leave a session
router.post('/:sessionId/leave', leaveSession);

// Update code
router.put('/:sessionId/code', updateCode);

// Update cursor position
router.put('/:sessionId/cursor', updateCursor);

// End a session (owner only)
router.put('/:sessionId/end', endSession);

// Delete a session permanently (owner only)
router.delete('/:sessionId', deleteSession);

// Get session stats
router.get('/stats/overview', getSessionStats);

// Invite system routes
router.post('/:sessionId/invite-code', generateInviteCode);
router.post('/join/:inviteCode', joinByInviteCode);
router.get('/join/:inviteCode', getSessionByInviteCode);
router.post('/:sessionId/invite', inviteUser);

export default router;
