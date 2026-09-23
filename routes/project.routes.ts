import express from "express";
import { authenticate, upload } from "../middlewares/index";
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
  clearProjectCache,
  setProjectsUploadFolder,
  uploadProjectLogo,
} from "../controllers/project.controller";

const projectRouter = express.Router();

projectRouter.use(authenticate);

projectRouter.post("/", upload.single("logo"), createProject);
projectRouter.get("/", getProjects);
projectRouter.get("/stats", getProjectStats);
projectRouter.post("/clear-cache", clearProjectCache);
projectRouter.post(
  "/upload/projects",
  setProjectsUploadFolder,
  upload.single("logo"),
  uploadProjectLogo,
);
projectRouter.get("/:projectId", getProjectById);
projectRouter.put("/:projectId", updateProject);
projectRouter.delete("/:projectId", deleteProject);
projectRouter.post("/:projectId/members", addMember);
projectRouter.delete("/:projectId/members", removeMember);
projectRouter.put("/:projectId/members/role", updateMemberRole);
projectRouter.post("/:projectId/links", addLink);
projectRouter.put("/:projectId/links", updateLink);
projectRouter.delete("/:projectId/links", removeLink);

export default projectRouter;
