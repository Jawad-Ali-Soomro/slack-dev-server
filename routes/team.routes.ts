import express from 'express'
import { authenticate } from '../middlewares'
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateMemberRole,
  getTeamStats,
  getTeamMembers
} from '../controllers/team.controller'

const teamRouter = express.Router()

// Team CRUD operations
teamRouter.post('/', authenticate, createTeam)
teamRouter.get('/', authenticate, getTeams)
teamRouter.get('/stats', authenticate, getTeamStats)
teamRouter.get('/:teamId', authenticate, getTeamById)
teamRouter.put('/:teamId', authenticate, updateTeam)
teamRouter.delete('/:teamId', authenticate, deleteTeam)

// Team member management
teamRouter.post('/:teamId/members', authenticate, addMember)
teamRouter.delete('/:teamId/members', authenticate, removeMember)
teamRouter.put('/:teamId/members/role', authenticate, updateMemberRole)

// Get team members for assignment dropdowns
teamRouter.get('/:teamId/members', authenticate, getTeamMembers)

export default teamRouter
