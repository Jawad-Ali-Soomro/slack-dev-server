import express from 'express'
const taskRouter = express.Router()
import { 
  createTask, 
  getTasks, 
  getTaskById, 
  updateTask, 
  updateTaskStatus, 
  reassignTask,
  deleteTask, 
  getTaskStats,
  clearTaskCaches
} from '../controllers/enhanced.task.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a new task with Redis caching
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: AssignedTo user not found
 */
taskRouter.post('/', authenticate, createTask)

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: Get all tasks with Redis caching and filters
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by task priority
 *       - in: query
 *         name: assignTo
 *         schema:
 *           type: string
 *         description: Filter by user assigned to the task (User ID)
 *       - in: query
 *         name: assignedBy
 *         schema:
 *           type: string
 *         description: Filter by user who assigned the task (User ID)
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
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 */
taskRouter.get('/', authenticate, getTasks)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get task by ID with Redis caching
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Task details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 */
taskRouter.get('/:taskId', authenticate, getTaskById)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   put:
 *     summary: Update task details (only by assignedBy user)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this task can update it
 *       404:
 *         description: Task not found
 */
taskRouter.put('/:taskId', authenticate, updateTask)

/**
 * @openapi
 * /api/tasks/{taskId}/status:
 *   put:
 *     summary: Update task status (only by assignedTo user)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *                 enum: [pending, in_progress, completed, cancelled]
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the assigned user can update task status
 *       404:
 *         description: Task not found
 */
taskRouter.put('/:taskId/status', authenticate, updateTaskStatus)

/**
 * @openapi
 * /api/tasks/{taskId}/reassign:
 *   put:
 *     summary: Reassign task to another user (only by assignedBy user)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *               assignTo:
 *                 type: string
 *                 description: New assignee user ID
 *             required:
 *               - assignTo
 *     responses:
 *       200:
 *         description: Task reassigned successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this task can reassign it
 *       404:
 *         description: Task or new assignee not found
 */
taskRouter.put('/:taskId/reassign', authenticate, reassignTask)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task (only by assignedBy user)
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the user who assigned this task can delete it
 *       404:
 *         description: Task not found
 */
taskRouter.delete('/:taskId', authenticate, deleteTask)

/**
 * @openapi
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics for the current user with Redis caching
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics
 *       401:
 *         description: Unauthorized
 */
taskRouter.get('/stats', authenticate, getTaskStats)

/**
 * @openapi
 * /api/tasks/clear-cache:
 *   post:
 *     summary: Clear all task caches
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All task caches cleared successfully
 *       401:
 *         description: Unauthorized
 */
taskRouter.post('/clear-cache', authenticate, clearTaskCaches)

export default taskRouter
