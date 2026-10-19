import express from "express";
import {
  getAutomations,
  toggleAutomation,
  suggestAutoAssignee,
} from "../controllers/automation.controller";
import { authenticate, requireAdmin } from "../middlewares/index";

const automationRouter = express.Router();

automationRouter.use(authenticate);

automationRouter.get("/", getAutomations);
automationRouter.post("/suggest-assignee", suggestAutoAssignee);
automationRouter.patch("/:key", requireAdmin, toggleAutomation);

export default automationRouter;
