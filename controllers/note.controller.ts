import { Request, Response } from 'express';
import { catchAsync } from '../middlewares';
import { Note } from '../models';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `note-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {

  if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter
});

export const uploadNotePDF = upload.single('pdf');

export const createNote = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const { title, description, department, subject, tags } = req.body;

  if (!title || !department || !subject) {
    return res.status(400).json({ message: 'Title, department, and subject are required' });
  }

  let fileUrl = '';
  let fileName = '';

  if (req.file) {
    fileUrl = `/uploads/documents/${req.file.filename}`;
    fileName = req.file.originalname;
  }

  const note = await Note.create({
    title,
    description,
    department,
    subject,
    fileUrl,
    fileName,
    createdBy: userId,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
  });

  await note.populate('createdBy', 'username email avatar');

  res.status(201).json({
    message: 'Note created successfully',
    note,
  });
});

export const getNotes = catchAsync(async (req: any, res: Response) => {
  const { department, subject, search, page = 1, limit = 20 } = req.query;

  const filter: any = {}; // Removed createdBy filter - all notes are visible to all users

  if (department) {
    filter.department = department;
  }

  if (subject) {
    filter.subject = subject;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const notes = await Note.find(filter)
    .populate('createdBy', 'username email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Note.countDocuments(filter);

  res.status(200).json({
    notes,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

export const getNoteById = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;

  const note = await Note.findById(id).populate(
    'createdBy',
    'username email avatar'
  );

  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  res.status(200).json({ note });
});

export const updateNote = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { title, description, department, subject, tags } = req.body;

  const note = await Note.findOne({ _id: id, createdBy: userId });

  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  if (req.file) {

    if (note.fileUrl) {
      const oldFilePath = path.join(process.cwd(), note.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    note.fileUrl = `/uploads/documents/${req.file.filename}`;
    note.fileName = req.file.originalname;
  }

  if (title) note.title = title;
  if (description !== undefined) note.description = description;
  if (department) note.department = department;
  if (subject) note.subject = subject;
  if (tags) {
    note.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
  }

  await note.save();
  await note.populate('createdBy', 'username email avatar');

  res.status(200).json({
    message: 'Note updated successfully',
    note,
  });
});

export const deleteNote = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;

  const note = await Note.findById(id);

  if (!note) {
    return res.status(404).json({ message: 'Note not found' });
  }

  if (note.createdBy.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'You can only delete your own notes' });
  }

  if (note.fileUrl) {
    const filePath = path.join(process.cwd(), note.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await Note.findByIdAndDelete(id);

  res.status(200).json({ message: 'Note deleted successfully' });
});

export const getDepartments = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;

  const departments = await Note.distinct('department', { createdBy: userId });

  res.status(200).json({ departments });
});

export const getSubjectsByDepartment = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const { department } = req.params;

  const subjects = await Note.distinct('subject', {
    createdBy: userId,
    department: department,
  });

  res.status(200).json({ subjects });
});

