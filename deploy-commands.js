require('dotenv').config();

const { REST, Routes, PermissionFlagsBits } = require('discord.js');

const commands = [
  {
    name: 'ticketpanel',
    description: 'Send the suggestion panel in the current channel',
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  },
  {
    name: 'suggestion',
    description: 'Open the suggestion form directly',
  },
];

async function main() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('Commands deployed.');
}

main();
