import { IUser } from "./user.interface"


export interface ProjectMember {
  user: IUser
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: Date
}

export interface ProjectLink {
  _id?: string
  title: string
  url: string
  type: 'repository' | 'documentation' | 'design' | 'other'
}

export interface ProjectSettings {
  allowMemberInvites: boolean
  allowMemberTasks: boolean
  allowMemberMeetings: boolean
}

export interface ProjectStats {
  totalTasks: number
  completedTasks: number
  totalMeetings: number
  completedMeetings: number
  totalMembers: number
}

export interface IProject {
  _id: string
  name: string
  description: string
  logo?: string
  media?: string[]
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: Date
  endDate?: Date
  createdBy: IUser
  teamId?: string
  members: ProjectMember[]
  links: ProjectLink[]
  tags: string[]
  progress: number
  isPublic: boolean
  settings: ProjectSettings
  stats: ProjectStats
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectRequest {
  name: string
  description: string
  logo?: string
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate: string
  endDate?: string
  teamId?: string
  members?: string[] // User IDs
  links?: ProjectLink[]
  tags?: string[]
  isPublic?: boolean
  settings?: Partial<ProjectSettings>
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  logo?: string
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  teamId?: string
  links?: ProjectLink[]
  tags?: string[]
  isPublic?: boolean
  settings?: Partial<ProjectSettings>
}

export interface ProjectResponse {
  id: string
  name: string
  description: string
  logo?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: Date
  endDate?: Date
  createdBy: IUser
  teamId?: string
  members: ProjectMember[]
  links: ProjectLink[]
  tags: string[]
  progress: number
  isPublic: boolean
  settings: ProjectSettings
  stats: ProjectStats
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    assignTo: {
      id: string
      username: string
      avatar?: string
    }
  }>
  meetings: Array<{
    id: string
    title: string
    status: string
    type: string
    startDate: Date
    assignedTo: {
      id: string
      username: string
      avatar?: string
    }
  }>
  createdAt: Date
  updatedAt: Date
}

export interface ProjectStatsResponse {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  cancelledProjects: number
  totalMembers: number
  totalTasks: number
  completedTasks: number
  totalMeetings: number
  completedMeetings: number
  averageProgress: number
  projectsByPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  projectsByStatus: {
    planning: number
    active: number
    on_hold: number
    completed: number
    cancelled: number
  }
}

export interface AddMemberRequest {
  userId: string
  role: 'admin' | 'member' | 'viewer'
}

export interface UpdateMemberRoleRequest {
  userId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

export interface AddLinkRequest {
  title: string
  url: string
  type: 'repository' | 'documentation' | 'design' | 'other'
}

export interface UpdateLinkRequest {
  linkId: string
  title?: string
  url?: string
  type?: 'repository' | 'documentation' | 'design' | 'other'
}

export interface RemoveLinkRequest {
  linkId: string
}

export interface RemoveMemberRequest {
  userId: string
}
