import express from 'express';
import { authenticate } from '../middlewares/index';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getDepartments,
  getSubjectsByDepartment,
  uploadNotePDF,
} from '../controllers/note.controller';

const noteRouter = express.Router();
// global authentication middleware
noteRouter.use(authenticate)

noteRouter.get('/departments', getDepartments);
noteRouter.get('/subjects/:department', getSubjectsByDepartment);
noteRouter.get('/', getNotes);
noteRouter.get('/:id', getNoteById);
noteRouter.post('/', uploadNotePDF, createNote);
noteRouter.put('/:id', uploadNotePDF, updateNote);
noteRouter.delete('/:id', deleteNote);

export default noteRouter;

