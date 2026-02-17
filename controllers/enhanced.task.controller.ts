import getOverdueInfo from "../utils/formatDate";
import { sendMail } from "../utils";
import { catchAsync } from "../middlewares";
import { Task, User, Notification } from "../models";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskResponse,
} from "../interfaces";
import redisService from "../services/redis.service";
import buildTaskOverdueEmail from "../templates/taskOverdue";
import path from "path";

const formatTaskResponse = (task: any): TaskResponse => ({
  id: task._id.toString(),
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assignTo: task.assignTo
    ? {
        id: task.assignTo._id.toString(),
        username: task.assignTo.username,
        avatar: task.assignTo.avatar,
      }
    : {
        id: "deleted-user",
        username: "Deleted User",
        avatar: undefined,
      },
  assignedBy: task.assignedBy
    ? {
        id: task.assignedBy._id.toString(),
        username: task.assignedBy.username,
        avatar: task.assignedBy.avatar,
      }
    : {
        id: "deleted-user",
        username: "Deleted User",
        avatar: undefined,
      },
  project: task.projectId
    ? {
        id: task.projectId._id.toString(),
        name: task.projectId.name,
        logo: task.projectId.logo,
      }
    : null,
  dueDate: task.dueDate,
  tags: task.tags,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

export const createTask = catchAsync(async (req: any, res: any) => {
  const {
    title,
    description,
    priority,
    assignTo,
    dueDate,
    tags,
    projectId,
  }: CreateTaskRequest = req.body;
  const assignedBy = req.user._id;

  const assignToUser = await User.findById(assignTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignedTo user not found" });
  }

  const task = await Task.create({
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
    { path: "projectId", select: "name logo" },
  ]);

  await redisService.cacheTask(
    (task._id as any).toString(),
    formatTaskResponse(task),
  );

  if (projectId) {
    const { Project } = await import("../models/project.model");
    await Project.findByIdAndUpdate(projectId, {
      $addToSet: { tasks: task._id },
    });

    await redisService.invalidateProject(projectId);
    await redisService.invalidatePattern(`user:${assignedBy}:projects:*`);
    await redisService.invalidatePattern(`user:${assignTo}:projects:*`);
  }

  await redisService.invalidateUserTasks(assignedBy.toString());
  await redisService.invalidateUserTasks(assignTo);
  await redisService.invalidateDashboardData(assignedBy.toString());
  await redisService.invalidateDashboardData(assignTo);

  await redisService.invalidatePattern("tasks:*");

  await Notification.create({
    recipient: assignTo,
    sender: assignedBy,
    type: "task_assigned",
    message: `${req.user.username} assigned you a new task: "${title}"`,
    taskId: task._id,
  });

  res.status(201).json({
    message: "Task created and assigned successfully",
    task: formatTaskResponse(task),
  });
});

export const getTasks = catchAsync(async (req: any, res: any) => {
  const {
    status,
    priority,
    assignTo,
    assignedBy,
    page = 1,
  } = req.query;

  const cacheKey = `tasks:${JSON.stringify({ status, priority, assignTo, assignedBy, page })}`;
  const cachedTasks = await redisService.get(cacheKey);

  if (cachedTasks) {
    return res.status(200).json(cachedTasks);
  }

  const filter: any = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignTo) filter.assignTo = assignTo;
  if (assignedBy) filter.assignedBy = assignedBy;

  const tasks = await Task.find(filter)
    .populate([
      { path: "assignTo", select: "username avatar" },
      { path: "assignedBy", select: "username avatar" },
      { path: "projectId", select: "name logo" },
    ])
    .sort({ createdAt: -1 })

  const total = await Task.countDocuments(filter);

  const response = {
    tasks: tasks.map(formatTaskResponse),
    pagination: {
      total
    },
  };

  await redisService.set(cacheKey, response, 300);

  res.status(200).json(response);
});

export const sendOverdueTaskEmails = async () => {
  const overdueTasks = await Task.find({
    dueDate: { $lt: new Date() },
    status: { $ne: "completed" },
    overdueEmailSent: false,
  }).populate("assignTo", "username email");

  for (const task of overdueTasks) {
    const overdueBy = getOverdueInfo(task.dueDate);
    if (!overdueBy) continue;

    const emailPayload = buildTaskOverdueEmail({
      type: "TASK_OVERDUE",
      username: task.assignTo.username,
      taskTitle: task.title,
      taskDescription: task.description,
      dueDate: task.dueDate!.toDateString(),
      overdueBy,
      buttonUrl: `https://app.corestack.dev/tasks/${task._id}`,
      logoUrl: path.join(__dirname, "../public/logo.png")
    });

    await sendMail({
      to: task.assignTo.email,
      subject: `Task Overdue ${task.title}`,
      html: emailPayload.html,
      text: emailPayload.text,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(__dirname, "../public/logo.png"),
          cid: "logo",
        },
      ],
    });

    task.overdueEmailSent = true;
    await task.save({ validateBeforeSave: false });
  }
};

export const getTaskById = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;

  const cachedTask = await redisService.getTask(taskId);
  if (cachedTask) {
    return res.status(200).json({ task: cachedTask });
  }

  const task = await Task.findById(taskId).populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "projectId", select: "name logo" },
  ]);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  res.status(200).json({ task: taskResponse });
});

