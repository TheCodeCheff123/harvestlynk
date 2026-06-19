import nodemailer from "nodemailer";

const smtpReady = !!(process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASS"]);

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env["SMTP_HOST"],
      port: Number(process.env["SMTP_PORT"] ?? 587),
      secure: process.env["SMTP_PORT"] === "465",
      auth: {
        user: process.env["SMTP_USER"],
        pass: process.env["SMTP_PASS"],
      },
    })
  : null;

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  verifyLink: string;
}) {
  const subject = "Verify your HarvestLynk email address";
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">Verify your email</h2>
      <p>Hi ${opts.name},</p>
      <p>Thanks for signing up for HarvestLynk. Click the button below to verify your email address and log in. This link expires in <strong>10 minutes</strong>.</p>

      <a href="${opts.verifyLink}"
         style="display:inline-block;margin:24px 0;padding:12px 28px;background:#2f855a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
        Verify my email
      </a>

      <p style="color:#888;font-size:12px;margin-top:32px">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  if (!transporter) {
    console.log("\n📧 [EMAIL — no SMTP configured, printing to console]");
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Verify:  ${opts.verifyLink}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"HarvestLynk" <${process.env["SMTP_FROM"]}>`,
    to: opts.to,
    subject,
    html,
  });
}

export async function sendNewLoginAlert(opts: {
  to: string;
  name: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  revokeLink: string;
}) {
  const time = opts.loginTime.toUTCString();
  const subject = "New device signed in to your HarvestLynk account";
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">New sign-in detected</h2>
      <p>Hi ${opts.name},</p>
      <p>We detected a new sign-in to your HarvestLynk account.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9f9f9;border-radius:8px;padding:16px">
        <tr><td style="padding:6px 12px;color:#555;font-size:13px">Time</td><td style="padding:6px 12px;font-size:13px">${time}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;font-size:13px">IP Address</td><td style="padding:6px 12px;font-size:13px">${opts.ipAddress}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;font-size:13px">Device</td><td style="padding:6px 12px;font-size:13px">${opts.userAgent}</td></tr>
      </table>

      <p>If this was you, you can ignore this email.</p>
      <p>If you don't recognise this sign-in, click the button below to immediately log out that device:</p>

      <a href="${opts.revokeLink}"
         style="display:inline-block;margin:16px 0;padding:12px 24px;background:#e53e3e;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
        Logout unknown device
      </a>

      <p style="color:#888;font-size:12px;margin-top:32px">
        This link expires in 24 hours. If you need help, contact support.
      </p>
    </div>
  `;

  if (!transporter) {
    console.log("\n📧 [EMAIL — no SMTP configured, printing to console]");
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Time:    ${time}`);
    console.log(`  IP:      ${opts.ipAddress}`);
    console.log(`  Device:  ${opts.userAgent}`);
    console.log(`  Revoke:  ${opts.revokeLink}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"HarvestLynk Security" <${process.env["SMTP_FROM"]}>`,
    to: opts.to,
    subject,
    html,
  });
}
