# Server-Info-System – Anleitung

Das neue System erstellt eine Server-Info-Nachricht und bearbeitet danach immer dieselbe Nachricht. Alle bestehenden Bot-Funktionen bleiben erhalten.

## 1. Bot neu starten

Nach dem Hochladen auf GitHub/Railway den Bot neu deployen oder neu starten. Der Bot registriert die neuen Slash-Commands beim Start automatisch.

## 2. Server-Info-Nachricht erstellen

In Discord ausführen:

`/serverinfo setup channel:#server-info`

Der Bot sendet das vollständige Server-Info-Embed in den ausgewählten Channel und speichert Channel- und Nachrichten-ID automatisch.

## 3. IP-Adresse später ändern

`/serverinfo edit setting:IP Address value:NEUE_IP`

Beispiel:

`/serverinfo edit setting:IP Address value:208.115.251.67`

Die bestehende Server-Info-Nachricht wird sofort bearbeitet. Es wird keine neue Nachricht erstellt.

## 4. Weitere Serverdaten ändern

Mit `/serverinfo edit` können folgende Werte geändert werden:

- Server Name
- IP Address
- Game Port
- Map
- Slots
- Perspective
- Maximum Group Size
- Group Size Note
- Language
- Raid Times
- Server Region
- Time Zone

## 5. Discord-Channels verlinken

`/serverinfo links`

Danach können einer oder mehrere dieser Channels ausgewählt werden:

- Rules
- Support
- Tickets
- Announcements
- Status

Bereits gespeicherte Links bleiben erhalten, wenn sie im Command nicht neu ausgewählt werden.

## 6. Features ändern

`/serverinfo features list:Safezone Traders | Black Market | KOTH | Keyrooms`

Die einzelnen Features müssen mit `|` getrennt werden.

## 7. Restart-Zeiten ändern

`/serverinfo restarts times:00:00, 04:00, 08:00, 12:00, 16:00, 20:00`

Die Zeiten werden als Schweizer Serverzeiten in `Europe/Zurich` gespeichert. Discord zeigt sie jedem Benutzer automatisch in seiner eigenen lokalen Zeitzone an.

Der Bot aktualisiert die Zeitstempel:

- bei jedem Botstart
- täglich um 00:05 Uhr Schweizer Zeit
- automatisch bei Sommer- und Winterzeit

## 8. Manuell aktualisieren

`/serverinfo refresh`

Damit werden das Embed und die lokalen Restart-Zeitstempel sofort neu geladen.

## Berechtigungen

Die `/serverinfo`-Commands können standardmässig nur Mitglieder mit der Discord-Berechtigung **Server verwalten** verwenden.

## Speicherung auf Railway

Die Konfiguration wird in `data/server-info.json` gespeichert. Für dauerhafte Speicherung über Redeployments hinweg sollte ein Railway Volume verwendet und `DATA_DIR` beispielsweise auf `/data` gesetzt werden.
