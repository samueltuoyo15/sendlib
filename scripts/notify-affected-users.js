const https = require("https");

const API_KEY = "afsdfsfafsfs";
const FROM = "";
const BASE_URL = "sendlib.samueltuoyo.com";

const AFFECTED_USERS = [];

function sendEmail(to, name) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: FROM,
      to,
      subject: "Action Required: Please Reconnect Your Gmail Account on Sendlib",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <p>Hi ${name},</p>
          <p>We recently fixed an issue with the Gmail OAuth integration on Sendlib that may have caused your connected Gmail account to appear disconnected.</p>
          <p>To get back up and running, please log in to your Sendlib dashboard, navigate to <strong>Gmail Accounts</strong>, and reconnect your account. It only takes a few seconds.</p>
          <p>Sorry for the inconvenience. The fix is now live and this should not happen again.</p>
          <p>The Sendlib Team</p>
        </div>
      `,
    });

    const options = {
      hostname: BASE_URL,
      path: "/api/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`[${to}] Status: ${res.statusCode} - ${data}`);
        resolve();
      });
    });

    req.on("error", (err) => {
      console.error(`[${to}] Error: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("Sending reconnection emails to affected users...\n");
  for (const user of AFFECTED_USERS) {
    await sendEmail(user.email, user.name);
  }
  console.log("\nDone.");
}

main();
