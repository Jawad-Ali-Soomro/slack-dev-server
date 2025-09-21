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
  createdAt: Date;
}

export interface UserFollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface FollowersResponse {
  followers: Array<{
    id: string;
    username: string;
    avatar?: string;
    followedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FollowingResponse {
  following: Array<{
    id: string;
    username: string;
    avatar?: string;
    followedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
