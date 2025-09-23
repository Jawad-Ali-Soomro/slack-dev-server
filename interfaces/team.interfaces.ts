export interface ITeam {
  _id: string
  name: string
  description?: string
  createdBy: string
  members: Array<{
    user: {
      id: string
      username: string
      email: string
      avatar?: string
    }
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
  }>
  projects: string[]
  isActive: boolean
  settings: {
    allowMemberInvites: boolean
    allowProjectCreation: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface CreateTeamRequest {
  name: string
  description?: string
  members?: string[]
  settings?: {
    allowMemberInvites?: boolean
    allowProjectCreation?: boolean
  }
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  isActive?: boolean
  settings?: {
    allowMemberInvites?: boolean
    allowProjectCreation?: boolean
  }
}

export interface TeamResponse {
  id: string
  name: string
  description?: string
  createdBy: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  members: Array<{
    user: {
      id: string
      username: string
      email: string
      avatar?: string
    }
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
  }>
  projects: Array<{
    id: string
    name: string
    logo?: string
  }>
  isActive: boolean
  settings: {
    allowMemberInvites: boolean
    allowProjectCreation: boolean
  }
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

export interface AddTeamMemberRequest {
  userId: string
  role?: 'admin' | 'member'
}

export interface UpdateTeamMemberRoleRequest {
  userId: string
  role: 'admin' | 'member'
}

export interface RemoveTeamMemberRequest {
  userId: string
}

export interface TeamStatsResponse {
  totalTeams: number
  activeTeams: number
  totalMembers: number
  totalProjects: number
  teamsByRole: {
    owner: number
    admin: number
    member: number
  }
}
