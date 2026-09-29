import { Project } from "../models/index";
import { logger } from "../helpers/index";
import { emitTaskUpdated } from "../utils/notify";
import {
  getTaskChannel,
  getTaskExchange,
  getTaskStatusQueue,
  startRabbitConsumer,
} from "./rabbitmq.service";

export type TaskEventAction =
  | "assigned"
  | "status_updated"
  | "updated"
  | "reassigned"
  | "deleted";

export interface TaskQueueMessage {
  action: TaskEventAction;
  task: Record<string, any>;
  userIds: string[];
  occurredAt: string;
}

const idOf = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.id) return String(value.id);
  if (value._id) return String(value._id);
  if (typeof value.toHexString === "function") return value.toHexString();
  return null;
};

const addId = (ids: Set<string>, value: any) => {
  const id = idOf(value);
  if (id) ids.add(id);
};

async function memberIdsForProjects(projectIds: Array<string | null | undefined>) {
  const ids = new Set<string>();
  const unique = [...new Set(projectIds.map(idOf).filter(Boolean) as string[])];

  await Promise.all(
    unique.map(async (projectId) => {
      try {
        const project = await Project.findById(projectId)
          .select("members createdBy")
          .lean();
        if (!project) return;
        addId(ids, (project as any).createdBy);
        for (const member of (project as any).members || []) {
          addId(ids, member?.user);
        }
      } catch (error) {
        logger.warn(`Could not load project audience ${projectId}:`, error);
      }
    }),
  );

  return ids;
}

async function resolveAudience(
  task: Record<string, any>,
  extraUserIds: Array<string | null | undefined> = [],
  projectIds: Array<string | null | undefined> = [],
) {
  const ids = new Set<string>();
  addId(ids, task.assignTo);
  addId(ids, task.assignedBy);
  extraUserIds.forEach((id) => addId(ids, id));

  const members = await memberIdsForProjects([
    task.project,
    task.projectId,
    ...projectIds,
  ]);
  members.forEach((id) => ids.add(id));
  return [...ids];
}

function deliver(message: TaskQueueMessage) {
  const task =
    message.action === "deleted"
      ? { ...message.task, deleted: true }
      : message.task;
  emitTaskUpdated(message.userIds, task);
}

let consumerBooted = false;

export function startTaskStatusConsumer() {
  if (consumerBooted) return;
  consumerBooted = true;

  startRabbitConsumer(getTaskStatusQueue(), async (payload) => {
    const message = payload as TaskQueueMessage;
    if (!message?.task || !Array.isArray(message.userIds)) return;
    deliver(message);
  });
}

export async function publishTaskChange(input: {
  action: TaskEventAction;
  task: Record<string, any>;
  extraUserIds?: Array<string | null | undefined>;
  projectIds?: Array<string | null | undefined>;
}) {
  const userIds = await resolveAudience(
    input.task,
    input.extraUserIds,
    input.projectIds,
  );
  const message: TaskQueueMessage = {
    action: input.action,
    task:
      input.action === "deleted"
        ? { ...input.task, deleted: true }
        : input.task,
    userIds,
    occurredAt: new Date().toISOString(),
  };

  if (userIds.length === 0) return;

  try {
    const active = await getTaskChannel();
    if (!active) {
      deliver(message);
      return;
    }

    const published = active.publish(
      getTaskExchange(),
      `task.${input.action}`,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json",
      },
    );

    if (!published) deliver(message);
  } catch (error) {
    logger.error("Failed to publish task status event:", error);
    deliver(message);
  }
}
