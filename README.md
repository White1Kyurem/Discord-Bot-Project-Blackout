# Project Blackout Discord Bot Rewrite

A clean rewrite of the bot with all user-facing text in English.

## Features

- `/rules` to show the current rules
- `/rulespanel` to post the rules in a selected channel
- `/setrules` to update the saved rules text
- `/ticketpanel` to post a suggestion panel in a selected channel
- `/suggestion` to open the suggestion form directly
- Trello integration for suggestions if configured
- Welcome message when a member receives the verified role
- `/statuspanel` and `/refreshstatus` for an optional live CFTools status panel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your `.env`

Copy `.env.example` to `.env` and fill in your values.

### 3. Deploy slash commands

```bash
npm run deploy
```

### 4. Start the bot

```bash
npm start
```

## Discord Developer Portal

Enable **Server Members Intent** if you want the welcome system to work.

## Required Bot Permissions

- View Channels
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History

For channels where the bot should post panels, make sure it also has permission in that specific channel.

## Notes

- The suggestion system still works without Trello, but it will only send the success message and optional log entry.
- The status panel needs valid CFTools credentials. If they are missing, the panel shows a not-configured state instead of crashing.

## Server information panel

The existing bot functions remain unchanged. The additional `/serverinfo` command manages a persistent DayZ server-information embed.

- `/serverinfo setup channel:#server-info` creates or updates the panel.
- `/serverinfo edit setting:IP Address value:208.115.251.67` changes a saved value.
- `/serverinfo links` updates the linked Discord channels.
- `/serverinfo features` replaces the feature list.
- `/serverinfo restarts` changes the daily restart times.
- `/serverinfo refresh` refreshes the panel manually.

Restart times use `Europe/Zurich` by default and are rendered as Discord timestamps, so each member sees them in their own local time zone. The bot refreshes the timestamps on startup and daily at 00:05 in the configured server time zone.

The configuration is stored in `data/server-info.json`, or inside the directory configured through `DATA_DIR`.

