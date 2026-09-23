import cron from "node-cron";
import { sendOverdueReminders } from "./automationRunner";
import { logger } from "../helpers/index";

const OVERDUE_CRON_NAME = "overdue-reminders";

const alreadyScheduled =
  typeof cron.getTasks === "function" &&
  [...cron.getTasks().values()].some(
    (task) => task.name === OVERDUE_CRON_NAME,
  );

if (!alreadyScheduled) {
  cron.schedule(
    "*/30 * * * *",
    async () => {
      try {
        logger.info("Running overdue reminder automation");
        await sendOverdueReminders();
      } catch (err: any) {
        logger.error(`Overdue reminder cron failed: ${err?.message || err}`);
      }
    },
    {
      timezone: "Asia/Karachi",
      name: OVERDUE_CRON_NAME,
      noOverlap: true,
    },
  );
}
