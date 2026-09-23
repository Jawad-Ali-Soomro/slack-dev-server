import { catchAsync } from "../middlewares/index";
import { Task, User } from "../models/index";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskResponse,
  Availability,
} from "../interfaces/index";
import redisService from "../services/redis.service";
import { notifyUser, emitTaskUpdated } from "../utils/notify";
import { sendOverdueReminders } from "../services/automationRunner";

export const sendOverdueTaskEmails = sendOverdueReminders;

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
  repository: task.repository?.repoId
    ? {
        repoId: task.repository.repoId,
        repoName: task.repository.repoName,
      }
    : null,
  dueDate: task.dueDate,
  tags: task.tags,
  captureMetadata: task.captureMetadata || null,
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
    repository,
    captureMetadata,
  }: CreateTaskRequest = req.body;
  const assignedBy = req.user._id;

  const assignToUser = await User.findById(assignTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignedTo user not found" });
  }

  if ((assignToUser as any).availability === Availability.Busy) {
    return res.status(409).json({
      message: `${assignToUser.username} is currently busy and cannot be assigned new tasks`,
      code: "USER_BUSY",
    });
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
    repository,
    captureMetadata: captureMetadata || undefined,
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
  await redisService.del(`task_stats:${assignedBy}`);
  await redisService.del(`task_stats:${assignTo}`);

  const taskResponse = formatTaskResponse(task);
  await notifyUser({
    recipient: assignTo,
    sender: assignedBy,
    type: "task_assigned",
    message: `${req.user.username} assigned you a new task: "${title}"`,
    taskId: task._id,
  });
  emitTaskUpdated(
    [assignedBy.toString(), String(assignTo)],
    taskResponse,
  );

  res.status(201).json({
    message: "Task created and assigned successfully",
    task: taskResponse,
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

  const { overdueEmailSent: _ignoredOverdueFlag, ...safeUpdates } = {
    ...(updates as UpdateTaskRequest & { overdueEmailSent?: boolean }),
  };

  const task = await Task.findByIdAndUpdate(
    taskId,
    { ...safeUpdates },
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
  await redisService.del(`task_stats:${originalTask.assignedBy}`);
  await redisService.del(`task_stats:${originalTask.assignTo}`);

  if (originalTask.projectId) {
    await redisService.invalidateProject(originalTask.projectId.toString());
    await redisService.invalidatePattern(
      `user:${originalTask.assignedBy}:projects:*`,
    );
    await redisService.invalidatePattern(
      `user:${originalTask.assignTo}:projects:*`,
    );
  }

  await notifyUser({
    recipient: task.assignTo,
    sender: currentUserId,
    type: "task_updated",
    message: `${req.user.username} updated task "${task.title}"`,
    taskId: task._id,
  });
  emitTaskUpdated(
    [
      originalTask.assignedBy.toString(),
      originalTask.assignTo.toString(),
      task.assignTo?._id?.toString?.(),
    ],
    taskResponse,
  );

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

  const assigneeId = task.assignTo.toString();
  const assignerId = task.assignedBy.toString();
  const isAssignee = assigneeId === currentUserId.toString();
  const isAssigner = assignerId === currentUserId.toString();
  if (!isAssignee && !isAssigner) {
    return res
      .status(403)
      .json({ message: "Only the assignee or assigner can update status" });
  }

  task.status = status;
  await task.save();

  await task.populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
  ]);

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  await redisService.invalidateUserTasks(assignerId);
  await redisService.invalidateUserTasks(assigneeId);
  await redisService.invalidateDashboardData(assignerId);
  await redisService.invalidateDashboardData(assigneeId);
  await redisService.invalidatePattern("tasks:*");
  await redisService.del(`task_stats:${assignerId}`);
  await redisService.del(`task_stats:${assigneeId}`);

  if (task.projectId) {
    await redisService.invalidateProject(task.projectId.toString());
    await redisService.invalidatePattern(`user:${assignerId}:projects:*`);
    await redisService.invalidatePattern(`user:${assigneeId}:projects:*`);
  }

  const notifyRecipient = isAssignee ? assignerId : assigneeId;
  const statusLabel = String(status).replace(/_/g, " ");
  if (notifyRecipient !== currentUserId.toString()) {
    await notifyUser({
      recipient: notifyRecipient,
      sender: currentUserId,
      type: "task_status_updated",
      message: `${req.user.username} moved "${task.title}" to ${statusLabel}`,
      taskId: task._id,
    });
  }
  emitTaskUpdated([assignerId, assigneeId], taskResponse);

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
    return res.status(403).json({
      message: "Only the person who created this task can reassign it",
    });
  }

  if (!assignTo) {
    return res.status(400).json({ message: "New assignee is required" });
  }

  if (task.assignTo.toString() === String(assignTo)) {
    return res.status(400).json({
      message: "Task is already assigned to this person",
    });
  }

  const newAssignee = await User.findById(assignTo);
  if (!newAssignee) {
    return res.status(404).json({ message: "New assignee not found" });
  }

  if ((newAssignee as any).availability === Availability.Busy) {
    return res.status(409).json({
      message: `${newAssignee.username} is currently busy and cannot be assigned new tasks`,
      code: "USER_BUSY",
    });
  }

  const oldAssignee = task.assignTo;
  const dueInTwoDays = new Date();
  dueInTwoDays.setDate(dueInTwoDays.getDate() + 2);

  task.assignTo = assignTo;
  task.dueDate = dueInTwoDays;
  (task as any).overdueEmailSent = false;
  await task.save();

  await task.populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" },
    { path: "projectId", select: "name logo" },
  ]);

  const taskResponse = formatTaskResponse(task);

  await redisService.cacheTask(taskId, taskResponse);

  const senderId = currentUserId.toString();
  const newAssigneeId = String(assignTo);
  const oldAssigneeId = oldAssignee.toString();
  const assignerId =
    task.assignedBy?._id?.toString?.() || task.assignedBy.toString();
  const affectedUserIds = [
    ...new Set([senderId, newAssigneeId, oldAssigneeId, assignerId]),
  ];

  for (const userId of affectedUserIds) {
    await redisService.invalidateUserTasks(userId);
    await redisService.invalidateDashboardData(userId);
    await redisService.del(`task_stats:${userId}`);
  }
  await redisService.invalidatePattern("tasks:*");

  if (newAssigneeId !== senderId) {
    await notifyUser({
      recipient: assignTo,
      sender: currentUserId,
      type: "task_reassigned",
      message: `${req.user.username} reassigned task "${task.title}" to you`,
      taskId: task._id,
    });
  }

  if (oldAssigneeId !== senderId && oldAssigneeId !== newAssigneeId) {
    await notifyUser({
      recipient: oldAssignee,
      sender: currentUserId,
      type: "task_unassigned",
      message: `Task "${task.title}" has been reassigned`,
      taskId: task._id,
    });
  }

  emitTaskUpdated(affectedUserIds, taskResponse);

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
  await redisService.del(`task_stats:${task.assignedBy}`);
  await redisService.del(`task_stats:${task.assignTo}`);

  res.status(200).json({ message: "Task deleted successfully" });
});

