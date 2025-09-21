export interface CreateTaskRequest {
  title: string;
  description?: string;
  assignTo: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  tags?: string[];
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  assignTo: {
    id: string;
    username: string;
    avatar?: string;
  };
  assignedBy: {
    id: string;
    username: string;
    avatar?: string;
  };
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  todayTasks: number;
  thisWeekTasks: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}
