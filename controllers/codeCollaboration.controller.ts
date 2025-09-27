import { Request, Response } from 'express';
import { CodeCollaborationService } from '../services/codeCollaborationService';
import { CreateCodeSessionRequest, JoinCodeSessionRequest, LeaveCodeSessionRequest, UpdateCodeRequest, UpdateCursorRequest } from '../interfaces/codeCollaboration.interfaces';
import { catchAsync } from '../utils/catchAsync';

// Create a new code session
export const createSession = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const sessionData: CreateCodeSessionRequest = req.body;


  const session = await CodeCollaborationService.createSession(userId, sessionData);

  res.status(201).json({
    success: true,
    message: 'Code session created successfully',
    session
  });
});

// Get session by ID
export const getSessionById = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;


  const session = await CodeCollaborationService.getSessionById(sessionId, userId);

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
export const getUserSessions = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { page = 1, limit = 10 } = req.query;


  const result = await CodeCollaborationService.getUserSessions(
    userId,
    parseInt(page as string),
    parseInt(limit as string)
  );

  res.status(200).json({
    success: true,
    ...result
  });
});

// Get public sessions
export const getPublicSessions = catchAsync(async (req: any, res: Response) => {
  const { page = 1, limit = 10, language } = req.query;


  const result = await CodeCollaborationService.getPublicSessions(
    parseInt(page as string),
    parseInt(limit as string),
    language as string
  );

  res.status(200).json({
    success: true,
    ...result
  });
});

// Join a session
export const joinSession = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;


  const session = await CodeCollaborationService.joinSession(sessionId, userId);

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
export const leaveSession = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;


  const success = await CodeCollaborationService.leaveSession(sessionId, userId);

  if (!success) {
    return res.status(404).json({
      success: false,
      message: `Session ${sessionId} not found or user ${userId} not in session`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Left session successfully'
  });
});

// Update code
export const updateCode = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;
  const { code, cursorPosition }: UpdateCodeRequest = req.body;


  const success = await CodeCollaborationService.updateCode(sessionId, userId, code, cursorPosition);

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
export const updateCursor = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;
  const { cursorPosition }: UpdateCursorRequest = req.body;


  const success = await CodeCollaborationService.updateCursor(sessionId, userId, cursorPosition);

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
export const getSessionStats = catchAsync(async (req: any, res: Response) => {

  const stats = await CodeCollaborationService.getSessionStats();

  res.status(200).json({
    success: true,
    stats
  });
});

// End a session (owner only)
export const endSession = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;


  const success = await CodeCollaborationService.endSession(sessionId, userId);

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
export const deleteSession = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;

  const success = await CodeCollaborationService.deleteSession(sessionId, userId);

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
export const generateInviteCode = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;

  const result = await CodeCollaborationService.generateInviteCode(sessionId, userId);

  res.status(200).json({
    success: true,
    message: 'Invite code generated successfully',
    data: result
  });
});

// Join session by invite code
export const joinByInviteCode = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { inviteCode } = req.params;

  const session = await CodeCollaborationService.joinByInviteCode(inviteCode, userId);

  res.status(200).json({
    success: true,
    message: 'Joined session successfully',
    data: session
  });
});

// Get session by invite code (for preview)
export const getSessionByInviteCode = catchAsync(async (req: any, res: Response) => {
  const { inviteCode } = req.params;

  const result = await CodeCollaborationService.getSessionByInviteCode(inviteCode);

  res.status(200).json({
    success: true,
    data: result
  });
});

// Invite user to session
export const inviteUser = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id.toString();
  const { sessionId } = req.params;
  const { invitedUserId } = req.body;

  const success = await CodeCollaborationService.inviteUser(sessionId, userId, invitedUserId);

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
