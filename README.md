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

The bot includes a persistent server information panel with automatically localized restart times.

### Commands

- `/serverinfo setup channel:#server-info` creates the panel or posts it in a new channel.
- `/serverinfo edit setting:IP Address value:208.115.251.67` changes a saved value and immediately edits the panel.
- `/serverinfo links` updates the Rules, Support, Tickets, Announcements, or Server Status channel links.
- `/serverinfo features list:Feature 1 | Feature 2 | Feature 3` replaces the features list.
- `/serverinfo restarts times:00:00, 04:00, 08:00, 12:00, 16:00, 20:00` changes the restart schedule.
- `/serverinfo refresh` manually refreshes the panel and its Discord timestamps.

The restart schedule uses `Europe/Zurich`. Discord displays every restart timestamp in each member's own local time zone. The bot refreshes the timestamps on startup and every day at 00:05 in the configured server time zone, including daylight-saving changes.

The saved configuration is stored in `data/server-info.json`. For persistent storage on a hosted deployment, point the existing `DATA_DIR` environment variable to a mounted persistent data directory.
