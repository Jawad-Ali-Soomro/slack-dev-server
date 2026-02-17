import { EmailTemplateData } from "../interfaces/task.interface";

const buildTaskOverdueEmail = (data: EmailTemplateData) => {
  const {
    type = "TASK_OVERDUE",

    username = "USER",
    siteName = "CORE STACK",
    buttonUrl = "#",
    supportEmail = "support@slackdev.com",
    logoUrl,

    otp,

    taskTitle,
    taskDescription,
    dueDate,
    overdueBy,
  } = data;

  const buttonText = type === "TASK_OVERDUE" ? "VIEW TASK" : "VERIFY EMAIL";

  const preheader =
    type === "TASK_OVERDUE"
      ? `Task Overdue: ${taskTitle}`
      : `Your ${siteName} Verification Code Is ${otp}`;
  const text =
    type === "TASK_OVERDUE"
      ? `${siteName} - Task Overdue

Hello ${username},

Your Task Is Overdue.

Title ${taskTitle}
Description ${taskDescription}
Due Date ${dueDate}
Overdue By ${overdueBy}

Take Action
${buttonUrl}

— ${siteName} TEAM`
      : `${siteName} - EMAIL VERIFICATION

HELLO ${username},

YOUR VERIFICATION CODE IS: ${otp}

VERIFY:
${buttonUrl}

THANKS,
${siteName} TEAM`;

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * {
      font-family: 'Public Sans', Arial, sans-serif;
      text-transform: uppercase;
    }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 16px !important; }
      .btn { width: 100% !important; }
    }
  </style>
</head>

<body style="margin:0; padding:0; background:#f5f7fb;">

<span style="display:none; font-size:1px;">
  ${preheader}
</span>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:20px;">
  <table class="container" width="600" style="background:#fff; border-radius:8px; padding:40px; box-shadow:0 6px 18px rgba(0,0,0,.08);">

    <!-- HEADER -->
    <tr>
      <td align="center">
        ${
          logoUrl
            ? `<img src="cid:logo" width="90" alt="${siteName}" />`
            : `<strong style="color:#f97316;">${siteName}</strong>`
        }
        <div style="font-size:11px; color:#8b94a6; margin-top:8px;">
          ${type === "TASK_OVERDUE" ? "TASK ALERT" : "EMAIL VERIFICATION"}
        </div>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="content" style="padding:24px; text-align:center;">

        ${
          type === "TASK_OVERDUE"
            ? `
            <h1 style="font-size:16px; color:#dc2626; font-weight:900;">
              TASK OVERDUE
            </h1>

            <p style="font-size:11px; color:#6b7280; font-weight:600;">
              THE FOLLOWING TASK HAS PASSED ITS DUE DATE
            </p>

            <table style="margin:20px auto; width:100%; font-size:11px; text-align:left;">
              <tr><td><strong>TITLE</strong></td><td>${taskTitle}</td></tr>
              <tr><td><strong>DESCRIPTION</strong></td><td>${taskDescription}</td></tr>
              <tr><td><strong>DUE DATE</strong></td><td>${dueDate}</td></tr>
              <tr>
                <td><strong>OVERDUE BY</strong></td>
                <td style="color:#dc2626; font-weight:700;">${overdueBy}</td>
              </tr>
            </table>
          `
            : `
            <h1 style="font-size:16px; color:#000; font-weight:900;">
              HELLO ${username}
            </h1>

            <p style="font-size:11px; color:#6b7280; font-weight:600;">
              USE THIS CODE TO CONFIRM YOUR EMAIL
            </p>

            <table style="margin:20px auto;">
              <tr>
                ${otp
                  ?.split("")
                  .map(
                    (d) => `
                  <td style="
                    width:44px;
                    height:44px;
                    border:2px solid #f97316;
                    border-radius:8px;
                    color:#f97316;
                    font-size:20px;
                    font-weight:700;
                    text-align:center;">
                    ${d}
                  </td>`,
                  )
                  .join("")}
              </tr>
            </table>
          `
        }

        <!-- BUTTON -->
        <a href="${buttonUrl}"
           class="btn"
           style="
             display:inline-block;
             background:#f97316;
             color:#fff;
             padding:10px 24px;
             border-radius:6px;
             text-decoration:none;
             font-size:12px;
             font-weight:700;">
          ${buttonText}
        </a>

        <!-- FOOTER -->
        <p style="margin-top:20px; font-size:10px; color:#6b7280;">
          NEED HELP?
          <a href="mailto:${supportEmail}" style="color:#f97316; text-transform:none;">
            ${supportEmail}
          </a>
        </p>

      </td>
    </tr>

  </table>
</td>
</tr>
</table>

</body>
</html>
`;

  return { html, text };
};


export default buildTaskOverdueEmail