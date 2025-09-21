import { catchAsync } from "../middlewares";
import { User, Task, Notification } from "../models";
import { CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskStats } from "../interfaces";

export const createTask = catchAsync(async (req: any, res: any) => {
  const { title, description, assignTo, priority = "medium", dueDate, tags }: CreateTaskRequest = req.body;
  const assignedBy = req.user._id;

  const assignToUser = await User.findById(assignTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignTo user not found" });
  }

  const task = await Task.create({
    title,
    description,
    assignTo,
    assignedBy,
    priority,
    dueDate,
    tags
  });

  await task.populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  // Create notification for task assignment
  await Notification.create({
    recipient: assignTo,
    sender: assignedBy,
    type: "task_assigned",
    message: `${req.user.username} assigned you a new task: "${title}"`,
    taskId: task._id
  });

  const taskResponse: TaskResponse = {
    id: (task._id as any).toString(),
    title: task.title,
    description: task.description,
    assignTo: {
      id: (task.assignTo as any)._id.toString(),
      username: (task.assignTo as any).username,
      avatar: (task.assignTo as any).avatar
    },
    assignedBy: {
      id: (task.assignedBy as any)._id.toString(),
      username: (task.assignedBy as any).username,
      avatar: (task.assignedBy as any).avatar
    },
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };

  res.status(201).json({
    message: "Task created and assigned successfully",
    task: taskResponse
  });
});

export const getTasks = catchAsync(async (req: any, res: any) => {
  const { status, priority, assignTo, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: any = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignTo) filter.assignTo = assignTo;

  const tasks = await Task.find(filter)
    .populate([
      { path: "assignTo", select: "username avatar" },
      { path: "assignedBy", select: "username avatar" }
    ])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Task.countDocuments(filter);

  const taskResponses: TaskResponse[] = tasks.map(task => ({
    id: (task._id as any).toString(),
    title: task.title,
    description: task.description,
    assignTo: {
      id: (task.assignTo as any)._id.toString(),
      username: (task.assignTo as any).username,
      avatar: (task.assignTo as any).avatar
    },
    assignedBy: {
      id: (task.assignedBy as any)._id.toString(),
      username: (task.assignedBy as any).username,
      avatar: (task.assignedBy as any).avatar
    },
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  }));

  res.status(200).json({
    tasks: taskResponses,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  });
});

export const getTaskById = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId).populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const taskResponse: TaskResponse = {
    id: (task._id as any).toString(),
    title: task.title,
    description: task.description,
    assignTo: {
      id: (task.assignTo as any)._id.toString(),
      username: (task.assignTo as any).username,
      avatar: (task.assignTo as any).avatar
    },
    assignedBy: {
      id: (task.assignedBy as any)._id.toString(),
      username: (task.assignedBy as any).username,
      avatar: (task.assignedBy as any).avatar
    },
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };

  res.status(200).json({ task: taskResponse });
});

export const updateTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const updates: UpdateTaskRequest = req.body;
  const currentUserId = req.user._id;

  // Get the original task to check for status changes
  const originalTask = await Task.findById(taskId);
  if (!originalTask) {
    return res.status(404).json({ message: "Task not found" });
  }

  const task = await Task.findByIdAndUpdate(
    taskId,
    { ...updates },
    { new: true, runValidators: true }
  ).populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  // Create notification for status changes
  if (updates.status && updates.status !== originalTask.status && task) {
    await Notification.create({
      recipient: task.assignedBy,
      sender: currentUserId,
      type: "task_status_updated",
      message: `${req.user.username} updated task "${task.title}" status to ${updates.status}`,
      taskId: task._id
    });
  }

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const taskResponse: TaskResponse = {
    id: (task._id as any).toString(),
    title: task.title,
    description: task.description,
    assignTo: {
      id: (task.assignTo as any)._id.toString(),
      username: (task.assignTo as any).username,
      avatar: (task.assignTo as any).avatar
    },
    assignedBy: {
      id: (task.assignedBy as any)._id.toString(),
      username: (task.assignedBy as any).username,
      avatar: (task.assignedBy as any).avatar
    },
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };

  res.status(200).json({
    message: "Task updated successfully",
    task: taskResponse
  });
});

export const reassignTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;
  const { assignTo } = req.body;
  const currentUserId = req.user._id;

  const assignToUser = await User.findById(assignTo);
  if (!assignToUser) {
    return res.status(404).json({ message: "AssignTo user not found" });
  }

  const originalTask = await Task.findById(taskId);
  if (!originalTask) {
    return res.status(404).json({ message: "Task not found" });
  }

  const task = await Task.findByIdAndUpdate(
    taskId,
    { 
      assignTo,
      assignedBy: currentUserId 
    },
    { new: true, runValidators: true }
  ).populate([
    { path: "assignTo", select: "username avatar" },
    { path: "assignedBy", select: "username avatar" }
  ]);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Create notification for task reassignment
  await Notification.create({
    recipient: assignTo,
    sender: currentUserId,
    type: "task_assigned",
    message: `${req.user.username} reassigned task "${task.title}" to you`,
    taskId: task._id
  });

  const taskResponse: TaskResponse = {
    id: (task._id as any).toString(),
    title: task.title,
    description: task.description,
    assignTo: {
      id: (task.assignTo as any)._id.toString(),
      username: (task.assignTo as any).username,
      avatar: (task.assignTo as any).avatar
    },
    assignedBy: {
      id: (task.assignedBy as any)._id.toString(),
      username: (task.assignedBy as any).username,
      avatar: (task.assignedBy as any).avatar
    },
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };

  res.status(200).json({
    message: "Task reassigned successfully",
    task: taskResponse
  });
});

export const deleteTask = catchAsync(async (req: any, res: any) => {
  const { taskId } = req.params;

  const task = await Task.findByIdAndDelete(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json({ message: "Task deleted successfully" });
});

export const getTaskStats = catchAsync(async (req: any, res: any) => {
  const { assignTo } = req.query;
  const filter: any = assignTo ? { assignTo } : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    overdue,
    todayTasks,
    thisWeekTasks,
    priorityStats
  ] = await Promise.all([
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: "pending" }),
    Task.countDocuments({ ...filter, status: "in_progress" }),
    Task.countDocuments({ ...filter, status: "completed" }),
    Task.countDocuments({ ...filter, status: "cancelled" }),
    Task.countDocuments({ 
      ...filter, 
      dueDate: { $lt: today },
      status: { $in: ["pending", "in_progress"] }
    }),
    Task.countDocuments({ 
      ...filter, 
      dueDate: { $gte: today, $lt: tomorrow }
    }),
    Task.countDocuments({ 
      ...filter, 
      dueDate: { $gte: today, $lt: nextWeek }
    }),
    Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const byPriority = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0
  };

  priorityStats.forEach(stat => {
    byPriority[stat._id as keyof typeof byPriority] = stat.count;
  });

  const stats: TaskStats = {
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    overdue,
    todayTasks,
    thisWeekTasks,
    byPriority
  };

  res.status(200).json(stats);
});
