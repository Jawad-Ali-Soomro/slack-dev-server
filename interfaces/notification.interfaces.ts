export interface NotificationResponse {
  id: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
  };
  type: "task_assigned" | "task_status_updated" | "task_due_soon" | "user_followed" | "user_unfollowed" | "meeting_assigned";
  message: string;
  isRead: boolean;
  taskId?: string;
  createdAt: Date;
}
