# Project Blackout PVP Discord Bot

This bot includes:

- English-only suggestion system with Trello integration
- Welcome message after the verification role is added
- Auto-updating server status panel using the CFTools Data API
- Restart countdown based on your restart schedule

## Commands

- `/ticketpanel` - send the suggestion panel
- `/suggestion` - open the suggestion form directly
- `/statuspanel` - create or update the server status panel
- `/refreshstatus` - refresh the status panel manually

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and fill in your real secrets.

### 3. Deploy slash commands

```bash
npm run deploy
```

### 4. Start the bot

```bash
npm start
```

## Discord Developer Portal

Enable **Server Members Intent** for the welcome feature.

## Required permissions

Make sure the bot can:

- View Channels
- Send Messages
- Use Application Commands
- Embed Links
- Read Message History

Also check channel-specific permissions for the log channel, welcome channel, and status channel.

## Status panel

Run `/statuspanel` once to create the status message.

After that, the bot will refresh the same message every 60 seconds.

## CFTools note

This bot uses the official CFTools Data API pattern shown on the developer page:

`GET https://data.cftools.cloud/v1/server/{server_id}`

If your CFTools response shape differs, the parser may need small adjustments.
