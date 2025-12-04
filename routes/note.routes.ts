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

// All routes require authentication
router.use(authenticate);

// Get all departments
router.get('/departments', getDepartments);

// Get subjects by department
router.get('/subjects/:department', getSubjectsByDepartment);

// Get all notes
router.get('/', getNotes);

// Get note by ID
router.get('/:id', getNoteById);

// Create note (with optional PDF upload)
router.post('/', uploadNotePDF, createNote);

// Update note (with optional PDF upload)
router.put('/:id', uploadNotePDF, updateNote);

// Delete note
router.delete('/:id', deleteNote);

export default router;

