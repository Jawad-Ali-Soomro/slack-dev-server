export interface EmailTemplateData {
  type?: "OTP" | "TASK_OVERDUE";
  username?: string;
  siteName?: string;
  buttonText?: string;
  buttonUrl?: string;
  supportEmail?: string;
  logoUrl?: string;
  otp?: string;
  taskTitle?: string;
  taskDescription?: string;
  dueDate?: string;
  overdueBy?: string;
}
