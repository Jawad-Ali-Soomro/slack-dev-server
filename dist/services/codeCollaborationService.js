"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeCollaborationService = void 0;
const models_1 = require("../models");
const helpers_1 = require("../helpers");
class CodeCollaborationService {
    // Create a new code session
    static async createSession(userId, sessionData) {
        try {
            const session = new models_1.CodeSession({
                ...sessionData,
                owner: userId,
                participants: [{
                        user: userId,
                        joinedAt: new Date(),
                        lastActive: new Date()
                    }]
            });
            await session.save();
            await session.populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ]);
            return this.formatSessionResponse(session);
        }
        catch (error) {
            helpers_1.logger.error('Error creating code session:', error);
            throw new Error('Failed to create code session');
        }
    }
    // Get session by ID
    static async getSessionById(sessionId, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true,
                $or: [
                    { owner: userId },
                    { 'participants.user': userId }
                ]
            }).populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ]);
            if (!session) {
                return null;
            }
            return this.formatSessionResponse(session);
        }
        catch (error) {
            helpers_1.logger.error('Error getting code session:', error);
            throw new Error('Failed to get code session');
        }
    }
    // Get user's sessions
    static async getUserSessions(userId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const sessions = await models_1.CodeSession.find({
                isActive: true,
                $or: [
                    { owner: userId },
                    { 'participants.user': userId },
                    { invitedUsers: userId },
                    { isPublic: true }
                ]
            })
                .populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ])
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit);
            const total = await models_1.CodeSession.countDocuments({
                isActive: true,
                $or: [
                    { owner: userId },
                    { 'participants.user': userId }
                ]
            });
            return {
                sessions: sessions.map(session => this.formatSessionResponse(session)),
                total,
                pages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            helpers_1.logger.error('Error getting user sessions:', error);
            throw new Error('Failed to get user sessions');
        }
    }
    // Get public sessions
    static async getPublicSessions(page = 1, limit = 10, language) {
        try {
            const skip = (page - 1) * limit;
            const query = {
                isActive: true,
                isPublic: true
            };
            if (language) {
                query.language = language;
            }
            const sessions = await models_1.CodeSession.find(query)
                .populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const total = await models_1.CodeSession.countDocuments(query);
            return {
                sessions: sessions.map(session => this.formatSessionResponse(session)),
                total,
                pages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            helpers_1.logger.error('Error getting public sessions:', error);
            throw new Error('Failed to get public sessions');
        }
    }
    // Join a session
    static async joinSession(sessionId, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true
            });
            if (!session) {
                return null;
            }
            // Check if user is already a participant
            const existingParticipant = session.participants.find((p) => p.user.toString() === userId);
            if (existingParticipant) {
                // Update last active time
                existingParticipant.lastActive = new Date();
                await session.save();
            }
            else {
                // Add new participant
                if (session.participants.length < (session.maxParticipants || 10)) {
                    session.participants.push({
                        user: userId, // Convert string to ObjectId
                        joinedAt: new Date(),
                        lastActive: new Date()
                    });
                    await session.save();
                }
                else {
                    throw new Error('Session is full or user cannot be added');
                }
            }
            await session.populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ]);
            return this.formatSessionResponse(session);
        }
        catch (error) {
            helpers_1.logger.error('Error joining session:', error);
            throw new Error('Failed to join session');
        }
    }
    // Leave a session
    static async leaveSession(sessionId, userId) {
        try {
            helpers_1.logger.info('Attempting to leave session:', { sessionId, userId });
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true
            });
            if (!session) {
                helpers_1.logger.error(`Session ${sessionId} not found or inactive for user ${userId}`);
                return false;
            }
            helpers_1.logger.info('Session found, participants:', session.participants.map(p => ({
                userId: p.user.toString(),
                joinedAt: p.joinedAt
            })));
            // Remove participant
            const participantIndex = session.participants.findIndex((p) => p.user.toString() === userId);
            if (participantIndex !== -1) {
                helpers_1.logger.info('Participant found, removing:', { participantIndex, userId });
                session.participants.splice(participantIndex, 1);
                await session.save();
                helpers_1.logger.info('Participant removed successfully');
                return true;
            }
            helpers_1.logger.error(`User ${userId} not found in session ${sessionId}`);
            return false;
        }
        catch (error) {
            helpers_1.logger.error(`Error leaving session ${sessionId} for user ${userId}:`, error);
            throw new Error(`Failed to leave session ${sessionId}`);
        }
    }
    // End a session (owner only)
    static async endSession(sessionId, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true
            });
            if (!session) {
                return false;
            }
            // Check if user is the owner
            if (session.owner.toString() !== userId) {
                return false;
            }
            // End the session
            session.isActive = false;
            session.endedAt = new Date();
            await session.save();
            return true;
        }
        catch (error) {
            helpers_1.logger.error('Error ending session:', error);
            throw new Error('Failed to end session');
        }
    }
    // Delete a session permanently (owner only)
    static async deleteSession(sessionId, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId
            });
            if (!session) {
                return false;
            }
            // Check if user is the owner
            if (session.owner.toString() !== userId) {
                return false;
            }
            // Delete the session permanently
            await models_1.CodeSession.findByIdAndDelete(sessionId);
            return true;
        }
        catch (error) {
            helpers_1.logger.error('Error deleting session:', error);
            throw new Error('Failed to delete session');
        }
    }
    // Update code
    static async updateCode(sessionId, userId, code, cursorPosition) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true,
                'participants.user': userId
            });
            if (!session) {
                return false;
            }
            session.code = code;
            session.updatedAt = new Date();
            // Update participant activity
            const participant = session.participants.find((p) => p.user.toString() === userId);
            if (participant) {
                participant.lastActive = new Date();
                if (cursorPosition) {
                    participant.cursorPosition = cursorPosition;
                }
            }
            await session.save();
            return true;
        }
        catch (error) {
            helpers_1.logger.error('Error updating code:', error);
            throw new Error('Failed to update code');
        }
    }
    // Update cursor position
    static async updateCursor(sessionId, userId, cursorPosition) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                isActive: true,
                'participants.user': userId
            });
            if (!session) {
                return false;
            }
            const participant = session.participants.find((p) => p.user.toString() === userId);
            if (participant) {
                participant.lastActive = new Date();
                participant.cursorPosition = cursorPosition;
            }
            await session.save();
            return true;
        }
        catch (error) {
            helpers_1.logger.error('Error updating cursor:', error);
            throw new Error('Failed to update cursor');
        }
    }
    // Get session stats
    static async getSessionStats() {
        try {
            const totalSessions = await models_1.CodeSession.countDocuments();
            const activeSessions = await models_1.CodeSession.countDocuments({ isActive: true });
            const sessions = await models_1.CodeSession.find({ isActive: true }).populate('participants.user');
            const totalParticipants = sessions.reduce((sum, session) => sum + session.participants.length, 0);
            // Calculate average session duration
            const endedSessions = await models_1.CodeSession.find({
                isActive: false,
                endedAt: { $exists: true }
            });
            const averageDuration = endedSessions.length > 0
                ? endedSessions.reduce((sum, session) => {
                    const duration = session.endedAt.getTime() - session.createdAt.getTime();
                    return sum + duration;
                }, 0) / endedSessions.length / (1000 * 60) // Convert to minutes
                : 0;
            // Get popular languages
            const languageStats = await models_1.CodeSession.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$language', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            const popularLanguages = languageStats.map(stat => ({
                language: stat._id,
                count: stat.count
            }));
            return {
                totalSessions,
                activeSessions,
                totalParticipants,
                averageSessionDuration: Math.round(averageDuration),
                popularLanguages
            };
        }
        catch (error) {
            helpers_1.logger.error('Error getting session stats:', error);
            throw new Error('Failed to get session stats');
        }
    }
    // Format session response
    static formatSessionResponse(session) {
        return {
            _id: session._id.toString(),
            title: session.title,
            description: session.description,
            language: session.language,
            code: session.code,
            owner: {
                _id: session.owner._id.toString(),
                username: session.owner.username,
                email: session.owner.email,
                avatar: session.owner.avatar
            },
            participants: session.participants.map((p) => ({
                user: {
                    _id: p.user._id.toString(),
                    username: p.user.username,
                    email: p.user.email,
                    avatar: p.user.avatar
                },
                joinedAt: p.joinedAt.toISOString(),
                lastActive: p.lastActive.toISOString(),
                cursorPosition: p.cursorPosition
            })),
            isActive: session.isActive,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
            endedAt: session.endedAt?.toISOString(),
            maxParticipants: session.maxParticipants,
            isPublic: session.isPublic,
            tags: session.tags,
            participantCount: session.participants.length,
            inviteCode: session.inviteCode,
            invitedUsers: session.invitedUsers?.map((id) => id.toString()) || []
        };
    }
    // Generate invite code for a session
    static async generateInviteCode(sessionId, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                owner: userId,
                isActive: true
            });
            if (!session) {
                throw new Error('Session not found or you are not the owner');
            }
            // Generate invite code
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            session.inviteCode = result;
            await session.save();
            const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/code-collaboration/join/${result}`;
            return { inviteCode: result, inviteLink };
        }
        catch (error) {
            helpers_1.logger.error('Error generating invite code:', error);
            throw new Error('Failed to generate invite code');
        }
    }
    // Join session by invite code
    static async joinByInviteCode(inviteCode, userId) {
        try {
            const session = await models_1.CodeSession.findOne({
                inviteCode,
                isActive: true
            }).populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ]);
            if (!session) {
                throw new Error('Invalid invite code or session not found');
            }
            // // Check if user can join
            // const canJoin = session.isPublic || 
            //                session.invitedUsers?.includes(userId as any) || 
            //                session.owner.toString() === userId;
            // if (!canJoin) {
            //   throw new Error('You are not authorized to join this session');
            // }
            // Check if session is full
            if (session.participants.length >= (session.maxParticipants || 10)) {
                throw new Error('Session is full');
            }
            // Add user to invited users if not already there
            if (!session.invitedUsers?.includes(userId)) {
                if (!session.invitedUsers)
                    session.invitedUsers = [];
                session.invitedUsers.push(userId);
            }
            // Add user as participant if not already a participant
            const isAlreadyParticipant = session.participants.some((p) => p.user.toString() === userId);
            if (!isAlreadyParticipant) {
                session.participants.push({
                    user: userId,
                    joinedAt: new Date(),
                    lastActive: new Date()
                });
            }
            await session.save();
            return this.formatSessionResponse(session);
        }
        catch (error) {
            helpers_1.logger.error('Error joining by invite code:', error);
            throw new Error('Failed to join session');
        }
    }
    // Get session by invite code (for preview)
    static async getSessionByInviteCode(inviteCode) {
        try {
            const session = await models_1.CodeSession.findOne({
                inviteCode,
                isActive: true
            }).populate([
                { path: 'owner', select: 'username email avatar' },
                { path: 'participants.user', select: 'username email avatar' }
            ]);
            if (!session) {
                throw new Error('Invalid invite code or session not found');
            }
            return {
                session: this.formatSessionResponse(session),
                canJoin: true // For now, we'll let the frontend handle authorization
            };
        }
        catch (error) {
            helpers_1.logger.error('Error getting session by invite code:', error);
            throw new Error('Failed to get session');
        }
    }
    // Add user to invited list
    static async inviteUser(sessionId, userId, invitedUserId) {
        try {
            const session = await models_1.CodeSession.findOne({
                _id: sessionId,
                owner: userId,
                isActive: true
            });
            if (!session) {
                return false;
            }
            if (!session.invitedUsers?.includes(invitedUserId)) {
                if (!session.invitedUsers)
                    session.invitedUsers = [];
                session.invitedUsers.push(invitedUserId);
                await session.save();
                return true;
            }
            return false;
        }
        catch (error) {
            helpers_1.logger.error('Error inviting user:', error);
            throw new Error('Failed to invite user');
        }
    }
}
exports.CodeCollaborationService = CodeCollaborationService;
