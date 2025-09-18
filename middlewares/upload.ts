import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const uploadsDirectory = path.join(__dirname, "../uploads");
const folders = [
  "logos",
  "profiles",
  "backgrounds",
  "documents",
  "videos",
  "audios",
  "files",
];
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory);
  folders.forEach((folder) => {
    fs.mkdirSync(path.join(uploadsDirectory, folder));
  });
}

const storage = multer.diskStorage({
  destination: function (req: Request, file: any, cb: Function) {
    const folder = req.params.folder;
    if (folders.includes(folder)) {
      cb(null, path.join(uploadsDirectory, folder));
    } else {
      cb(new Error("Invalid folder"), "");
    }
  },
  filename: function (req: Request, file: any, cb: Function) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

export const upload = multer({ storage });
