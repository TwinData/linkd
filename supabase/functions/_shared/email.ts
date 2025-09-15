// Email service integration using SendGrid
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

interface EmailAttachment {
  filename: string;
  content: string;
  encoding: string;
  contentType: string;
}

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(options: EmailOptions): Promise<any> {
  try {
    const client = new SmtpClient();

    // Connect to SMTP server using environment variables
    await client.connectTLS({
      hostname: Deno.env.get("SMTP_HOSTNAME") || "smtp.gmail.com",
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
      username: Deno.env.get("SMTP_USERNAME") || "",
      password: Deno.env.get("SMTP_PASSWORD") || "",
    });

    // Send the email
    const result = await client.send({
      from: Deno.env.get("EMAIL_FROM") || "noreply@linkd-connect.com",
      to: options.to,
      subject: options.subject,
      content: options.html,
      html: options.html,
      attachments: options.attachments || [],
    });

    // Close the connection
    await client.close();

    return { success: true, messageId: result };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: error.message };
  }
}
