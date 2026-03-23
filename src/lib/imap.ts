import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseEmail } from "@/lib/parser";
import { prisma } from "@/lib/db";

function createImapClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASSWORD!,
    },
    logger: false,
  });
}

export async function syncEmails(): Promise<number> {
  const client = createImapClient();
  let imported = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Fetch all messages
      const messages = client.fetch("1:*", {
        envelope: true,
        source: true,
        uid: true,
      });

      for await (const msg of messages) {
        const messageId = msg.envelope?.messageId;
        if (!messageId) continue;

        // Skip if already in DB
        const existing = await prisma.incomingEmail.findUnique({
          where: { messageId },
        });
        if (existing) continue;

        // Parse the email
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.text || "";
        const subject = parsed.subject || "";
        const body = (parsed.html || parsed.textAsHtml || parsed.text || "") as string;

        // Extract customer data from email body
        const extracted = parseEmail(body, subject);

        await prisma.incomingEmail.create({
          data: {
            messageId,
            from,
            subject,
            body,
            receivedAt: parsed.date || new Date(),
            productUrl: extracted.productUrl,
            productName: extracted.productName,
            customerName: extracted.customerName,
            customerEmail: extracted.customerEmail,
            customerPhone: extracted.customerPhone,
            category: extracted.category,
          },
        });

        imported++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return imported;
}
