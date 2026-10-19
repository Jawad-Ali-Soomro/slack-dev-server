import path from "path";
import fs from "fs";
import multer from "multer";
import { Response } from "express";
import { catchAsync } from "../middlewares/index";

const uploadDir = path.join(process.cwd(), "uploads/chat");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const blockedExtensions = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".ps1",
  ".vbs",
  ".dll",
  ".sh",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    const safeExt = /^[.][a-z0-9]+$/.test(ext) ? ext : "";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `chat-${unique}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (blockedExtensions.has(ext)) {
      cb(new Error("This file type is not allowed"));
      return;
    }
    cb(null, true);
  },
});

const runUpload =
  (handler: any) => (req: any, res: Response, next: any) => {
    handler(req, res, (error: any) => {
      if (!error) {
        next();
        return;
      }
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each file must be 20MB or smaller"
          : error.message || "Upload failed";
      res.status(400).json({ success: false, message });
    });
  };

export const uploadChatSingle = runUpload(upload.single("file"));
export const uploadChatMultiple = runUpload(upload.array("files", 5));

const toAttachment = (file: Express.Multer.File) => ({
  url: `/uploads/chat/${file.filename}`,
  name: path.basename(file.originalname).slice(0, 180),
  mimetype: file.mimetype,
  size: file.size,
});

export const uploadSingleChatFile = catchAsync(async (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  res.status(200).json({
    success: true,
    message: "File uploaded",
    file: toAttachment(req.file),
  });
});

export const uploadMultipleChatFiles = catchAsync(async (req: any, res: Response) => {
  const files = (req.files || []) as Express.Multer.File[];
  if (!files.length) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  res.status(200).json({
    success: true,
    message: "Files uploaded",
    files: files.map(toAttachment),
  });
});
