# Gmail Integration - Handoff Document

## What Was Done

Gmail API integration scripts for Claude Code were created and pushed to GitHub.

**Repository:** https://github.com/johnverhoff78-coder/Gmail-Integration

## File Locations

### GitHub Repo (C:\Apps\Gmail)
```
C:\Apps\Gmail\
├── .gitignore         # Excludes sensitive files
├── README.md          # Full documentation
├── auth.js            # OAuth authentication
├── gmail-search.js    # Search & export script
└── package.json       # Dependencies (not installed here)
```

### Claude Code Integration (C:\Users\John Verhoff\.claude\)
```
C:\Users\John Verhoff\.claude\gmail\
├── auth.js
├── gmail-search.js
├── package.json
├── node_modules/      # Dependencies installed
└── exports/           # Search results go here

C:\Users\John Verhoff\.claude\commands\
└── email-search.md    # Slash command for Claude Code
```

## Remaining Setup Steps

### 1. Google Cloud Console (Manual)

1. **Create project:** https://console.cloud.google.com/projectcreate
2. **Enable Gmail API:** https://console.cloud.google.com/apis/library/gmail.googleapis.com
3. **OAuth consent screen:** https://console.cloud.google.com/apis/credentials/consent
   - External → Create
   - Add scopes: `gmail.readonly`, `drive.file`
   - Add your email as test user
4. **Create credentials:** https://console.cloud.google.com/apis/credentials
   - OAuth client ID → Desktop app
   - Download JSON

### 2. Save Credentials

Save the downloaded JSON as:
```
C:\Users\John Verhoff\.claude\gmail\credentials.json
```

### 3. Authorize Account

```bash
cd "C:\Users\John Verhoff\.claude\gmail"
node auth.js
```

Browser opens → authorize → token saved.

For additional accounts:
```bash
node auth.js work
```

## Usage

### Direct CLI
```bash
node "C:\Users\John Verhoff\.claude\gmail\gmail-search.js" "from:example@gmail.com"
node "C:\Users\John Verhoff\.claude\gmail\gmail-search.js" "has:attachment" default 100
```

### In Claude Code
Use `/email-search` slash command or ask naturally:
- "Search my emails for invoices from 2024"
- "Find all emails with PDF attachments"

### Search Operators
- `from:` / `to:` - Sender/recipient
- `subject:` - Subject line
- `has:attachment` - Has attachments
- `filename:pdf` - File types
- `after:YYYY/MM/DD` / `before:YYYY/MM/DD` - Date ranges

## Output

Results export to `C:\Users\John Verhoff\.claude\gmail\exports\[query]\`:
- `emails.json` - Email metadata
- `summary.json` - Stats
- `attachments/` - Downloaded files

## Quick Commands

```bash
# Install deps in repo folder (if needed)
cd "C:\Apps\Gmail" && npm install

# List authorized accounts
node "C:\Users\John Verhoff\.claude\gmail\auth.js" list

# Re-authorize if token expires
node "C:\Users\John Verhoff\.claude\gmail\auth.js"
```
