import cron from "node-cron";
import {
  sendDailyStandupDigests,
  sendOverdueReminders,
  syncOpenPullRequests,
} from "./automationRunner";
import { logger } from "../helpers/index";

const scheduleOnce = (
  name: string,
  expression: string,
  job: () => Promise<unknown>,
) => {
  const already =
    typeof cron.getTasks === "function" &&
    [...cron.getTasks().values()].some((task) => task.name === name);
  if (already) return;

  cron.schedule(
    expression,
    async () => {
      try {
        logger.info(`Running ${name}`);
        await job();
      } catch (err: any) {
        logger.error(`${name} failed: ${err?.message || err}`);
      }
    },
    {
      timezone: "Asia/Karachi",
      name,
      noOverlap: true,
    },
  );
};

scheduleOnce("overdue-reminders", "*/30 * * * *", sendOverdueReminders);
scheduleOnce("pr-task-sync", "*/5 * * * *", syncOpenPullRequests);
scheduleOnce("daily-standup-digest", "0 9 * * *", sendDailyStandupDigests);
