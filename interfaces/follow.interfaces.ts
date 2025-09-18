export interface FollowRequest {
  userId: string;
}

export interface FollowResponse {
  id: string;
  follower: {
    id: string;
    username: string;
    avatar?: string;
  };
  following: {
    id: string;
    username: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

export interface NotificationResponse {
  id: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
  type: "follow_request" | "follow_accepted" | "follow_rejected";
  message: string;
  isRead: boolean;
  followId?: string;
  createdAt: Date;
}

export interface UserFollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followStatus?: "pending" | "accepted" | "rejected";
}
