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
import { authenticate } from '../middlewares/index'

// global authentication middleware
taskRouter.use(authenticate)


taskRouter.post('/', createTask)
taskRouter.get('/', getTasks)
taskRouter.get('/stats', getTaskStats)
taskRouter.post('/clear-cache', clearTaskCaches)
taskRouter.get('/:taskId', getTaskById)
taskRouter.put('/:taskId', updateTask)
taskRouter.put('/:taskId/status', updateTaskStatus)
taskRouter.put('/:taskId/reassign', reassignTask)
taskRouter.delete('/:taskId', deleteTask)

export default taskRouter
