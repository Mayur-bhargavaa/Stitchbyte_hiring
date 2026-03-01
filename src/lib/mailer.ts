import nodemailer from "nodemailer";
import dbConnect from "./mongodb";
import EmailQueue from "@/models/EmailQueue";
import NotificationPreferences from "@/models/NotificationPreferences";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtpout.secureserver.net",
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "info@stitchbyte.in",
    pass: process.env.EMAIL_PASSWORD || "Mayur@2608",
  },
});

const BRAND = {
  name: "Stitchbyte",
  logo: "https://stitchbyte.in/logo.png",
  color: "#7C3AED",
  bg: "#0B0F1A",
  card: "#141A2E",
  text: "#E2E8F0",
  muted: "#94A3B8",
};

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h2 style="color:white;font-size:24px;margin:0;">
        <span style="color:${BRAND.color};">●</span> ${BRAND.name}
      </h2>
      <p style="color:${BRAND.muted};font-size:13px;margin:4px 0 0;">Business Development Executive Program</p>
    </div>
    <div style="background:${BRAND.card};border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;margin-bottom:24px;">
      ${content}
    </div>
    <div style="text-align:center;padding:16px 0;">
      <p style="color:${BRAND.muted};font-size:12px;margin:0;">© ${new Date().getFullYear()} Stitchbyte Technologies Pvt. Ltd.</p>
      <p style="color:${BRAND.muted};font-size:11px;margin:4px 0 0;">For support: <a href="mailto:info@stitchbyte.in" style="color:${BRAND.color};">info@stitchbyte.in</a></p>
    </div>
  </div>
</body>
</html>
`;

export async function sendQualificationEmail(to: string, candidateName: string, candidateId: string, bookingUrl: string) {
  const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.15);display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#10B981;font-size:28px;">✓</span>
        </div>
      </div>
      <h2 style="color:white;text-align:center;font-size:22px;margin:0 0 8px;">Congratulations, ${candidateName}! 🎉</h2>
      <p style="color:${BRAND.text};text-align:center;font-size:15px;margin:0 0 24px;line-height:1.6;">
        You've successfully passed the Stitchbyte BDE Assessment. We're excited to move forward with you!
      </p>
      <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="color:${BRAND.muted};font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Your Candidate ID</p>
        <p style="color:white;font-size:20px;font-weight:700;margin:0;font-family:monospace;">${candidateId}</p>
      </div>
      <p style="color:${BRAND.text};font-size:14px;margin:0 0 20px;line-height:1.6;">
        Your next step is to schedule a <strong style="color:white;">1:1 interview</strong> with our founder. Click the button below to pick your time slot.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${bookingUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,${BRAND.color},#06B6D4);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
          📅 Schedule Your Interview
        </a>
      </div>
      <p style="color:${BRAND.muted};font-size:12px;text-align:center;margin:0;">
        Keep your Candidate ID safe — you'll need it to access your booking portal.
      </p>
    `);

  try {
    await transporter.sendMail({
      from: `"Stitchbyte Hiring" <info@stitchbyte.in>`,
      to,
      subject: `🎉 You're Qualified! Schedule Your Interview — ${candidateId}`,
      html,
    });
    console.log(`✅ Qualification email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send qualification email to ${to}:`, err);
  }
}

