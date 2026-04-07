require('dotenv').config();

const { REST, Routes, PermissionFlagsBits } = require('discord.js');

const manageGuildPerms = PermissionFlagsBits.ManageGuild.toString();

const commands = [
  {
    name: 'ticketpanel',
    description: 'Send the suggestion panel in the current channel',
    default_member_permissions: manageGuildPerms,
  },
  {
    name: 'suggestion',
    description: 'Open the suggestion form directly',
  },
  {
    name: 'rulespanel',
    description: 'Send the server rules panel',
    default_member_permissions: manageGuildPerms,
  },
  {
    name: 'serverrules',
    description: 'Send the server rules panel',
    default_member_permissions: manageGuildPerms,
  },
  {
    name: 'setrules',
    description: 'Update the server rules text',
    default_member_permissions: manageGuildPerms,
    options: [
      {
        name: 'text',
        description: 'The full rules text',
        type: 3,
        required: true,
      },
      {
        name: 'title',
        description: 'Optional embed title',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'setserverrules',
    description: 'Update the server rules text',
    default_member_permissions: manageGuildPerms,
    options: [
      {
        name: 'text',
        description: 'The full rules text',
        type: 3,
        required: true,
      },
      {
        name: 'title',
        description: 'Optional embed title',
        type: 3,
        required: false,
      },
    ],
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
