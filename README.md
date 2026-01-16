# Gmail Integration for Claude Code

Gmail API integration allowing email search and attachment download via direct API calls.

## Setup

### 1. Google Cloud Console

1. Create project: https://console.cloud.google.com/projectcreate
2. Enable Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
3. Configure OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
   - Select External, add yourself as test user
   - Add scopes: `gmail.readonly`, `drive.file`
4. Create OAuth credentials: https://console.cloud.google.com/apis/credentials
   - OAuth client ID → Desktop app
   - Download JSON as `credentials.json` in this folder

### 2. Install Dependencies

```bash
npm install
```

### 3. Authorize

```bash
node auth.js
```

For additional accounts:
```bash
node auth.js work
```

List accounts:
```bash
node auth.js list
```

## Usage

```bash
node gmail-search.js "search query" [account] [max-results]
```

### Examples

```bash
node gmail-search.js "from:bank@example.com"
node gmail-search.js "has:attachment" work 100
node gmail-search.js "subject:invoice after:2024/01/01"
```

### Search Operators

- `from:` / `to:` - Sender/recipient
- `subject:` - Subject line
- `has:attachment` - Has attachments
- `filename:pdf` - Specific file types
- `after:YYYY/MM/DD` / `before:YYYY/MM/DD` - Date ranges
- `is:unread` / `is:starred` - Status filters

## Output

Exports to `exports/[query]/`:
- `emails.json` - All email metadata
- `summary.json` - Stats and sender list
- `attachments/` - Downloaded files

## Security

- **Minimal scopes**: Only `gmail.readonly` and `drive.file`
- **No send/delete**: Cannot send emails or delete anything
- **Revoke access**: https://myaccount.google.com/permissions
