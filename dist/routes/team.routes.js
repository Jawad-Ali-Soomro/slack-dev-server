"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middlewares_1 = require("../middlewares");
const team_controller_1 = require("../controllers/team.controller");
const teamRouter = express_1.default.Router();
// Team CRUD operations
teamRouter.post('/', middlewares_1.authenticate, team_controller_1.createTeam);
teamRouter.get('/', middlewares_1.authenticate, team_controller_1.getTeams);
teamRouter.get('/stats', middlewares_1.authenticate, team_controller_1.getTeamStats);
teamRouter.get('/:teamId', middlewares_1.authenticate, team_controller_1.getTeamById);
teamRouter.put('/:teamId', middlewares_1.authenticate, team_controller_1.updateTeam);
teamRouter.delete('/:teamId', middlewares_1.authenticate, team_controller_1.deleteTeam);
// Team member management
teamRouter.post('/:teamId/members', middlewares_1.authenticate, team_controller_1.addMember);
teamRouter.delete('/:teamId/members', middlewares_1.authenticate, team_controller_1.removeMember);
teamRouter.put('/:teamId/members/role', middlewares_1.authenticate, team_controller_1.updateMemberRole);
// Get team members for assignment dropdowns
teamRouter.get('/:teamId/members', middlewares_1.authenticate, team_controller_1.getTeamMembers);
exports.default = teamRouter;
