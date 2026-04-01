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
  {
    name: 'statuspanel',
    description: 'Create or update the server status panel',
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  },
  {
    name: 'refreshstatus',
    description: 'Refresh the server status panel manually',
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  },
];

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
    console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in environment variables.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('Slash commands deployed successfully.');
}

main().catch((error) => {
  console.error('Failed to deploy commands:', error);
  process.exit(1);
});
