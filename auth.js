/**
 * Gmail + Drive OAuth Authentication
 * Supports multiple accounts via aliases
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

function getTokenPath(account) {
  if (!account || account === 'default') {
    return path.join(__dirname, 'token.json');
  }
  return path.join(__dirname, `token-${account}.json`);
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

const PORT = 8849;

async function authorize(account) {
  const tokenPath = getTokenPath(account);

  try {
    const token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
    const { client_id, client_secret } = credentials.installed;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials(token);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    console.log(`Using existing authorization for: ${profile.data.emailAddress}`);
    return oauth2Client;
  } catch (err) {
    return getNewToken(account);
  }
}

async function getNewToken(account) {
  const tokenPath = getTokenPath(account);
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${PORT}/oauth2callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n=== Gmail + Drive Authorization ===');
  if (account) console.log(`Account alias: ${account}`);
  console.log('Scopes:');
  console.log('  - gmail.readonly (read-only access to emails)');
  console.log('  - drive.file (only files created by this app)');
  console.log('\nOpening browser for authorization...\n');

  const open = (await import('open')).default;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/oauth2callback')) {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const code = url.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization successful!</h1><p>You can close this window.</p>');

          try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
            console.log('Token saved to', tokenPath);

            server.close();
            resolve(oauth2Client);
          } catch (err) {
            server.close();
            reject(err);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1>');
          server.close();
          reject(new Error('No code received'));
        }
      }
    });

    server.listen(PORT, async () => {
      console.log(`Listening on http://localhost:${PORT}`);
      await open(authUrl);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is in use. Try killing the process or change PORT.`);
      }
      reject(err);
    });
  });
}

async function listAccounts() {
  const files = await fs.readdir(__dirname);
  const tokenFiles = files.filter(f => f.startsWith('token') && f.endsWith('.json'));

  console.log('\n=== Authorized Accounts ===\n');

  for (const file of tokenFiles) {
    const alias = file === 'token.json' ? 'default' : file.replace('token-', '').replace('.json', '');
    try {
      const token = JSON.parse(await fs.readFile(path.join(__dirname, file), 'utf8'));
      const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
      const { client_id, client_secret } = credentials.installed;

      const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
      oauth2Client.setCredentials(token);

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      console.log(`  ${alias}: ${profile.data.emailAddress}`);
    } catch (err) {
      console.log(`  ${alias}: (token expired or invalid)`);
    }
  }
  console.log('');
}

module.exports = { authorize, SCOPES, listAccounts, getTokenPath };

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'list') {
    listAccounts().then(() => process.exit(0)).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  } else {
    const account = args[0];
    authorize(account).then(auth => {
      console.log('\nAuthorization complete!');
      process.exit(0);
    }).catch(err => {
      console.error('Authorization failed:', err.message);
      process.exit(1);
    });
  }
}
