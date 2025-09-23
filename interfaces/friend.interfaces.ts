import { IUser } from './user.interface'

export interface FriendRequestResponse {
  id: string
  sender: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  receiver: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

export interface FriendshipResponse {
  id: string
  friend: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  createdAt: Date
}

export interface SendFriendRequestRequest {
  receiverId: string
}

export interface RespondToFriendRequestRequest {
  requestId: string
  action: 'accept' | 'reject'
}

export interface FriendStatsResponse {
  totalFriends: number
  pendingSentRequests: number
  pendingReceivedRequests: number
}

