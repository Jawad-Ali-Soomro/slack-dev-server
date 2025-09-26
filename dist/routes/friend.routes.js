"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middlewares_1 = require("../middlewares");
const friend_controller_1 = require("../controllers/friend.controller");
const friendRouter = express_1.default.Router();
// Send friend request
friendRouter.post('/request', middlewares_1.authenticate, friend_controller_1.sendFriendRequest);
// Get friend requests
friendRouter.get('/requests', middlewares_1.authenticate, friend_controller_1.getFriendRequests);
// Respond to friend request
friendRouter.post('/respond', middlewares_1.authenticate, friend_controller_1.respondToFriendRequest);
// Get friends list
friendRouter.get('/', middlewares_1.authenticate, friend_controller_1.getFriends);
// Remove friend
friendRouter.delete('/:friendId', middlewares_1.authenticate, friend_controller_1.removeFriend);
// Get friend stats
friendRouter.get('/stats', middlewares_1.authenticate, friend_controller_1.getFriendStats);
// Search users for friend requests
friendRouter.get('/search', middlewares_1.authenticate, friend_controller_1.searchUsersForFriends);
exports.default = friendRouter;
