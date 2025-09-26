import { IUser } from './user.interface';

export interface CreateCodeSessionRequest {
  title: string;
  description?: string;
  language: string;
  code?: string;
  isPublic?: boolean;
  maxParticipants?: number;
  tags?: string[];
}

export interface JoinCodeSessionRequest {
  sessionId: string;
}

export interface LeaveCodeSessionRequest {
  sessionId: string;
}

export interface UpdateCodeRequest {
  sessionId: string;
  code: string;
  cursorPosition?: {
    line: number;
    column: number;
  };
}

export interface UpdateCursorRequest {
  sessionId: string;
  cursorPosition: {
    line: number;
    column: number;
  };
}

export interface CodeSessionResponse {
  _id: string;
  title: string;
  description?: string;
  language: string;
  code: string;
  owner: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  participants: Array<{
    user: {
      _id: string;
      username: string;
      email: string;
      avatar?: string;
    };
    joinedAt: string;
    lastActive: string;
    cursorPosition?: {
      line: number;
      column: number;
    };
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  maxParticipants: number;
  isPublic: boolean;
  inviteCode?: string;
  invitedUsers?: string[];
  tags?: string[];
  participantCount: number;
}

export interface CodeSessionStats {
  totalSessions: number;
  activeSessions: number;
  totalParticipants: number;
  averageSessionDuration: number;
  popularLanguages: Array<{
    language: string;
    count: number;
  }>;
}

// Socket events
export interface SocketCodeEvents {
  // Client to Server
  'join_session': (data: { sessionId: string }) => void;
  'leave_session': (data: { sessionId: string }) => void;
  'code_change': (data: { sessionId: string; code: string; cursorPosition?: { line: number; column: number } }) => void;
  'cursor_move': (data: { sessionId: string; cursorPosition: { line: number; column: number } }) => void;
  'user_typing': (data: { sessionId: string; isTyping: boolean }) => void;
  
  // Server to Client
  'session_joined': (data: { session: CodeSessionResponse }) => void;
  'session_left': (data: { sessionId: string }) => void;
  'code_updated': (data: { sessionId: string; code: string; updatedBy: string; cursorPosition?: { line: number; column: number } }) => void;
  'cursor_updated': (data: { sessionId: string; userId: string; cursorPosition: { line: number; column: number } }) => void;
  'user_joined_session': (data: { sessionId: string; user: IUser; participantCount: number }) => void;
  'user_left_session': (data: { sessionId: string; userId: string; participantCount: number }) => void;
  'user_typing_session': (data: { sessionId: string; userId: string; isTyping: boolean }) => void;
  'session_ended': (data: { sessionId: string; reason: string }) => void;
}

export interface CodeCollaborationUser extends IUser {
  cursorPosition?: {
    line: number;
    column: number;
  };
  isTyping?: boolean;
  joinedAt?: Date;
  lastActive?: Date;
}