export const updateTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const updates: UpdateTaskRequest = req.body;
  const currentUserId = req.user._id;

  const originalTask = await Task.findById(taskId);
  if (!originalTask) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (originalTask.assignedBy.toString() !== currentUserId.toString()) {
    return res
      .status(403)
      .json({ message: "Only the user who assigned this task can update it" });
  }

  const task = await Task.findByIdAndUpdate(
    taskId,
    { ...updates },
    { new: true, runValidators: true },
  ).populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
  ]);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  await redisService.invalidateUserTasks(originalTask.assignedBy.toString());
  await redisService.invalidateUserTasks(originalTask.assignTo.toString());
  await redisService.invalidateDashboardData(
    originalTask.assignedBy.toString(),
  );
  await redisService.invalidateDashboardData(originalTask.assignTo.toString());
  await redisService.invalidatePattern("tasks:*");

  if (originalTask.projectId) {
    await redisService.invalidateProject(originalTask.projectId.toString());
    await redisService.invalidatePattern(
      `user:${originalTask.assignedBy}:projects:*`,
    );
    await redisService.invalidatePattern(
      `user:${originalTask.assignTo}:projects:*`,
    );
  }

  await Notification.create({
    recipient: task.assignTo,
    sender: currentUserId,
    type: "task_updated",
    message: `${req.user.username} updated task "${task.title}"`,
    taskId: task._id,
  });

  res.status(200).json({
    message: "Task updated successfully",
    task: taskResponse,
  });
});

export const updateTaskStatus = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user._id;

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (task.assignTo.toString() !== currentUserId.toString()) {
    return res
      .status(403)
      .json({ message: "Only the assigned user can update task status" });
  }

  task.status = status;
  await task.save();

  await task.populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
  ]);

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  await redisService.invalidateUserTasks(task.assignedBy.toString());
  await redisService.invalidateUserTasks(task.assignTo.toString());
  await redisService.invalidateDashboardData(task.assignedBy.toString());
  await redisService.invalidateDashboardData(task.assignTo.toString());
  await redisService.invalidatePattern("tasks:*");

  if (task.projectId) {
    await redisService.invalidateProject(task.projectId.toString());
    await redisService.invalidatePattern(`user:${task.assignedBy}:projects:*`);
    await redisService.invalidatePattern(`user:${task.assignTo}:projects:*`);
  }

  await Notification.create({
    recipient: task.assignedBy,
    sender: currentUserId,
    type: "task_status_updated",
    message: `${req.user.username} updated task "${task.title}" status to ${status}`,
    taskId: task._id,
  });

  res.status(200).json({
    message: "Task status updated successfully",
    task: taskResponse,
  });
});

export const reassignTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const { assignTo } = req.body;
  const currentUserId = req.user._id;

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (task.assignedBy.toString() !== currentUserId.toString()) {
    return res
      .status(403)
      .json({
        message: "Only the user who assigned this task can reassign it",
      });
  }

  const newAssignee = await User.findById(assignTo);
  if (!newAssignee) {
    return res.status(404).json({ message: "New assignee not found" });
  }

  const oldAssignee = task.assignTo;
  task.assignTo = assignTo;
  await task.save();

  await task.populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
  ]);

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  await redisService.invalidateUserTasks(task.assignedBy.toString());
  await redisService.invalidateUserTasks(oldAssignee.toString());
  await redisService.invalidateUserTasks(assignTo);
  await redisService.invalidateDashboardData(task.assignedBy.toString());
  await redisService.invalidateDashboardData(oldAssignee.toString());
  await redisService.invalidateDashboardData(assignTo);
  await redisService.invalidatePattern("tasks:*");

  await Notification.create({
    recipient: assignTo,
    sender: currentUserId,
    type: "task_reassigned",
    message: `${req.user.username} reassigned task "${task.title}" to you`,
    taskId: task._id,
  });

  await Notification.create({
    recipient: oldAssignee,
    sender: currentUserId,
    type: "task_unassigned",
    message: `Task "${task.title}" has been reassigned`,
    taskId: task._id,
  });

  res.status(200).json({
    message: "Task reassigned successfully",
    task: taskResponse,
  });
});

export const deleteTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const currentUserId = req.user._id;

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (task.assignedBy.toString() !== currentUserId.toString()) {
    return res
      .status(403)
      .json({ message: "Only the user who assigned this task can delete it" });
  }

  await Task.findByIdAndDelete(taskId);

  await redisService.invalidateTask(taskId);
  await redisService.invalidateUserTasks(task.assignedBy.toString());
  await redisService.invalidateUserTasks(task.assignTo.toString());
  await redisService.invalidateDashboardData(task.assignedBy.toString());
  await redisService.invalidateDashboardData(task.assignTo.toString());
  await redisService.invalidatePattern("tasks:*");

  res.status(200).json({ message: "Task deleted successfully" });
});

export const clearTaskCaches = catchAsync(async (req: any, res: any) => {
  await redisService.invalidatePattern("tasks:*");
  await redisService.invalidatePattern("user:*:tasks");
  await redisService.invalidatePattern("dashboard:*");

  res.status(200).json({ message: "All task caches cleared successfully" });
});

export const getTaskStats = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  const cachedStats = await redisService.get(`task_stats:${currentUserId}`);
  if (cachedStats) {
    return res.status(200).json(cachedStats);
  }

  const totalTasks = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
  });
  const completedTasks = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    status: "completed",
  });
  const pendingTasks = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    status: "pending",
  });
  const inProgressTasks = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    status: "in_progress",
  });
  const overdueTasks = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    dueDate: { $lt: new Date() },
    status: { $ne: "completed" },
  });

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const tasksThisWeek = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    createdAt: { $gte: oneWeekAgo },
  });
  const tasksThisMonth = await Task.countDocuments({
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
    createdAt: { $gte: oneMonthAgo },
  });

  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const stats = {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    overdueTasks,
    tasksThisWeek,
    tasksThisMonth,
    completionRate: parseFloat(completionRate.toFixed(2)),
  };

  await redisService.set(`task_stats:${currentUserId}`, stats, 300);

  res.status(200).json(stats);
});
