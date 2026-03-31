# Discord Ticket-Style Idean-Bot mit Trello

Dieser Bot funktioniert so wie ein einfaches Ticket-System mit Button:

1. Ein Admin sendet mit `/ticketpanel` ein Panel in einen Kanal
2. Spieler klicken auf **Idea einreichen**
3. Direkt in Discord öffnet sich ein zweites Fenster als Formular
4. Nach dem Absenden wird automatisch eine Trello-Karte in der Liste `Suggestions` erstellt

## Funktionen

- Ticket-Panel mit Button
- Discord-Modal-Fenster
- automatische Trello-Karte
- Discord-Name + User-ID werden in die Karte geschrieben
- Zielliste wird automatisch per Listenname `Suggestions` gefunden

## Befehle

### `/ticketpanel`
Sendet das Button-Panel in den aktuellen Kanal.  
Nur für Admins gedacht.

### `/idee`
Öffnet das Formular direkt, ohne Panel.

## Installation

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. `.env` anlegen

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Linux/macOS:
```bash
cp .env.example .env
```

Dann die echten Werte eintragen.

### 3. Commands registrieren

```bash
npm run deploy
```

### 4. Bot starten

```bash
npm start
```

## Nutzung

### Ticket-Panel senden
Gib in deinem gewünschten Kanal ein:

```text
/ticketpanel
```

Danach erscheint dort eine Nachricht mit einem Button.

### Spieler benutzen das System
- Spieler klicken auf **Idea einreichen**
- Discord öffnet direkt ein Formular
- Der Spieler trägt alles ein
- Der Bot erstellt die Trello-Karte

## Benötigte Rechte für den Bot

Beim Einladen solltest du mindestens diese Rechte geben:

- View Channels
- Send Messages
- Use Application Commands

## Wo du die Werte findest

### Discord
- `DISCORD_TOKEN`: Discord Developer Portal → Bot
- `CLIENT_ID`: Discord Developer Portal → General Information → Application ID
- `GUILD_ID`: Discord Entwicklermodus aktivieren → Rechtsklick auf Server → ID kopieren

### Trello
- `TRELLO_KEY`: Trello API-Key
- `TRELLO_TOKEN`: Trello Token
- `TRELLO_BOARD_SHORTLINK`: aus deinem Link `VmxUfjSm`

## Häufige Fehler

### Das Panel wird nicht gesendet
Prüfe, ob der Bot im Kanal schreiben darf.

### Der Button reagiert nicht
Prüfe, ob der Bot online ist und Discord-Komponenten empfangen kann.

### Die Liste wird nicht gefunden
Prüfe, ob die Liste auf Trello exactly `Suggestions`.

### Trello 401
Prüfe `TRELLO_KEY` und `TRELLO_TOKEN`.

### Slash-Commands fehlen
Führe `npm run deploy` erneut aus.


## Admin-/Moderator-Logkanal

Du kannst zusätzlich einen Kanal festlegen, in den der Bot jedes Mal eine Meldung sendet,
wenn eine neue Idea erfolgreich an Trello übertragen wurde.

Trage dafür in deiner `.env` ein:

```env
LOG_CHANNEL_ID=deine_admin_oder_mod_log_kanal_id
```

Dann postet der Bot in diesem Kanal nur eine einfache Meldung:

- `Neue Idea`
- `Es wurde eine neue Idea im Trello-Board erstellt.`

Wichtig:
- Der Kanal sollte nur für Admins und Moderatoren sichtbar sein
- Der Bot braucht in diesem Kanal Schreibrechte
- Die Kanal-ID bekommst du über den Discord-Entwicklermodus per Rechtsklick auf den Kanal → **ID kopieren**
