# Server-Info-System

Diese Erweiterung ergänzt den bestehenden Bot. Die bisherigen Regeln-, Verify-, Welcome-, Trello-, Suggestions-, Embed- und Donation-Funktionen bleiben bestehen.

## Erste Einrichtung

1. Trage in Railway oder in deiner lokalen `.env` mindestens diese Werte ein:

```env
SERVER_INFO_CHANNEL_ID=CHANNEL_ID
DAYZ_SERVER_IP=208.115.251.67
DAYZ_SERVER_PORT=2491
```

2. Starte den Bot neu. Wenn `SERVER_INFO_CHANNEL_ID` gesetzt ist, erstellt der Bot die Nachricht automatisch.

Alternativ kannst du sie manuell erstellen:

```text
/serverinfo setup channel:#server-info
```

## Serverdaten bearbeiten

Beispiel für eine neue IP:

```text
/serverinfo edit setting:IP Address value:NEUE_IP
```

Weitere bearbeitbare Werte sind Servername, Port, Map, Slots, Perspektive, Gruppengrösse, Beschreibung der Gruppengrösse, Sprache, Plattform, Raid-Zeiten, Region und Zeitzone.

## Channel-Verlinkungen ändern

```text
/serverinfo links rules:#rules support:#support tickets:#tickets announcements:#announcements status:#server-status
```

Es müssen nicht alle Optionen gleichzeitig angegeben werden.

## Features ändern

```text
/serverinfo features list:Safezone Traders | Black Market | KOTH | Keyrooms
```

## Restart-Zeiten ändern

```text
/serverinfo restarts times:00:00,04:00,08:00,12:00,16:00,20:00
```

Die Zeiten werden als Discord-Timestamps angezeigt. Dadurch sieht jedes Mitglied automatisch seine lokale Uhrzeit. Der Bot aktualisiert die Timestamps beim Start und täglich um 00:05 Uhr in der eingestellten Server-Zeitzone.

## Speicherung auf Railway

Nutze ein Railway Volume und setze:

```env
DATA_DIR=/data
```

Ohne persistenten Speicher können gespeicherte Änderungen bei einem vollständigen Redeploy verloren gehen.
