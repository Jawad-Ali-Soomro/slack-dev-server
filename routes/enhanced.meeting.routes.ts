import express from 'express'
const meetingRouter = express.Router()
import { 
  createMeeting, 
  getMeetings, 
  getMeetingById, 
  updateMeeting, 
  updateMeetingStatus, 
  rescheduleMeeting,
  reassignMeeting,
  updateAttendees,
  deleteMeeting, 
  getMeetingStats 
} from '../controllers/enhanced.meeting.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting with Redis caching
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMeetingRequest'
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: AssignedTo user not found
 */
meetingRouter.post('/', authenticate, createMeeting)

/**
 * @openapi
 * /api/meetings:
 *   get:
 *     summary: Get all meetings with Redis caching and filters
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, cancelled, pending]
 *         description: Filter by meeting status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *         description: Filter by meeting type
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by user assigned to the meeting (User ID)
 *       - in: query
 *         name: assignedBy
 *         schema:
 *           type: string
 *         description: Filter by user who assigned the meeting (User ID)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of meetings
 *       401:
 *         description: Unauthorized
 */
meetingRouter.get('/', authenticate, getMeetings)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   get:
 *     summary: Get meeting by ID with Redis caching
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Meeting details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Meeting not found
 */
meetingRouter.get('/:meetingId', authenticate, getMeetingById)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   put:
 *     summary: Update meeting details (only by assignedBy user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMeetingRequest'
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this meeting can update it
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId', authenticate, updateMeeting)

/**
 * @openapi
 * /api/meetings/{meetingId}/status:
 *   put:
 *     summary: Update meeting status (only by assignedTo user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, cancelled, pending]
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Meeting status updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the assigned user can update meeting status
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId/status', authenticate, updateMeetingStatus)

/**
 * @openapi
 * /api/meetings/{meetingId}/reschedule:
 *   put:
 *     summary: Reschedule meeting (only by assignedBy user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: New start date and time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: New end date and time
 *               location:
 *                 type: string
 *                 description: New location (for in-person meetings)
 *               meetingLink:
 *                 type: string
 *                 description: New meeting link (for online meetings)
 *     responses:
 *       200:
 *         description: Meeting rescheduled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this meeting can reschedule it
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId/reschedule', authenticate, rescheduleMeeting)

/**
 * @openapi
 * /api/meetings/{meetingId}/reassign:
 *   put:
 *     summary: Reassign meeting to another user (only by assignedBy user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: New assignee user ID
 *             required:
 *               - assignedTo
 *     responses:
 *       200:
 *         description: Meeting reassigned successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this meeting can reassign it
 *       404:
 *         description: Meeting or new assignee not found
 */
meetingRouter.put('/:meetingId/reassign', authenticate, reassignMeeting)

/**
 * @openapi
 * /api/meetings/{meetingId}/attendees:
 *   put:
 *     summary: Update meeting attendees (only by assignedBy user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of attendee user IDs
 *             required:
 *               - attendees
 *     responses:
 *       200:
 *         description: Meeting attendees updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this meeting can update attendees
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId/attendees', authenticate, updateAttendees)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   delete:
 *     summary: Delete a meeting (only by assignedBy user)
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Meeting deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this meeting can delete it
 *       404:
 *         description: Meeting not found
 */
meetingRouter.delete('/:meetingId', authenticate, deleteMeeting)

/**
 * @openapi
 * /api/meetings/stats:
 *   get:
 *     summary: Get meeting statistics for the current user with Redis caching
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Meeting statistics
 *       401:
 *         description: Unauthorized
 */
meetingRouter.get('/stats', authenticate, getMeetingStats)

export default meetingRouter
