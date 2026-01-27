import express from 'express';
import { authenticate } from '../middlewares';
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

const router = express.Router();

router.use(authenticate);

router.get('/departments', getDepartments);

router.get('/subjects/:department', getSubjectsByDepartment);

router.get('/', getNotes);

router.get('/:id', getNoteById);

router.post('/', uploadNotePDF, createNote);

router.put('/:id', uploadNotePDF, updateNote);

router.delete('/:id', deleteNote);

export default router;

