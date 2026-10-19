import express from "express";
import { authenticate } from "../middlewares/index";
import {
  sendInvitation,
  getInvitations,
  respondToInvitation,
  cancelInvitation,
} from "../controllers/invitation.controller";

const invitationRouter = express.Router();
// global authentication middleware
invitationRouter.use(authenticate)
invitationRouter.post("/", sendInvitation);
invitationRouter.get("/", getInvitations);
invitationRouter.post("/respond", respondToInvitation);
invitationRouter.delete("/:invitationId", cancelInvitation);

export default invitationRouter;