export const clearTaskCaches = catchAsync(async (req: any, res: any) => {
  await redisService.invalidatePattern("tasks:*");
  await redisService.invalidatePattern("task_stats:*");
  await redisService.invalidatePattern("user:*:tasks");
  await redisService.invalidatePattern("dashboard:*");

  res.status(200).json({ message: "All task caches cleared successfully" });
});

export const getTaskStats = catchAsync(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  // Always compute fresh — top chips need real-time numbers
  await redisService.del(`task_stats:${currentUserId}`);

  const userFilter = {
    $or: [{ assignTo: currentUserId }, { assignedBy: currentUserId }],
  };

  const [
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    cancelledTasks,
    overdueTasks,
    tasksThisWeek,
    tasksThisMonth,
  ] = await Promise.all([
    Task.countDocuments(userFilter),
    Task.countDocuments({ ...userFilter, status: "completed" }),
    Task.countDocuments({ ...userFilter, status: "pending" }),
    Task.countDocuments({ ...userFilter, status: "in_progress" }),
    Task.countDocuments({ ...userFilter, status: "cancelled" }),
    Task.countDocuments({
      ...userFilter,
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    }),
    Task.countDocuments({
      ...userFilter,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    Task.countDocuments({
      ...userFilter,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const stats = {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    cancelledTasks,
    overdueTasks,
    tasksThisWeek,
    tasksThisMonth,
    completionRate: parseFloat(completionRate.toFixed(2)),
  };

  res.status(200).json(stats);
});
