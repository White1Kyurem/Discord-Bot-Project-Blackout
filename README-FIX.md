# Railway / Discord offline fix

This version keeps every existing bot function and adds:

- a `/health` endpoint that returns HTTP 200 only when Discord is actually connected
- clear Discord gateway and login error logging
- a startup timeout
- an automatic process restart when Discord stays offline
- Railway healthcheck and restart configuration

## Required Discord setting

Discord Developer Portal -> Bot -> Privileged Gateway Intents:

- Enable **Server Members Intent**

The bot requests `GuildMembers` because it uses member join/update events for verification and welcome messages.

## Railway

1. Deploy the updated repository.
2. Keep the existing Railway variables.
3. Do not manually create a `PORT` variable.
4. Generate a public domain if you do not already have one.
5. Open `https://YOUR-DOMAIN/health`.

A working response contains:

```json
"discordReady": true
```

If it is false, check `lastError` and the Railway deployment logs.
