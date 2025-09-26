"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const codeCollaboration_controller_1 = require("../controllers/codeCollaboration.controller");
const middlewares_1 = require("../middlewares");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middlewares_1.authenticate);
// Create a new code session
router.post('/', codeCollaboration_controller_1.createSession);
// Get session by ID
router.get('/:sessionId', codeCollaboration_controller_1.getSessionById);
// Get user's sessions
router.get('/user/sessions', codeCollaboration_controller_1.getUserSessions);
// Get public sessions
router.get('/public/sessions', codeCollaboration_controller_1.getPublicSessions);
// Join a session
router.post('/:sessionId/join', codeCollaboration_controller_1.joinSession);
// Leave a session
router.post('/:sessionId/leave', codeCollaboration_controller_1.leaveSession);
// Update code
router.put('/:sessionId/code', codeCollaboration_controller_1.updateCode);
// Update cursor position
router.put('/:sessionId/cursor', codeCollaboration_controller_1.updateCursor);
// End a session (owner only)
router.put('/:sessionId/end', codeCollaboration_controller_1.endSession);
// Delete a session permanently (owner only)
router.delete('/:sessionId', codeCollaboration_controller_1.deleteSession);
// Get session stats
router.get('/stats/overview', codeCollaboration_controller_1.getSessionStats);
// Invite system routes
router.post('/:sessionId/invite-code', codeCollaboration_controller_1.generateInviteCode);
router.post('/join/:inviteCode', codeCollaboration_controller_1.joinByInviteCode);
router.get('/join/:inviteCode', codeCollaboration_controller_1.getSessionByInviteCode);
router.post('/:sessionId/invite', codeCollaboration_controller_1.inviteUser);
exports.default = router;
