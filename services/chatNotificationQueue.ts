import { logger } from "../helpers/index";
import { emitNotification } from "../utils/notify";
import {
  getChatNotificationQueue,
  getTaskChannel,
  getTaskExchange,
  startRabbitConsumer,
} from "./rabbitmq.service";

interface ChatNotificationMessage {
  recipientId: string;
  notification: Record<string, any>;
}

function deliver(message: ChatNotificationMessage) {
  if (!message?.recipientId || !message.notification) return;
  emitNotification(message.recipientId, message.notification);
}

let consumerBooted = false;

export function startChatNotificationConsumer() {
  if (consumerBooted) return;
  consumerBooted = true;

  startRabbitConsumer(getChatNotificationQueue(), async (payload) => {
    deliver(payload as ChatNotificationMessage);
  });
}

export async function publishChatNotification(
  recipientId: string,
  notification: Record<string, any> | null,
) {
  if (!recipientId || !notification) return;

  const message: ChatNotificationMessage = { recipientId, notification };

  try {
    const active = await getTaskChannel();
    if (!active) {
      deliver(message);
      return;
    }

    const published = active.publish(
      getTaskExchange(),
      "chat.message",
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" },
    );

    if (!published) deliver(message);
  } catch (error) {
    logger.error("Failed to publish chat notification:", error);
    deliver(message);
  }
}
