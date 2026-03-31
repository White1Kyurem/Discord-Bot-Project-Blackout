require('dotenv').config();

const { REST, Routes, PermissionFlagsBits } = require('discord.js');

const commands = [
  {
    name: 'ticketpanel',
    description: 'Sendet das Ideen-Ticket-Panel mit Button in den aktuellen Kanal',
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  },
  {
    name: 'idee',
    description: 'Öffnet direkt das Ideen-Formular',
  },
];

async function main() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );

  console.log('Slash-Commands wurden erfolgreich registriert.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
