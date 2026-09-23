/**
 * Email Service
 * Handles sending notifications for various user activities
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { renderEmail, getLogoAttachments } from '../templates/renderEmail';

const envPath = path.resolve(process.cwd(), 'config/.env');
dotenv.config({ path: envPath });

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: (process.env.GMAIL_USER || '').trim(),
        pass: (process.env.GMAIL_PASS || '').trim(),
      },
    });
  }

  /**
   * Send email notification with logo attachment
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      if (!to) return null;
      const mailOptions = {
        from: `"Slack Dev" <${(process.env.GMAIL_USER || '').trim()}>`,
        to,
        subject,
        html: htmlContent,
        attachments: getLogoAttachments(),
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email send failed:', error?.message || error);
      return null;
    }
  }

  /**
   * Generate HTML email template following the verification template style
   */
  generateEmailTemplate(title, message, actionText, actionUrl, footerText, details = []) {
    const isList = Array.isArray(details);
    const rows = isList
      ? details.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== '')
      : [];
    const pick = (label) => rows.find((row) => row.label === label)?.value;
    const taskTitle = pick('Task') || pick('Title');
    const assigner = pick('Assigned by');
    const project = pick('Project');
    const overdueBy = pick('Overdue by');
    const sentence = taskTitle
      ? [
          `The ${taskTitle}`,
          assigner ? `assigned by ${assigner}` : '',
          project ? `on ${project}` : '',
          overdueBy ? `is overdue by ${overdueBy}` : '',
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/([^.])$/, '$1.') + ' Please take some certain actions.'
      : '';
    const bodyLines = taskTitle ? [] : rows.map((row) => `${row.label}: ${row.value}`);
    const { html } = renderEmail({
      eyebrow: 'NOTIFICATION',
      heading: title,
      message: sentence || message,
      buttonText: actionText,
      buttonUrl: actionUrl,
      footer: footerText,
      bodyLines,
      detailsHtml: isList ? '' : details,
    });
    return html;
  }

  /**
   * Task Assignment Notification
   */
  async sendTaskAssignmentNotification(task, assignee, assigner) {
    const subject = `New Task Assigned: ${task.title}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/tasks`;
    
    const title = `TASK ASSIGNED TO YOU`;
    const message = `You have been assigned a new task by ${assigner?.username || 'a team member'}.`;
    
    const details = [
      { label: 'Task', value: task.title },
      { label: 'Assigned by', value: assigner?.username || 'a team member' },
      task.projectId?.name ? { label: 'Project', value: task.projectId.name } : null,
    ].filter(Boolean);

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
    
    const details = [
      { label: 'Title', value: meeting.title },
      { label: 'Type', value: meeting.type },
      { label: 'Starts', value: new Date(meeting.startDate).toLocaleString() },
      meeting.endDate ? { label: 'Ends', value: new Date(meeting.endDate).toLocaleString() } : null,
      meeting.location ? { label: 'Location', value: meeting.location } : null,
      meeting.description ? { label: 'Description', value: meeting.description } : null,
      meeting.projectId?.name ? { label: 'Project', value: meeting.projectId.name } : null,
    ].filter(Boolean);

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
   * Team invitation (pending — user must accept)
   */
  async sendTeamInviteEmail(team, invitee, inviter, role = 'member') {
    const subject = `You're invited to join ${team.name}`;
    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/teams`;
    const title = 'TEAM INVITATION';
    const message = `${inviter?.username || 'A teammate'} invited you to join "${team.name}" as ${role}.`;
    const details = [
      { label: 'Team', value: team.name },
      { label: 'Role', value: role },
      { label: 'Invited by', value: inviter?.username || 'Team admin' },
    ];
    const htmlContent = this.generateEmailTemplate(
      title,
      message,
      'View invitation',
      actionUrl,
      'Open Teams to accept or decline.',
      details
    );
    return await this.sendEmail(invitee.email, subject, htmlContent);
  }

  /**
   * Team Join Notification
   */
  async sendTeamJoinNotification(team, user, inviter) {
    const subject = `Welcome to Team: ${team.name}`;
    const actionUrl = `${process.env.CLIENT_URL}/dashboard/teams`;
    
    const title = `WELCOME TO TEAM`;
    const message = `You have been added to the team "${team.name}" by ${inviter?.username || 'a team administrator'}.`;
    
    const details = [
      { label: 'Team', value: team.name },
      { label: 'Description', value: team.description || 'No description' },
      { label: 'Members', value: `${team.members?.length || 0}` },
      { label: 'Your role', value: 'Member' },
    ];

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
    
    const details = [
      { label: 'Project', value: project.name },
      { label: 'Description', value: project.description || 'No description' },
      { label: 'Status', value: project.status },
      { label: 'Priority', value: project.priority },
      { label: 'Progress', value: `${project.progress || 0}%` },
      project.startDate ? { label: 'Start', value: new Date(project.startDate).toLocaleDateString() } : null,
      project.endDate ? { label: 'End', value: new Date(project.endDate).toLocaleDateString() } : null,
    ].filter(Boolean);

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
    
    const details = [
      { label: 'From', value: sender.username },
      { label: 'Email', value: sender.email },
      sender.bio ? { label: 'Bio', value: sender.bio } : null,
    ].filter(Boolean);

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
    
    const details = [
      { label: 'Username', value: accepter.username },
      { label: 'Email', value: accepter.email },
      accepter.bio ? { label: 'Bio', value: accepter.bio } : null,
    ].filter(Boolean);

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
    
    const details = [
      { label: 'Task', value: task.title },
      { label: 'Assigned by', value: updater?.username || 'Team member' },
      { label: 'Status', value: task.status },
    ];

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
    
    const details = [
      { label: 'Title', value: meeting.title },
      { label: 'Starts', value: meetingTime },
      { label: 'Type', value: meeting.type },
      meeting.location ? { label: 'Location', value: meeting.location } : null,
      meeting.description ? { label: 'Description', value: meeting.description } : null,
    ].filter(Boolean);

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