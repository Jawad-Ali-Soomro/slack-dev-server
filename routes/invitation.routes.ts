import express from "express";
import { authenticate } from "../middlewares";
import {
  sendInvitation,
  getInvitations,
  respondToInvitation,
  cancelInvitation,
} from "../controllers/invitation.controller";

const invitationRouter = express.Router();

invitationRouter.post("/", authenticate, sendInvitation);
invitationRouter.get("/", authenticate, getInvitations);
invitationRouter.post("/respond", authenticate, respondToInvitation);
invitationRouter.delete("/:invitationId", authenticate, cancelInvitation);

export default invitationRouter;
