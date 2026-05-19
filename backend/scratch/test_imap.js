const { ImapFlow } = require('imapflow');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    logger: false
  });

  try {
    console.log('Connecting to', process.env.EMAIL_USER, '...');
    await client.connect();
    console.log('Connected successfully!');
    const mailbox = await client.status('INBOX', { messages: true });
    console.log('Mailbox status:', mailbox);
    await client.logout();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.response) console.error('Response:', err.response);
  }
}

testConnection();
