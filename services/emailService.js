/**
 * Email Service
 * Handles sending notifications for various user activities
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: '../config/.env' });

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }

  /**
   * Send email notification with logo attachment
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      const mailOptions = {
        from: `"Core Stack" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            path: `${process.env.CLIENT_URL || 'http://localhost:4000'}/logo.png`,
            cid: 'logo'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate HTML email template following the verification template style
   */
  generateEmailTemplate(title, message, actionText, actionUrl, footerText, details = '') {
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 16px !important; }
      .btn { width: 100% !important; display: block !important; }
    }
    * {
      font-family: 'Public Sans', Arial, sans-serif;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fb; color:#333; font-family:'Public Sans', Arial, sans-serif;">

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" 
          style="width:600px; background:#ffffff; border-radius:8px; padding: 50px; overflow:hidden; box-shadow:0 6px 18px rgba(23, 32, 64, 0.08); text-align:center;">
          
          <tr>
            <td style="padding: 20px; text-align:center;">
              <img src="cid:logo" alt="Core Stack" width="100" style="display:block; margin:0 auto; border:0;" />
              <div style="font-size:11px; color:#8b94a6; margin-top:10px;">NOTIFICATION</div>
            </td>
          </tr>

          <tr>
            <td class="content" style="padding: 16px 24px 8px; text-align:center;">
              <h1 style="margin:0 0 10px; font-size:16px; color:#111827; font-weight:900;">${title}</h1>
              <p style="margin:0 0 14px; line-height:1.4; color:#6b7280; font-size:10px;font-weight:600">
                ${message}
              </p>

              ${details}

              ${actionText && actionUrl ? `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto;">
                  <tr>
                    <td align="center">
                      <a href="${actionUrl}" target="_blank" 
                        style="background-color:#f97316; color:#ffffff; padding:10px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600; font-size:12px;">
                        ${actionText}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}

              <p style="margin:0; line-height:1.4;">
                <span style="color:#6b7280; font-size:10px;font-weight:600 ">IF YOU DIDN'T EXPECT THIS, CONTACT US AT</span> <br />
                <a href="mailto:support@corestack.com" style="color:#f97316; text-transform:none !important; margin-top: 10px !important; margin-bottom: 20px; ">support@corestack.com</a>
              </p>

              <p style="margin:20px 0 0; color:#6b7280; font-size:10px;font-weight:600">
                ${footerText || 'This is an automated message from Core Stack. Please do not reply to this email.'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  /**
   * Task Assignment Notification
   */
  async sendTaskAssignmentNotification(task, assignee, assigner) {
    const subject = `New Task Assigned: ${task.title}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/tasks`;
    
    const title = `TASK ASSIGNED TO YOU`;
    const message = `You have been assigned a new task by ${assigner?.username || 'a team member'}.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">TASK DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Title</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.title}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Priority</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.priority}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Due Date</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}</span>
          </div>
          ${task.description ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Description</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.description}</span>
            </div>
          ` : ''}
          ${task.projectId ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">PROJECT:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.projectId.name}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Task',
      actionUrl,
      'Keep up the great work!',
      details
    );

    return await this.sendEmail(assignee.email, subject, htmlContent);
  }

  /**
   * Meeting Assignment Notification
   */
  async sendMeetingAssignmentNotification(meeting, attendee, organizer) {
    const subject = `Meeting Invitation: ${meeting.title}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/meetings`;
    
    const title = `MEETING INVITATION`;
    const message = `You have been invited to a meeting by ${organizer?.username || 'a team member'}.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">MEETING DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Title:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.title}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">TYPE:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.type}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">START DATE:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${new Date(meeting.startDate).toLocaleString()}</span>
          </div>
          ${meeting.endDate ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">END DATE:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${new Date(meeting.endDate).toLocaleString()}</span>
            </div>
          ` : ''}
          ${meeting.location ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">LOCATION:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.location}</span>
            </div>
          ` : ''}
          ${meeting.description ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Description</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.description}</span>
            </div>
          ` : ''}
          ${meeting.projectId ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">PROJECT:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.projectId.name}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Meeting',
      actionUrl,
      'We look forward to seeing you at the meeting!',
      details
    );

    return await this.sendEmail(attendee.email, subject, htmlContent);
  }

  /**
   * Team Join Notification
   */
  async sendTeamJoinNotification(team, user, inviter) {
    const subject = `Welcome to Team: ${team.name}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/teams`;
    
    const title = `WELCOME TO TEAM`;
    const message = `You have been added to the team "${team.name}" by ${inviter?.username || 'a team administrator'}.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">TEAM DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">TEAM NAME:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${team.name}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Description</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${team.description || 'No description provided'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Members:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${team.members?.length || 0} members</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Your Role:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">Member</span>
          </div>
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Team',
      actionUrl,
      'Welcome to the team!',
      details
    );

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  /**
   * Project Join Notification
   */
  async sendProjectJoinNotification(project, user, inviter) {
    const subject = `Welcome to Project: ${project.name}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/projects`;
    
    const title = `WELCOME TO PROJECT`;
    const message = `You have been added to the project "${project.name}" by ${inviter?.username || 'a project administrator'}.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">PROJECT DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">PROJECT NAME:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${project.name}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Description</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${project.description || 'No description provided'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">STATUS:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${project.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Priority</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${project.priority}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Progress:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${project.progress || 0}%</span>
          </div>
          ${project.startDate ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Start Date:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${new Date(project.startDate).toLocaleDateString()}</span>
            </div>
          ` : ''}
          ${project.endDate ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">End Date:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${new Date(project.endDate).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Project',
      actionUrl,
      'Happy collaborating!',
      details
    );

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  /**
   * Friend Request Notification
   */
  async sendFriendRequestNotification(sender, receiver) {
    const subject = `Friend Request from ${sender.username}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/friends`;
    
    const title = `FRIEND REQUEST`;
    const message = `${sender.username} has sent you a friend request.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">FRIEND REQUEST DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">FROM:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${sender.username}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">EMAIL:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${sender.email}</span>
          </div>
          ${sender.bio ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Bio:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${sender.bio}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'Manage Friend Requests',
      actionUrl,
      'Connect and collaborate with your network!',
      details
    );

    return await this.sendEmail(receiver.email, subject, htmlContent);
  }

  /**
   * Friend Request Accepted Notification
   */
  async sendFriendRequestAcceptedNotification(accepter, sender) {
    const subject = `${accepter.username} accepted your friend request`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/friends`;
    
    const title = `FRIEND REQUEST ACCEPTED`;
    const message = `${accepter.username} has accepted your friend request.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">YOU ARE NOW FRIENDS WITH:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">USERNAME:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${accepter.username}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">EMAIL:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${accepter.email}</span>
          </div>
          ${accepter.bio ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Bio:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${accepter.bio}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Friends',
      actionUrl,
      'Start building your professional network!',
      details
    );

    return await this.sendEmail(sender.email, subject, htmlContent);
  }

  /**
   * Task Status Update Notification
   */
  async sendTaskStatusUpdateNotification(task, user, updater) {
    const subject = `Task Status Updated: ${task.title}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/tasks`;
    
    const title = `TASK STATUS UPDATED`;
    const message = `The status of task "${task.title}" has been updated by ${updater?.username || 'a team member'}.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">UPDATED TASK DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Title:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.title}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">New Status:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Priority</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${task.priority}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Updated by:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${updater?.username || 'Team member'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Updated at:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Task',
      actionUrl,
      'Stay updated with your tasks!',
      details
    );

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  /**
   * Meeting Reminder Notification
   */
  async sendMeetingReminderNotification(meeting, user) {
    const subject = `Meeting Reminder: ${meeting.title}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/meetings`;
    
    const meetingTime = new Date(meeting.startDate).toLocaleString();
    const title = `MEETING REMINDER`;
    const message = `This is a reminder about your upcoming meeting.`;
    
    const details = `
      <div style="padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
        <h3 style="margin-top:0; color:#333; font-size:12px; font-weight:700;">MEETING DETAILS:</h3>
        <div style="margin:15px 0;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">Title:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.title}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">START TIME:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meetingTime}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
            <span style="font-weight:600; color:#333; font-size:10px;">TYPE:</span>
            <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.type}</span>
          </div>
          ${meeting.location ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">LOCATION:</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.location}</span>
            </div>
          ` : ''}
          ${meeting.description ? `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0;">
              <span style="font-weight:600; color:#333; font-size:10px;">Description</span>
              <span style="color:#666; font-size:10px;margin-left: 20px; padding: ">${meeting.description}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View Meeting',
      actionUrl,
      'See you at the meeting!',
      details
    );

    return await this.sendEmail(user.email, subject, htmlContent);
  }
}

export default new EmailService();