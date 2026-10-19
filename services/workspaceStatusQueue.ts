import { Team } from "../models/team.model";
import { Friendship } from "../models/friend.model";
import { logger } from "../helpers/index";
import {
  getTaskChannel,
  getTaskExchange,
  getWorkspaceStatusQueue,
  startRabbitConsumer,
} from "./rabbitmq.service";

export interface WorkspaceStatusPayload {
  id: string;
  username?: string;
  avatar?: string;
  availability?: string;
  jobRole?: string;
  statusMessage?: string;
}

interface WorkspaceStatusMessage {
  user: WorkspaceStatusPayload;
  userIds: string[];
  occurredAt: string;
}

const idOf = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  if (typeof value.toHexString === "function") return value.toHexString();
  return null;
};

async function audienceFor(userId: string) {
  const ids = new Set<string>([userId]);

  try {
    const [teams, friendships] = await Promise.all([
      Team.find({
        $or: [{ createdBy: userId }, { "members.user": userId }],
      })
        .select("members createdBy")
        .lean(),
      Friendship.find({
        $or: [{ user1: userId }, { user2: userId }],
      })
        .select("user1 user2")
        .lean(),
    ]);

    for (const team of teams) {
      const createdBy = idOf((team as any).createdBy);
      if (createdBy) ids.add(createdBy);
      for (const member of (team as any).members || []) {
        const memberId = idOf(member?.user);
        if (memberId) ids.add(memberId);
      }
    }

    for (const friendship of friendships) {
      const first = idOf((friendship as any).user1);
      const second = idOf((friendship as any).user2);
      if (first) ids.add(first);
      if (second) ids.add(second);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Could not load workspace status audience for ${userId}: ${reason}`,
    );
  }

  return [...ids];
}

function deliver(message: WorkspaceStatusMessage) {
  const socketService = (global as any).socketService;
  if (!socketService?.emitToUser) return;
  for (const userId of message.userIds) {
    socketService.emitToUser(userId, "workspace_status", message.user);
  }
}

let consumerBooted = false;

export function startWorkspaceStatusConsumer() {
  if (consumerBooted) return;
  consumerBooted = true;

  startRabbitConsumer(getWorkspaceStatusQueue(), async (payload) => {
    const message = payload as WorkspaceStatusMessage;
    if (!message?.user?.id || !Array.isArray(message.userIds)) return;
    deliver(message);
  });
}

export async function publishWorkspaceStatus(user: WorkspaceStatusPayload) {
  if (!user?.id) return;

  const message: WorkspaceStatusMessage = {
    user,
    userIds: await audienceFor(user.id),
    occurredAt: new Date().toISOString(),
  };

  try {
    const active = await getTaskChannel();
    if (!active) {
      deliver(message);
      return;
    }

    const published = active.publish(
      getTaskExchange(),
      "workspace.availability",
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" },
    );

    if (!published) deliver(message);
  } catch (error) {
    logger.error("Failed to publish workspace status:", error);
    deliver(message);
  }
}
