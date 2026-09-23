import express from 'express'
import { authenticate } from '../middlewares/index'
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

// global authentication middleware
teamRouter.use(authenticate)

teamRouter.post('/', createTeam)
teamRouter.get('/', getTeams)
teamRouter.get('/stats', getTeamStats)
teamRouter.get('/:teamId', getTeamById)
teamRouter.put('/:teamId', updateTeam)
teamRouter.delete('/:teamId', deleteTeam)

teamRouter.post('/:teamId/members', addMember)
teamRouter.delete('/:teamId/members', removeMember)
teamRouter.put('/:teamId/members/role', updateMemberRole)

teamRouter.get('/:teamId/members', getTeamMembers)

export default teamRouter
