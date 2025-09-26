"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = exports.getSessionByInviteCode = exports.joinByInviteCode = exports.generateInviteCode = exports.deleteSession = exports.endSession = exports.getSessionStats = exports.updateCursor = exports.updateCode = exports.leaveSession = exports.joinSession = exports.getPublicSessions = exports.getUserSessions = exports.getSessionById = exports.createSession = void 0;
const codeCollaborationService_1 = require("../services/codeCollaborationService");
const catchAsync_1 = require("../utils/catchAsync");
// Create a new code session
exports.createSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const sessionData = req.body;
    const session = await codeCollaborationService_1.CodeCollaborationService.createSession(userId, sessionData);
    res.status(201).json({
        success: true,
        message: 'Code session created successfully',
        session
    });
});
// Get session by ID
exports.getSessionById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const session = await codeCollaborationService_1.CodeCollaborationService.getSessionById(sessionId, userId);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or access denied'
        });
    }
    res.status(200).json({
        success: true,
        session
    });
});
// Get user's sessions
exports.getUserSessions = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { page = 1, limit = 10 } = req.query;
    const result = await codeCollaborationService_1.CodeCollaborationService.getUserSessions(userId, parseInt(page), parseInt(limit));
    res.status(200).json({
        success: true,
        ...result
    });
});
// Get public sessions
exports.getPublicSessions = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { page = 1, limit = 10, language } = req.query;
    const result = await codeCollaborationService_1.CodeCollaborationService.getPublicSessions(parseInt(page), parseInt(limit), language);
    res.status(200).json({
        success: true,
        ...result
    });
});
// Join a session
exports.joinSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const session = await codeCollaborationService_1.CodeCollaborationService.joinSession(sessionId, userId);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or is full'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Joined session successfully',
        session
    });
});
// Leave a session
exports.leaveSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const success = await codeCollaborationService_1.CodeCollaborationService.leaveSession(sessionId, userId);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or user not in session'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Left session successfully'
    });
});
// Update code
exports.updateCode = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const { code, cursorPosition } = req.body;
    const success = await codeCollaborationService_1.CodeCollaborationService.updateCode(sessionId, userId, code, cursorPosition);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or user not in session'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Code updated successfully'
    });
});
// Update cursor position
exports.updateCursor = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const { cursorPosition } = req.body;
    const success = await codeCollaborationService_1.CodeCollaborationService.updateCursor(sessionId, userId, cursorPosition);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or user not in session'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Cursor updated successfully'
    });
});
// Get session stats
exports.getSessionStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stats = await codeCollaborationService_1.CodeCollaborationService.getSessionStats();
    res.status(200).json({
        success: true,
        stats
    });
});
// End a session (owner only)
exports.endSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const success = await codeCollaborationService_1.CodeCollaborationService.endSession(sessionId, userId);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or user is not the owner'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Session ended successfully'
    });
});
// Delete a session permanently (owner only)
exports.deleteSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const success = await codeCollaborationService_1.CodeCollaborationService.deleteSession(sessionId, userId);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or you are not the owner'
        });
    }
    res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
    });
});
// Generate invite code for a session
exports.generateInviteCode = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const result = await codeCollaborationService_1.CodeCollaborationService.generateInviteCode(sessionId, userId);
    res.status(200).json({
        success: true,
        message: 'Invite code generated successfully',
        data: result
    });
});
// Join session by invite code
exports.joinByInviteCode = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { inviteCode } = req.params;
    const session = await codeCollaborationService_1.CodeCollaborationService.joinByInviteCode(inviteCode, userId);
    res.status(200).json({
        success: true,
        message: 'Joined session successfully',
        data: session
    });
});
// Get session by invite code (for preview)
exports.getSessionByInviteCode = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { inviteCode } = req.params;
    const result = await codeCollaborationService_1.CodeCollaborationService.getSessionByInviteCode(inviteCode);
    res.status(200).json({
        success: true,
        data: result
    });
});
// Invite user to session
exports.inviteUser = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user._id.toString();
    const { sessionId } = req.params;
    const { invitedUserId } = req.body;
    const success = await codeCollaborationService_1.CodeCollaborationService.inviteUser(sessionId, userId, invitedUserId);
    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Session not found or you are not the owner'
        });
    }
    res.status(200).json({
        success: true,
        message: 'User invited successfully'
    });
});