export async function sendBookingConfirmationEmail(
  to: string,
  candidateName: string,
  candidateId: string,
  interviewDate: string,
  interviewTime: string,
  meetingLink: string
) {
  const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(124,58,237,0.15);display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:${BRAND.color};font-size:28px;">📹</span>
        </div>
      </div>
      <h2 style="color:white;text-align:center;font-size:22px;margin:0 0 8px;">Interview Confirmed!</h2>
      <p style="color:${BRAND.text};text-align:center;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Hi ${candidateName}, your 1:1 founder interview is locked in. Here are the details:
      </p>
      <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:${BRAND.muted};font-size:13px;padding:8px 0;">📅 Date</td>
            <td style="color:white;font-size:15px;font-weight:600;text-align:right;padding:8px 0;">${interviewDate}</td>
          </tr>
          <tr>
            <td style="color:${BRAND.muted};font-size:13px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">🕐 Time</td>
            <td style="color:white;font-size:15px;font-weight:600;text-align:right;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">${interviewTime}</td>
          </tr>
          <tr>
            <td style="color:${BRAND.muted};font-size:13px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">🆔 CID</td>
            <td style="color:${BRAND.color};font-size:15px;font-weight:600;text-align:right;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);font-family:monospace;">${candidateId}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${meetingLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,${BRAND.color},#06B6D4);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
          📹 Join Stitchbyte Meet
        </a>
      </div>
      <p style="color:${BRAND.muted};font-size:12px;text-align:center;margin:0;line-height:1.5;">
        The meeting room opens 5 minutes before your scheduled time.<br/>
        Please be ready with a stable internet connection and a quiet environment.
      </p>
    `);

  try {
    await transporter.sendMail({
      from: `"Stitchbyte Hiring" <info@stitchbyte.in>`,
      to,
      subject: `📹 Interview Confirmed — ${interviewDate} at ${interviewTime}`,
      html,
    });
    console.log(`✅ Booking confirmation email sent to ${to}`);
  } catch (err: any) {
    console.error(`❌ Failed to send booking email to ${to}:`, err);
    
    // Handle specific error types
    if (err?.code === 'EAUTH') {
      console.warn('⚠️  Email authentication error (EAUTH 535) - Email service credentials may be misconfigured');
      console.warn(`   User: ${err.response}, Error: ${err.responseCode}`);
    }
    
    // Queue email for retry if possible
    try {
      await dbConnect();
      await EmailQueue.create({
        to,
        subject: `📹 Interview Confirmed — ${interviewDate} at ${interviewTime}`,
        html,
        candidateId,
        type: 'booking_confirmation',
        retries: 0,
        status: 'pending',
        createdAt: new Date(),
      });
      console.log(`📋 Email queued for retry: ${to}`);
    } catch (queueErr) {
      console.error('Failed to queue email:', queueErr);
    }
  }
}

export async function sendRejectionEmail(to: string, candidateName: string) {
  const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#EF4444;font-size:28px;">✕</span>
        </div>
      </div>
      <h2 style="color:white;text-align:center;font-size:22px;margin:0 0 8px;">Update on Your Application</h2>
      <p style="color:${BRAND.text};text-align:center;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Hi ${candidateName},<br/><br/>
        Thank you for completing the assessment for the BDE role at Stitchbyte.
      </p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:${BRAND.text};font-size:14px;margin:0;line-height:1.6;">
          At this time, we are prioritizing candidates with a slightly different execution profile that is hyper-aligned with our immediate growth targets.
        </p>
      </div>
      <p style="color:${BRAND.text};font-size:14px;margin:0 0 20px;line-height:1.6;text-align:center;">
        We appreciate your time and drive. We'll keep your data on file if a better-suited role opens up.
      </p>
    `);

  try {
    await transporter.sendMail({
      from: `"Stitchbyte Hiring" <info@stitchbyte.in>`,
      to,
      subject: `Stitchbyte BDE Application Update`,
      html,
    });
    console.log(`✅ Rejection email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send rejection email to ${to}:`, err);
  }
}

/**
 * Queue email instead of sending immediately
 */
export async function queueEmail(
  to: string,
  subject: string,
  html: string,
  type: "qualification" | "rejection" | "booking_confirmation" | "interview_reminder" | "custom",
  candidateId?: string,
  scheduledAt?: Date
) {
  try {
    await dbConnect();
    
    const prefs = await NotificationPreferences.findOne({ settingId: "default" });
    if (!prefs || !prefs.enableEmailQueue) {
      // If queue disabled, send immediately
      await transporter.sendMail({
        from: `"Stitchbyte Hiring" <${process.env.EMAIL_USER || "info@stitchbyte.in"}>`,
        to,
        subject,
        html,
      });
      return;
    }

    await EmailQueue.create({
      to,
      subject,
      html,
      type,
      candidateId,
      scheduledAt: scheduledAt || new Date(),
    });
    
    console.log(`📧 Email queued for ${to}`);
  } catch (err) {
    console.error(`❌ Failed to queue email:`, err);
  }
}

/**
 * Process email queue
 */
