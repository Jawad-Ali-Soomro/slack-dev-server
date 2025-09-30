"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskStats = exports.clearTaskCaches = exports.deleteTask = exports.reassignTask = exports.updateTaskStatus = exports.updateTask = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const redis_service_1 = __importDefault(require("../services/redis.service"));
const formatTaskResponse = (task) => ({
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignTo: task.assignTo ? {
        id: task.assignTo._id.toString(),
        username: task.assignTo.username,
        avatar: task.assignTo.avatar
    } : {
        id: 'deleted-user',
        username: 'Deleted User',
        avatar: undefined
    },
    assignedBy: task.assignedBy ? {
        id: task.assignedBy._id.toString(),
        username: task.assignedBy.username,
        avatar: task.assignedBy.avatar
    } : {
        id: 'deleted-user',
        username: 'Deleted User',
        avatar: undefined
    },
    project: task.projectId ? {
        id: task.projectId._id.toString(),
        name: task.projectId.name,
        logo: task.projectId.logo
    } : null,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
});
// Create task with Redis caching
exports.createTask = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { title, description, priority, assignTo, dueDate, tags, projectId } = req.body;
    const assignedBy = req.user._id;
    const assignToUser = await models_1.User.findById(assignTo);
    if (!assignToUser) {
        return res.status(404).json({ message: "AssignedTo user not found" });
    }
    const task = await models_1.Task.create({
        title,
        description,
        priority,
        assignTo,
        assignedBy,
        projectId: projectId || undefined,
        dueDate,
        tags: tags || [],
    });
    await task.populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ]);
    // Cache the new task
    await redis_service_1.default.cacheTask(task._id.toString(), formatTaskResponse(task));
    // Add task to project if projectId is provided
    if (projectId) {
        const { Project } = await Promise.resolve().then(() => __importStar(require('../models/project.model')));
        await Project.findByIdAndUpdate(projectId, {
            $addToSet: { tasks: task._id }
        });
        // Invalidate project cache
        await redis_service_1.default.invalidateProject(projectId);
        await redis_service_1.default.invalidatePattern(`user:${assignedBy}:projects:*`);
        await redis_service_1.default.invalidatePattern(`user:${assignTo}:projects:*`);
    }
    // Invalidate all task-related caches
    await redis_service_1.default.invalidateUserTasks(assignedBy.toString());
    await redis_service_1.default.invalidateUserTasks(assignTo);
    await redis_service_1.default.invalidateDashboardData(assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(assignTo);
    // Invalidate all task query caches (pattern-based)
    await redis_service_1.default.invalidatePattern('tasks:*');
    // Create notification
    await models_1.Notification.create({
        recipient: assignTo,
        sender: assignedBy,
        type: "task_assigned",
        message: `${req.user.username} assigned you a new task: "${title}"`,
        taskId: task._id
    });
    res.status(201).json({
        message: "Task created and assigned successfully",
        task: formatTaskResponse(task)
    });
});
// Get tasks with Redis caching
exports.getTasks = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { status, priority, assignTo, assignedBy, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Try to get from cache first
    const cacheKey = `tasks:${JSON.stringify({ status, priority, assignTo, assignedBy, page, limit })}`;
    const cachedTasks = await redis_service_1.default.get(cacheKey);
    if (cachedTasks) {
        return res.status(200).json(cachedTasks);
    }
    const filter = {};
    if (status)
        filter.status = status;
    if (priority)
        filter.priority = priority;
    if (assignTo)
        filter.assignTo = assignTo;
    if (assignedBy)
        filter.assignedBy = assignedBy;
    const tasks = await models_1.Task.find(filter)
        .populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await models_1.Task.countDocuments(filter);
    const response = {
        tasks: tasks.map(formatTaskResponse),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    };
    // Cache the response for 5 minutes
    await redis_service_1.default.set(cacheKey, response, 300);
    res.status(200).json(response);
});
// Get task by ID with Redis caching
exports.getTaskById = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { taskId } = req.params;
    // Try cache first
    const cachedTask = await redis_service_1.default.getTask(taskId);
    if (cachedTask) {
        return res.status(200).json({ task: cachedTask });
    }
    const task = await models_1.Task.findById(taskId).populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" },
        { path: "projectId", select: "name logo" }
    ]);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    const taskResponse = formatTaskResponse(task);
    // Cache the task
    await redis_service_1.default.cacheTask(taskId, taskResponse);
    res.status(200).json({ task: taskResponse });
});
// Update task with comprehensive editing
exports.updateTask = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;
    const currentUserId = req.user._id;
    const originalTask = await models_1.Task.findById(taskId);
    if (!originalTask) {
        return res.status(404).json({ message: "Task not found" });
    }
    // Only the user who assigned the task can update it
    if (originalTask.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this task can update it" });
    }
    const task = await models_1.Task.findByIdAndUpdate(taskId, { ...updates }, { new: true, runValidators: true }).populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" }
    ]);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    const taskResponse = formatTaskResponse(task);
    // Update cache
    await redis_service_1.default.cacheTask(taskId, taskResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserTasks(originalTask.assignedBy.toString());
    await redis_service_1.default.invalidateUserTasks(originalTask.assignTo.toString());
    await redis_service_1.default.invalidateDashboardData(originalTask.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(originalTask.assignTo.toString());
    await redis_service_1.default.invalidatePattern('tasks:*');
    // Invalidate project cache if task has projectId
    if (originalTask.projectId) {
        await redis_service_1.default.invalidateProject(originalTask.projectId.toString());
        await redis_service_1.default.invalidatePattern(`user:${originalTask.assignedBy}:projects:*`);
        await redis_service_1.default.invalidatePattern(`user:${originalTask.assignTo}:projects:*`);
    }
    // Create notification for assignee
    await models_1.Notification.create({
        recipient: task.assignTo,
        sender: currentUserId,
        type: "task_updated",
        message: `${req.user.username} updated task "${task.title}"`,
        taskId: task._id
    });
    res.status(200).json({
        message: "Task updated successfully",
        task: taskResponse
    });
});
// Update task status (only by assignee)
exports.updateTaskStatus = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    const currentUserId = req.user._id;
    const task = await models_1.Task.findById(taskId);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    // Only the assigned user can update task status
    if (task.assignTo.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the assigned user can update task status" });
    }
    task.status = status;
    await task.save();
    await task.populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" }
    ]);
    const taskResponse = formatTaskResponse(task);
    // Update cache
    await redis_service_1.default.cacheTask(taskId, taskResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserTasks(task.assignedBy.toString());
    await redis_service_1.default.invalidateUserTasks(task.assignTo.toString());
    await redis_service_1.default.invalidateDashboardData(task.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(task.assignTo.toString());
    await redis_service_1.default.invalidatePattern('tasks:*');
    // Invalidate project cache if task has projectId
    if (task.projectId) {
        await redis_service_1.default.invalidateProject(task.projectId.toString());
        await redis_service_1.default.invalidatePattern(`user:${task.assignedBy}:projects:*`);
        await redis_service_1.default.invalidatePattern(`user:${task.assignTo}:projects:*`);
    }
    // Create notification for assigner
    await models_1.Notification.create({
        recipient: task.assignedBy,
        sender: currentUserId,
        type: "task_status_updated",
        message: `${req.user.username} updated task "${task.title}" status to ${status}`,
        taskId: task._id
    });
    res.status(200).json({
        message: "Task status updated successfully",
        task: taskResponse
    });
});
// Reassign task
exports.reassignTask = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { taskId } = req.params;
    const { assignTo } = req.body;
    const currentUserId = req.user._id;
    const task = await models_1.Task.findById(taskId);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    // Only the user who assigned the task can reassign it
    if (task.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this task can reassign it" });
    }
    const newAssignee = await models_1.User.findById(assignTo);
    if (!newAssignee) {
        return res.status(404).json({ message: "New assignee not found" });
    }
    const oldAssignee = task.assignTo;
    task.assignTo = assignTo;
    await task.save();
    await task.populate([
        { path: "assignTo", select: "username avatar" },
        { path: "assignedBy", select: "username avatar" }
    ]);
    const taskResponse = formatTaskResponse(task);
    // Update cache
    await redis_service_1.default.cacheTask(taskId, taskResponse);
    // Invalidate related caches
    await redis_service_1.default.invalidateUserTasks(task.assignedBy.toString());
    await redis_service_1.default.invalidateUserTasks(oldAssignee.toString());
    await redis_service_1.default.invalidateUserTasks(assignTo);
    await redis_service_1.default.invalidateDashboardData(task.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(oldAssignee.toString());
    await redis_service_1.default.invalidateDashboardData(assignTo);
    await redis_service_1.default.invalidatePattern('tasks:*');
    // Create notifications
    await models_1.Notification.create({
        recipient: assignTo,
        sender: currentUserId,
        type: "task_reassigned",
        message: `${req.user.username} reassigned task "${task.title}" to you`,
        taskId: task._id
    });
    await models_1.Notification.create({
        recipient: oldAssignee,
        sender: currentUserId,
        type: "task_unassigned",
        message: `Task "${task.title}" has been reassigned`,
        taskId: task._id
    });
    res.status(200).json({
        message: "Task reassigned successfully",
        task: taskResponse
    });
});
// Delete task
exports.deleteTask = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { taskId } = req.params;
    const currentUserId = req.user._id;
    const task = await models_1.Task.findById(taskId);
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    // Only the user who assigned the task can delete it
    if (task.assignedBy.toString() !== currentUserId.toString()) {
        return res.status(403).json({ message: "Only the user who assigned this task can delete it" });
    }
    await models_1.Task.findByIdAndDelete(taskId);
    // Invalidate caches
    await redis_service_1.default.invalidateTask(taskId);
    await redis_service_1.default.invalidateUserTasks(task.assignedBy.toString());
    await redis_service_1.default.invalidateUserTasks(task.assignTo.toString());
    await redis_service_1.default.invalidateDashboardData(task.assignedBy.toString());
    await redis_service_1.default.invalidateDashboardData(task.assignTo.toString());
    await redis_service_1.default.invalidatePattern('tasks:*');
    res.status(200).json({ message: "Task deleted successfully" });
});
// Clear all task caches
exports.clearTaskCaches = (0, middlewares_1.catchAsync)(async (req, res) => {
    await redis_service_1.default.invalidatePattern('tasks:*');
    await redis_service_1.default.invalidatePattern('user:*:tasks');
    await redis_service_1.default.invalidatePattern('dashboard:*');
    res.status(200).json({ message: "All task caches cleared successfully" });
});
// Get task statistics
exports.getTaskStats = (0, middlewares_1.catchAsync)(async (req, res) => {
    const currentUserId = req.user._id;
    // Try cache first
    const cachedStats = await redis_service_1.default.get(`task_stats:${currentUserId}`);
    if (cachedStats) {
        return res.status(200).json(cachedStats);
    }
    const totalTasks = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }]
    });
    const completedTasks = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        status: "completed"
    });
    const pendingTasks = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        status: "pending"
    });
    const inProgressTasks = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        status: "in_progress"
    });
    const overdueTasks = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        dueDate: { $lt: new Date() },
        status: { $ne: "completed" }
    });
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const tasksThisWeek = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        createdAt: { $gte: oneWeekAgo }
    });
    const tasksThisMonth = await models_1.Task.countDocuments({
        $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
        createdAt: { $gte: oneMonthAgo }
    });
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        tasksThisWeek,
        tasksThisMonth,
        completionRate: parseFloat(completionRate.toFixed(2))
    };
    // Cache stats for 5 minutes
    await redis_service_1.default.set(`task_stats:${currentUserId}`, stats, 300);
    res.status(200).json(stats);
});
