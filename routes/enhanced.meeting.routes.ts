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
  getMeetingStats,
  createZoomMeeting
} from '../controllers/enhanced.meeting.controller'
import { authenticate } from '../middlewares/index'

// global authentication middleware
meetingRouter.use(authenticate)

meetingRouter.post('/', createMeeting)
meetingRouter.post('/zoom', createZoomMeeting)
meetingRouter.get('/', getMeetings)
meetingRouter.get('/:meetingId', getMeetingById)
meetingRouter.put('/:meetingId', updateMeeting)
meetingRouter.put('/:meetingId/status', updateMeetingStatus)
meetingRouter.put('/:meetingId/reschedule', rescheduleMeeting)
meetingRouter.put('/:meetingId/reassign', reassignMeeting)
meetingRouter.put('/:meetingId/attendees', updateAttendees)
meetingRouter.delete('/:meetingId', deleteMeeting)
meetingRouter.get('/stats', getMeetingStats)

export default meetingRouter
