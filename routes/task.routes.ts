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
  getTaskStats
} from '../controllers/task.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags:
 *       - Tasks
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
 *                 example: "Complete project documentation"
 *               description:
 *                 type: string
 *                 example: "Write comprehensive documentation for the API"
 *               assignTo:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: "high"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00Z"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["documentation", "api"]
 *             required:
 *               - title
 *               - assignTo
 *     responses:
 *       201:
 *         description: Task created successfully
 *       404:
 *         description: Assignable user not found
 */
taskRouter.post('/', authenticate, createTask)

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: Get tasks with filters
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
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: assignTo
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
 *         description: List of tasks
 */
taskRouter.get('/', authenticate, getTasks)

/**
 * @openapi
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignTo
 *         schema:
 *           type: string
 *         description: Filter stats by assignTo user
 *     responses:
 *       200:
 *         description: Task statistics
 */
taskRouter.get('/stats', authenticate, getTaskStats)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get task by ID
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
 *         example: 60d0fe4f5311236168a109cb
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
taskRouter.get('/:taskId', authenticate, getTaskById)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   put:
 *     summary: Update task
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
 *         example: 60d0fe4f5311236168a109cb
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 */
taskRouter.put('/:taskId', authenticate, updateTask)

/**
 * @openapi
 * /api/tasks/{taskId}/status:
 *   put:
 *     summary: Update task status (assigned user only)
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
 *         example: 60d0fe4f5311236168a109cb
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
 *                 example: "completed"
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       403:
 *         description: Only assigned user can update status
 *       404:
 *         description: Task not found
 */
taskRouter.put('/:taskId/status', authenticate, updateTaskStatus)

/**
 * @openapi
 * /api/tasks/{taskId}/reassign:
 *   put:
 *     summary: Reassign task to another user
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
 *         example: 60d0fe4f5311236168a109cb
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignTo:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109ca
 *             required:
 *               - assignTo
 *     responses:
 *       200:
 *         description: Task reassigned successfully
 *       404:
 *         description: Task or assignTo user not found
 */
taskRouter.put('/:taskId/reassign', authenticate, reassignTask)

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Delete task
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
 *         example: 60d0fe4f5311236168a109cb
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
taskRouter.delete('/:taskId', authenticate, deleteTask)

export default taskRouter
