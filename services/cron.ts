import cron from "node-cron";
import { sendOverdueTaskEmails } from "../controllers/enhanced.task.controller";

cron.schedule(
  "10 12 * * *",
  async () => {
    console.log("Messages sent!", new Date());
    await sendOverdueTaskEmails();
  },
  { timezone: "Asia/Karachi" },
);
