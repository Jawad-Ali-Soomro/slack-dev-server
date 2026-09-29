import amqp, { Channel, ChannelModel } from "amqplib";
import { logger } from "../helpers/index";

const EXCHANGE = "slack.tasks";
const QUEUE = "task.assignment.status";
const ROUTING_PATTERN = "task.*";
const WORKSPACE_QUEUE = "workspace.status";
const WORKSPACE_PATTERN = "workspace.*";
const CHAT_QUEUE = "chat.notification";
const CHAT_PATTERN = "chat.*";

type RabbitHandler = (payload: unknown) => Promise<void> | void;

const consumers: Array<{ queue: string; onMessage: RabbitHandler }> = [];
let loopStarted = false;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting: Promise<Channel> | null = null;
let unavailableUntil = 0;
let stopped = false;

export function rabbitUrl(): string {
  return process.env.RABBITMQ_URL as string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function markDisconnected() {
  channel = null;
  connection = null;
  connecting = null;
}

async function openChannel(): Promise<Channel> {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    if (!connection) {
      const nextConnection = await amqp.connect(rabbitUrl());
      nextConnection.on("error", (error) => {
        logger.error("RabbitMQ connection error:", error);
      });
      nextConnection.on("close", () => {
        if (connection === nextConnection) markDisconnected();
      });
      connection = nextConnection;
    }

    const nextChannel = await connection.createChannel();
    nextChannel.on("error", (error) => {
      logger.error("RabbitMQ channel error:", error);
    });
    nextChannel.on("close", () => {
      if (channel === nextChannel) channel = null;
    });

    await nextChannel.assertExchange(EXCHANGE, "topic", { durable: true });
    await nextChannel.assertQueue(QUEUE, { durable: true });
    await nextChannel.bindQueue(QUEUE, EXCHANGE, ROUTING_PATTERN);
    await nextChannel.assertQueue(WORKSPACE_QUEUE, { durable: true });
    await nextChannel.bindQueue(WORKSPACE_QUEUE, EXCHANGE, WORKSPACE_PATTERN);
    await nextChannel.assertQueue(CHAT_QUEUE, { durable: true });
    await nextChannel.bindQueue(CHAT_QUEUE, EXCHANGE, CHAT_PATTERN);
    await nextChannel.prefetch(20);

    channel = nextChannel;
    unavailableUntil = 0;
    logger.info("RabbitMQ connected for task assignment status");
    return nextChannel;
  })().finally(() => {
    connecting = null;
  });

  return connecting;
}

export async function getTaskChannel(): Promise<Channel | null> {
  if (channel) return channel;
  if (Date.now() < unavailableUntil) return null;

  try {
    return await openChannel();
  } catch (error) {
    unavailableUntil = Date.now() + 5000;
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`RabbitMQ unavailable, task status will emit directly: ${reason}`);
    markDisconnected();
    return null;
  }
}

export function getTaskExchange() {
  return EXCHANGE;
}

export function getTaskStatusQueue() {
  return QUEUE;
}

export function getWorkspaceStatusQueue() {
  return WORKSPACE_QUEUE;
}

export function getChatNotificationQueue() {
  return CHAT_QUEUE;
}

function consumeQueue(active: Channel, queue: string, onMessage: RabbitHandler) {
  return active.consume(queue, (message) => {
    if (!message) return;
    void (async () => {
      try {
        const payload = JSON.parse(message.content.toString());
        await onMessage(payload);
        active.ack(message);
      } catch (error) {
        logger.error(`RabbitMQ message failed on ${queue}:`, error);
        try {
          active.nack(message, false, false);
        } catch {
          // channel already closed
        }
      }
    })();
  });
}

export function startRabbitConsumer(queue: string, onMessage: RabbitHandler) {
  if (consumers.some((consumer) => consumer.queue === queue)) return;
  consumers.push({ queue, onMessage });

  if (loopStarted || stopped) return;
  loopStarted = true;
  queueMicrotask(() => {
    void runConsumerLoop();
  });
}

async function runConsumerLoop() {
  let delay = 2000;
  while (!stopped) {
    try {
      const active = await openChannel();
      for (const consumer of consumers) {
        await consumeQueue(active, consumer.queue, consumer.onMessage);
      }

      logger.info(
        `Listening on RabbitMQ queues ${consumers.map((consumer) => consumer.queue).join(", ")}`,
      );
      delay = 2000;
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        active.once("close", finish);
        connection?.once("close", finish);
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`RabbitMQ consumer retry in ${delay}ms: ${reason}`);
      markDisconnected();
      await sleep(delay);
      delay = Math.min(delay * 2, 30000);
    }
  }
}

export async function closeRabbit() {
  stopped = true;
  try {
    await channel?.close();
    await connection?.close();
  } catch {
    // already closed
  } finally {
    markDisconnected();
  }
}
