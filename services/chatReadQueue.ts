import { logger } from "../helpers/index";
import {
  getChatReadQueue,
  getTaskChannel,
  getTaskExchange,
  startRabbitConsumer,
} from "./rabbitmq.service";

export interface ChatReadMessage {
  chatId: string;
  userId: string;
  username?: string;
  avatar?: string | null;
  readAt: string;
  participantIds: string[];
}

function deliver(message: ChatReadMessage) {
  const socketService = (global as any).socketService;
  if (!socketService?.emitToUser) return;

  const payload = {
    chatId: message.chatId,
    userId: message.userId,
    username: message.username || "User",
    avatar: message.avatar || null,
    readAt: message.readAt,
  };

  socketService.emitToChat(message.chatId, "messages_seen", payload);
  for (const participantId of message.participantIds) {
    if (!participantId || participantId === message.userId) continue;
    socketService.emitToUser(participantId, "messages_seen", payload);
  }
}

let consumerBooted = false;

export function startChatReadConsumer() {
  if (consumerBooted) return;
  consumerBooted = true;

  startRabbitConsumer(getChatReadQueue(), async (payload) => {
    const message = payload as ChatReadMessage;
    if (!message?.chatId || !message?.userId || !Array.isArray(message.participantIds)) return;
    deliver(message);
  });
}

export async function publishChatRead(message: ChatReadMessage) {
  if (!message?.chatId || !message?.userId) return;

  try {
    const active = await getTaskChannel();
    if (!active) {
      deliver(message);
      return;
    }

    const published = active.publish(
      getTaskExchange(),
      "chat.read",
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: "application/json" },
    );

    if (!published) deliver(message);
  } catch (error) {
    logger.error("Failed to publish chat read receipt:", error);
    deliver(message);
  }
}
