"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadsDirectory = path_1.default.join(__dirname, "../uploads");
const folders = [
    "logos",
    "profiles",
    "backgrounds",
    "documents",
    "videos",
    "audios",
    "files",
    "projects",
];
if (!fs_1.default.existsSync(uploadsDirectory)) {
    fs_1.default.mkdirSync(uploadsDirectory);
    folders.forEach((folder) => {
        fs_1.default.mkdirSync(path_1.default.join(uploadsDirectory, folder));
    });
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const folder = req.params.folder;
        if (folders.includes(folder)) {
            cb(null, path_1.default.join(uploadsDirectory, folder));
        }
        else {
            cb(new Error("Invalid folder"), "");
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});
exports.upload = (0, multer_1.default)({ storage });