export async function processEmailQueue() {
  try {
    await dbConnect();
    
    const prefs = await NotificationPreferences.findOne({ settingId: "default" });
    const maxPerBatch = prefs?.maxEmailsPerMinute || 10;
    
    const pendingEmails = await EmailQueue.find({
      status: "pending",
      $or: [
        { scheduledAt: { $lte: new Date() } },
        { scheduledAt: null }
      ],
      attempts: { $lt: 3 }
    }).limit(maxPerBatch);

    for (const email of pendingEmails) {
      try {
        await EmailQueue.findByIdAndUpdate(email._id, { status: "sending" });
        
        await transporter.sendMail({
          from: `"Stitchbyte Hiring" <${process.env.EMAIL_USER || "info@stitchbyte.in"}>`,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });

        await EmailQueue.findByIdAndUpdate(email._id, {
          status: "sent",
          sentAt: new Date(),
        });
        
        console.log(`✅ Email sent to ${email.to}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown email error";
        await EmailQueue.findByIdAndUpdate(email._id, {
          status: "failed",
          error: message,
          $inc: { attempts: 1 },
        });
        console.error(`❌ Failed to send email to ${email.to}:`, err);
      }
    }
  } catch (err) {
    console.error("❌ Email queue processing error:", err);
  }
}

/**
 * Send interview reminder email
 */
export async function sendInterviewReminderEmail(
  to: string,
  candidateName: string,
  candidateId: string,
  interviewDate: string,
  interviewTime: string,
  meetingLink: string
) {
  const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(251,191,36,0.15);display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#FBB936;font-size:28px;">⏰</span>
        </div>
      </div>
      <h2 style="color:white;text-align:center;font-size:22px;margin:0 0 8px;">Interview Reminder 🔔</h2>
      <p style="color:${BRAND.text};text-align:center;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Hi ${candidateName}, your interview with Stitchbyte is coming up soon!
      </p>
      <div style="background:rgba(251,191,36,0.1);border:2px solid rgba(251,191,36,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:${BRAND.muted};font-size:13px;padding:8px 0;">📅 Date</td>
            <td style="color:white;font-size:15px;font-weight:600;text-align:right;padding:8px 0;">${interviewDate}</td>
          </tr>
          <tr>
            <td style="color:${BRAND.muted};font-size:13px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">🕐 Time</td>
            <td style="color:white;font-size:15px;font-weight:600;text-align:right;padding:8px 0;border-top:1px solid rgba(255,255,255,0.05);">${interviewTime}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${meetingLink}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#FBB936,#F59E0B);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
          📹 Join Interview Room
        </a>
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;margin-top:20px;">
        <p style="color:${BRAND.muted};font-size:12px;margin:0 0 8px;"><strong style="color:white;">Pro Tips:</strong></p>
        <ul style="color:${BRAND.muted};font-size:12px;margin:0;padding-left:20px;line-height:1.8;">
          <li>Test your camera and microphone beforehand</li>
          <li>Ensure stable internet connection</li>
          <li>Join from a quiet, well-lit space</li>
          <li>Have a copy of your resume ready</li>
        </ul>
      </div>
    `);

  try {
    await dbConnect();
    const prefs = await NotificationPreferences.findOne({ settingId: "default" });
    
    if (prefs && !prefs.sendInterviewReminderEmail) {
      console.log("⏭️  Interview reminders disabled");
      return;
    }

    await transporter.sendMail({
      from: `"Stitchbyte Hiring" <${process.env.EMAIL_USER || "info@stitchbyte.in"}> `,
      to,
      subject: `⏰ Interview Reminder — Tomorrow at ${interviewTime}`,
      html,
    });
    console.log(`✅ Interview reminder sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send reminder to ${to}:`, err);
  }
}

/**
 * Check notification preferences before sending
 */
export async function shouldSendNotification(type: string): Promise<boolean> {
  try {
    await dbConnect();
    const prefs = await NotificationPreferences.findOne({ settingId: "default" });
    
    if (!prefs) return true; // Default to sending if no preferences set
    
    switch (type) {
      case "qualification":
        return prefs.sendQualificationEmail;
      case "rejection":
        return prefs.sendRejectionEmail;
      case "booking_confirmation":
        return prefs.sendBookingConfirmationEmail;
      case "interview_reminder":
        return prefs.sendInterviewReminderEmail;
      default:
        return true;
    }
  } catch (err) {
    console.error("Error checking notification preferences:", err);
    return true; // Default to sending on error
  }
}
