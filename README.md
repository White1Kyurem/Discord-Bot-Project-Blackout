# Project Blackout PVP Discord Bot

This bot includes:

- Suggestion system with Trello integration
- Welcome message after the verification role is added
- Server rules panel and editable rules text

## Commands

- `/ticketpanel` - send the suggestion panel
- `/suggestion` - open the suggestion form directly
- `/rulespanel` - send the rules panel
- `/serverrules` - alias for the rules panel
- `/setrules` - update the rules text
- `/setserverrules` - alias for updating the rules text

## Setup

```bash
npm install
npm run deploy
npm start
```

Create a `.env` file from `.env.example` and fill in at least:

```env
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
```

## Important

- After every slash command change, run `npm run deploy` again.
- The rules commands require `Manage Server` by default.
- Make sure the bot invite includes both `bot` and `applications.commands`.
- If commands still do not show, kick the bot, re-invite it with `applications.commands`, then deploy again.
