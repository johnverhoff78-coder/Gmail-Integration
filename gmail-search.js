/**
 * Gmail Search & Export Tool
 * Searches emails and exports to JSON with attachment download
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { authorize } = require('./auth');

async function searchEmails(query, options = {}) {
  const auth = await authorize(options.account);
  const gmail = google.gmail({ version: 'v1', auth });

  const maxResults = options.maxResults || 500;
  const outputDir = options.outputDir || path.join(__dirname, 'exports');

  console.log(`\nSearching: "${query}"`);
  console.log(`Max results: ${maxResults}`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'attachments'), { recursive: true });

  let allMessages = [];
  let pageToken = null;

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(100, maxResults - allMessages.length),
      pageToken
    });

    if (res.data.messages) {
      allMessages = allMessages.concat(res.data.messages);
      console.log(`Found ${allMessages.length} emails so far...`);
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken && allMessages.length < maxResults);

  console.log(`\nTotal emails found: ${allMessages.length}`);

  if (allMessages.length === 0) {
    console.log('No emails match your search.');
    return { emails: [], summary: { total: 0 } };
  }

  const emails = [];
  let attachmentCount = 0;

  for (let i = 0; i < allMessages.length; i++) {
    process.stdout.write(`\rProcessing ${i + 1}/${allMessages.length}...`);

    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: allMessages[i].id,
      format: 'full'
    });

    const headers = msg.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    const email = {
      id: msg.data.id,
      threadId: msg.data.threadId,
      date: getHeader('Date'),
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      snippet: msg.data.snippet,
      labels: msg.data.labelIds,
      attachments: []
    };

    const attachments = findAttachments(msg.data.payload);
    for (const att of attachments) {
      try {
        const attData = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: msg.data.id,
          id: att.attachmentId
        });

        const buffer = Buffer.from(attData.data.data, 'base64');
        const safeName = `${msg.data.id}_${att.filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
        const attPath = path.join(outputDir, 'attachments', safeName);

        await fs.writeFile(attPath, buffer);

        email.attachments.push({
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          savedAs: safeName
        });

        attachmentCount++;
      } catch (err) {
        console.error(`\nFailed to download attachment: ${att.filename}`);
      }
    }

    emails.push(email);
  }

  console.log('\n');

  emails.sort((a, b) => new Date(b.date) - new Date(a.date));

  const summary = {
    query,
    account: options.account || 'default',
    total: emails.length,
    attachments: attachmentCount,
    dateRange: {
      oldest: emails[emails.length - 1]?.date,
      newest: emails[0]?.date
    },
    senders: [...new Set(emails.map(e => e.from))],
    exportedAt: new Date().toISOString()
  };

  await fs.writeFile(path.join(outputDir, 'emails.json'), JSON.stringify(emails, null, 2));
  await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(`\n=== Export Complete ===`);
  console.log(`Emails: ${emails.length}`);
  console.log(`Attachments: ${attachmentCount}`);
  console.log(`Output: ${outputDir}`);

  return { emails, summary };
}

function findAttachments(payload, attachments = []) {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId
        });
      }
      if (part.parts) {
        findAttachments(part, attachments);
      }
    }
  }
  return attachments;
}

module.exports = { searchEmails };

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node gmail-search.js "query" [account] [max-results]');
    console.log('');
    console.log('Examples:');
    console.log('  node gmail-search.js "from:bank@example.com"');
    console.log('  node gmail-search.js "has:attachment" work 100');
    process.exit(1);
  }

  const query = args[0];
  const account = args[1] || 'default';
  const maxResults = parseInt(args[2]) || 500;
  const outputDir = path.join(__dirname, 'exports', query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30));

  searchEmails(query, { account, outputDir, maxResults })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
