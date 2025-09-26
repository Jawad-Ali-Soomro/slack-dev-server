import { Request } from 'express';

export interface IChatRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface CreateChatRequest {
  participants: string[];
  type: 'direct' | 'group';
  name?: string;
  description?: string;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  attachments?: string[];
  replyTo?: string;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface ChatResponse {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  lastMessage?: {
    _id: string;
    content: string;
    sender: string;
    createdAt: Date;
  };
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageResponse {
  _id: string;
  chat: string;
  sender: {
    username: string;
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  attachments?: string[];
  replyTo?: {
    _id: string;
    content: string;
    sender: string;
  };
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  readBy: Array<{
    user: string;
    readAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocketUser {
  userId: string;
  socketId: string;
  isOnline: boolean;
  lastSeen?: Date;
}
