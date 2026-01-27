import express from 'express'
import { authenticate, upload } from '../middlewares'
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  addLink,
  updateLink,
  removeLink,
  getProjectStats,
  clearProjectCache
} from '../controllers/project.controller'

const projectRouter = express.Router()

/**
 * @openapi
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - startDate
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active, on_hold, completed, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *               links:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [repository, documentation, design, other]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
projectRouter.post('/', authenticate, upload.single('logo'), createProject)

/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: Get all projects for the current user
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, on_hold, completed, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: search
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       401:
 *         description: Unauthorized
 */
projectRouter.get('/', authenticate, getProjects)

/**
 * @openapi
 * /api/projects/stats:
 *   get:
 *     summary: Get project statistics
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Project statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
projectRouter.get('/stats', authenticate, getProjectStats)

/**
 * @openapi
 * /api/projects/clear-cache:
 *   post:
 *     summary: Clear project cache for current user
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Project cache cleared successfully
 *       401:
 *         description: Unauthorized
 */
projectRouter.post('/clear-cache', authenticate, clearProjectCache)

/**
 * @openapi
 * /api/projects/{projectId}:
 *   get:
 *     summary: Get project by ID
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.get('/:projectId', authenticate, getProjectById)

/**
 * @openapi
 * /api/projects/{projectId}:
 *   put:
 *     summary: Update project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active, on_hold, completed, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               links:
 *                 type: array
 *                 items:
 *                   type: object
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.put('/:projectId', authenticate, updateProject)

/**
 * @openapi
 * /api/projects/{projectId}:
 *   delete:
 *     summary: Delete project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.delete('/:projectId', authenticate, deleteProject)

/**
 * @openapi
 * /api/projects/{projectId}/members:
 *   post:
 *     summary: Add member to project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 default: member
 *     responses:
 *       200:
 *         description: Member added successfully
 *       404:
 *         description: Project or user not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.post('/:projectId/members', authenticate, addMember)

/**
 * @openapi
 * /api/projects/{projectId}/members:
 *   delete:
 *     summary: Remove member from project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       404:
 *         description: Project or member not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.delete('/:projectId/members', authenticate, removeMember)

/**
 * @openapi
 * /api/projects/{projectId}/members/role:
 *   put:
 *     summary: Update member role
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member, viewer]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       404:
 *         description: Project or member not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.put('/:projectId/members/role', authenticate, updateMemberRole)

/**
 * @openapi
 * /api/projects/{projectId}/links:
 *   post:
 *     summary: Add link to project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - url
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [repository, documentation, design, other]
 *                 default: other
 *     responses:
 *       200:
 *         description: Link added successfully
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.post('/:projectId/links', authenticate, addLink)

/**
 * @openapi
 * /api/projects/{projectId}/links:
 *   put:
 *     summary: Update project link
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - linkId
 *             properties:
 *               linkId:
 *                 type: string
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [repository, documentation, design, other]
 *     responses:
 *       200:
 *         description: Link updated successfully
 *       404:
 *         description: Project or link not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.put('/:projectId/links', authenticate, updateLink)

/**
 * @openapi
 * /api/projects/{projectId}/links:
 *   delete:
 *     summary: Remove link from project
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - linkId
 *             properties:
 *               linkId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Link removed successfully
 *       404:
 *         description: Project or link not found
 *       401:
 *         description: Unauthorized
 */
projectRouter.delete('/:projectId/links', authenticate, removeLink)

/**
 * @openapi
 * /api/upload/projects:
 *   post:
 *     summary: Upload project logo
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 default: projects
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
projectRouter.post('/upload/projects', authenticate, (req: any, res: any) => {

  req.params.folder = 'projects';

  upload.single('logo')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ message: "Upload failed", error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const fileUrl = `/projects/${req.file.filename}`;
    res.json({ 
      message: "Logo uploaded successfully", 
      url: fileUrl 
    });
  });
})

export default projectRouter
