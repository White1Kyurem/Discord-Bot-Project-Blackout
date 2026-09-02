# Project Blackout Discord Bot Rewrite

A clean rewrite of the bot with all user-facing text in English.

## Features

- `/rules` to show the current rules
- `/rulespanel` to post an individual custom rules panel
- `/publishrules channel:#rules` to create or update all 15 official rules panels at once
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

## Official rules panels

Run `/publishrules channel:#rules` once and select your rules channel. The bot posts all 15 official Project Blackout rule panels in the correct order.

Running the same command again edits the existing bot messages instead of creating duplicates. Deleted panels are recreated automatically. Message IDs are stored in `official-rules-panels.json` inside `DATA_DIR`, so Railway should use the persistent `/data` volume.

Only members with the **Manage Server** permission can use this command.

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

