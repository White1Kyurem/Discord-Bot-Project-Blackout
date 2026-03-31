# Discord Suggestion Bot

A Discord bot with a button-based suggestion panel and Trello integration.

## Features

- English-only UI
- `/ticketpanel` command to send a suggestion panel
- `Submit Suggestion` button
- Discord modal form
- automatic Trello card creation
- admin log message in a private channel
- no Trello link shown to players

## Commands

- `/ticketpanel` -> sends the suggestion panel in the current channel
- `/suggestion` -> opens the suggestion form directly

## Required environment variables

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id

TRELLO_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_SHORTLINK=VmxUfjSm
TRELLO_TARGET_LIST_NAME=Suggestions

LOG_CHANNEL_ID=your_admin_log_channel_id
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and fill in your real values.

### 3. Deploy slash commands

```bash
npm run deploy
```

### 4. Start the bot

```bash
npm start
```

## Railway

Use this start command:

```bash
node index.js
```

After changing the code:
- commit to GitHub
- redeploy on Railway
- delete the old Discord panel message
- run `/ticketpanel` again

## Notes

- Trello target list default: `Suggestions`
- Admin log message: `New Suggestion`
- Players only see: `Your suggestion has been submitted successfully.`

## Needed permissions for the bot

- View Channels
- Send Messages
- Use Application Commands
- Embed Links

## Troubleshooting

### Trello card is created but Discord shows an error
This is usually caused by the log channel permissions.
Make sure the bot can:
- view the log channel
- send messages there
- embed links there

### The old panel is still in another language
Delete the old panel message and send a new one with `/ticketpanel`.

### Railway crashes on startup
Usually this means one or more environment variables are missing.
