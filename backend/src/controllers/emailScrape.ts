import { Request, Response } from 'express';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export const scrapeEmails = async (req: Request, res: Response) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const port = parseInt(process.env.IMAP_PORT || '993');

  if (!user || !pass) {
    return res.status(400).json({ error: 'Email credentials not configured in backend .env' });
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: {
      user,
      pass
    },
    logger: false
  });

  try {
    await client.connect();

    // Select and examine a mailbox
    let mailbox;
    let messages = [];
    try {
      mailbox = await client.getMailboxLock('INBOX');
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;
      const start = Math.max(1, total - 4);
      
      console.log(`[EMAIL_SCRAPER] Fetching range ${start}:${total} for ${user}`);

      for await (let message of client.fetch(`${start}:${total}`, { source: true })) {
        if (!message.source) continue;
        
        const parsed: any = await simpleParser(message.source);
        
        // Convert HTML or text to Markdown
        const content = parsed.html ? turndownService.turndown(parsed.html) : (parsed.text || '');
        
        // Extract suggestions from content (simple heuristic: lines starting with tasks)
        const suggestions: string[] = [];
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 5 && trimmed.length < 100 && (trimmed.startsWith('- [ ]') || trimmed.startsWith('* ') || trimmed.match(/^[0-9]+\./))) {
            suggestions.push(trimmed.replace(/^[-*] \[ \] |^[-*] |^[0-9]+\. /, ''));
          }
          if (suggestions.length >= 5) break;
        }

        messages.push({
          id: message.uid,
          title: parsed.subject || 'No Subject',
          from: parsed.from?.text,
          date: parsed.date,
          content: content.slice(0, 5000),
          suggestions: suggestions.length > 0 ? suggestions : [parsed.subject || 'Task from Email']
        });
      }
    } finally {
      if (mailbox) mailbox.release();
    }

    await client.logout();
    res.json({ emails: messages });

  } catch (error: any) {
    console.error('[EMAIL_SCRAPER] Error:', error.message);
    res.status(500).json({ error: 'Failed to scrape emails', details: error.message });
  }
};
