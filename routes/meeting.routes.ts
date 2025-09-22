import express from 'express'
const meetingRouter = express.Router()
import { 
  createMeeting, 
  getMeetings, 
  getMeetingById, 
  updateMeeting, 
  updateMeetingStatus, 
  deleteMeeting, 
  getMeetingStats 
} from '../controllers/meeting.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Project Kick-off Meeting"
 *               description:
 *                 type: string
 *                 example: "Discuss project requirements and team roles"
 *               type:
 *                 type: string
 *                 enum: [online, in-person]
 *                 example: "online"
 *               assignedTo:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T10:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T11:00:00Z"
 *               location:
 *                 type: string
 *                 example: "Conference Room A"
 *               meetingLink:
 *                 type: string
 *                 example: "https://meet.google.com/abc-defg-hij"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["project", "kickoff"]
 *             required:
 *               - title
 *               - description
 *               - type
 *               - assignedTo
 *               - startDate
 *               - endDate
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *       400:
 *         description: Invalid input or conflicting meeting time
 *       401:
 *         description: Unauthorized
 */
meetingRouter.post('/', authenticate, createMeeting)

/**
 * @openapi
 * /api/meetings:
 *   get:
 *     summary: Get all meetings with pagination and filters
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, pending, cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [online, in-person]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
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
 */
meetingRouter.get('/', authenticate, getMeetings)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   get:
 *     summary: Get meeting by ID
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
 *       404:
 *         description: Meeting not found
 */
meetingRouter.get('/:meetingId', authenticate, getMeetingById)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   put:
 *     summary: Update meeting
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
 *               title:
 *                 type: string
 *                 example: "Updated Meeting Title"
 *               description:
 *                 type: string
 *                 example: "Updated meeting description"
 *               type:
 *                 type: string
 *                 enum: [online, in-person]
 *                 example: "in-person"
 *               assignedTo:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T14:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T15:00:00Z"
 *               location:
 *                 type: string
 *                 example: "Updated Conference Room"
 *               meetingLink:
 *                 type: string
 *                 example: "https://zoom.us/j/1234567890"
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, pending, cancelled]
 *                 example: "completed"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["updated", "meeting"]
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *       400:
 *         description: Invalid input or conflicting meeting time
 *       403:
 *         description: Forbidden - not authorized to update this meeting
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId', authenticate, updateMeeting)

/**
 * @openapi
 * /api/meetings/{meetingId}/status:
 *   put:
 *     summary: Update meeting status (assigned user only)
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
 *                 enum: [scheduled, completed, pending, cancelled]
 *                 example: "completed"
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Meeting status updated successfully
 *       403:
 *         description: Forbidden - only assigned user can update status
 *       404:
 *         description: Meeting not found
 */
meetingRouter.put('/:meetingId/status', authenticate, updateMeetingStatus)

/**
 * @openapi
 * /api/meetings/{meetingId}:
 *   delete:
 *     summary: Delete meeting
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
 *       403:
 *         description: Forbidden - only meeting creator can delete
 *       404:
 *         description: Meeting not found
 */
meetingRouter.delete('/:meetingId', authenticate, deleteMeeting)

/**
 * @openapi
 * /api/meetings/stats:
 *   get:
 *     summary: Get meeting statistics
 *     tags:
 *       - Meetings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter stats by assigned user
 *     responses:
 *       200:
 *         description: Meeting statistics
 */
meetingRouter.get('/stats', authenticate, getMeetingStats)

export default meetingRouter
