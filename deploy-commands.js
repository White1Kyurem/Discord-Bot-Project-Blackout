const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show the current server rules.'),

  new SlashCommandBuilder()
    .setName('rulespanel')
    .setDescription('Send the rules embed to a selected channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The text channel where the rules should be sent.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Update the saved server rules.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The full rules text.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Optional embed title.')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the suggestion panel to a selected channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The text channel where the suggestion panel should be sent.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Open the suggestion form.'),

  new SlashCommandBuilder()
    .setName('statuspanel')
    .setDescription('Create or update the live server status panel in a selected channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The text channel where the status panel should be sent.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('refreshstatus')
    .setDescription('Refresh the live server status panel now.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map(command => command.toJSON());

async function main() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('Slash commands deployed successfully.');
}

main().catch((error) => {
  console.error('Failed to deploy slash commands:', error);
  process.exit(1);
});
