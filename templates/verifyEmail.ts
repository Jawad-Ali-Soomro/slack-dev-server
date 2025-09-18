import { OtpTemplateData } from "../interfaces";

export const buildOtpEmail = (data: OtpTemplateData) => {
  const {
    username = "USER",
    otp,
    siteName = "CORE STACK",
    buttonText = "VERIFY EMAIL",
    buttonUrl = "#",
    supportEmail = "SUPPORT@EXAMPLE.COM",
    logoUrl,
  } = data;

  const preheader = `YOUR ${siteName} VERIFICATION CODE IS ${otp}`;

  const text = `${siteName} - EMAIL VERIFICATION\n\nHELLO ${username},\n\nYOUR VERIFICATION CODE IS: ${otp}\n\nIF YOU DIDN'T REQUEST THIS, IGNORE THIS MESSAGE OR CONTACT ${supportEmail}.\n\n${buttonUrl}\n\nTHANKS,\n${siteName} TEAM`;

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .content { padding: 16px !important; }
        .btn { width: 100% !important; display: block !important; }
      }
      * {
        text-transform: uppercase !important;
        font-family: 'Public Sans', Arial, sans-serif;
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f7fb; color:#333; font-family:'Public Sans', Arial, sans-serif;">

    <span style="display:none; font-size:1px; color:#f5f7fb; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      ${preheader}
    </span>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 20px 10px;">
          <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" 
            style="width:600px; background:#ffffff; border-radius:8px; padding: 50px; overflow:hidden; box-shadow:0 6px 18px rgba(23, 32, 64, 0.08); text-align:center;">
            
            <tr>
              <td style="padding: 20px; text-align:center;">
                ${
                  logoUrl
                    ? `<img src="cid:logo" alt="${siteName}" width="100" style="display:block; margin:0 auto; border:0;" />`
                    : `<strong style="font-size:16px; color:orange; display:block;">${siteName}</strong>`
                }
                <div style="font-size:11px; color:#8b94a6; margin-top:10px;">VERIFICATION</div>
              </td>
            </tr>

            <tr>
              <td class="content" style="padding: 16px 24px 8px; text-align:center;">
                <h1 style="margin:0 0 10px; font-size:16px; color:#111827; font-weight:900;">HELLO ${username}</h1>
                <p style="margin:0 0 14px; line-height:1.4; color:#6b7280; font-size:10px;font-weight:600">
                  USE THIS CODE TO CONFIRM YOUR EMAIL ADDRESS.
                </p>

                <div style="margin: 20px 0; text-align:center;">
                  <table style="margin: 0 auto; border-collapse: separate; border-spacing: 8px;">
                    <tr>
                      ${otp.split('').map(digit => 
                        `<td style="width:45px; height:45px; border:2px solid #f97316; border-radius:8px; background:#fff; color:#f97316; font-weight:700; font-size:20px; text-align:center; vertical-align:middle;">${digit}</td>`
                      ).join('')}
                    </tr>
                  </table>
                </div>

                <p style="margin: 0 0 14px; color:#6b7280; font-size:10px;font-weight:600">
                  OR CLICK THE BUTTON BELOW TO VERIFY:
                </p>

                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px;">
                  <tr>
                    <td align="center">
                      <a href="${buttonUrl}" target="_blank" 
                        style="background-color:#f97316; color:#ffffff; padding:10px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600; font-size:12px;">
                        ${buttonText}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0; line-height:1.4;">
                  <span style="color:#6b7280; font-size:10px;font-weight:600 ">IF YOU DIDN'T REQUEST THIS, CONTACT US AT</span> <br />
                  <a href="mailto:${supportEmail}" style="color:#f97316; text-transform:none !important; margin-top: 10px !important; margin-bottom: 20px; ">${supportEmail}</a>
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
