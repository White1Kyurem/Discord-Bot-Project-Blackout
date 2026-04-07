const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Alle Slash Commands
const commands = [
{
name: 'rules',
description: 'Zeigt die Serverregeln an',
},
{
name: 'serverrules',
description: 'Zeigt die Serverregeln an',
},
{
name: 'rulespanel',
description: 'Sendet das Regeln Panel',
},
{
name: 'setrules',
description: 'Setzt die Serverregeln',
options: [
{
name: 'text',
description: 'Die neuen Regeln',
type: 3, // STRING
required: true,
},
],
},
{
name: 'setserverrules',
description: 'Setzt die Serverregeln',
options: [
{
name: 'text',
description: 'Die neuen Regeln',
type: 3,
required: true,
},
],
},
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Commands deployen
(async () => {
try {
console.log('🔄 Lade Slash Commands neu...');

```
await rest.put(
  Routes.applicationGuildCommands(
    process.env.CLIENT_ID,
    process.env.GUILD_ID
  ),
  { body: commands }
);

console.log('✅ Slash Commands erfolgreich registriert!');
```

} catch (error) {
console.error('❌ Fehler beim Deployen:', error);
}
})();
