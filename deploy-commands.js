require('dotenv').config();

const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

if (!clientId) {
  console.error('Missing CLIENT_ID in .env');
  process.exit(1);
}

if (!guildId) {
  console.error('Missing GUILD_ID in .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show the default server rules.'),

  new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Update the default server rules.')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Title of the rules panel')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Rules text')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('rulespanel')
    .setDescription('Create a rules panel in a selected channel.')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where the rules panel should be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the suggestion panel to a selected channel.')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where the suggestion panel should be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('verifypanel')
    .setDescription('Send the verification panel to a selected channel.')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where the verification panel should be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Open the suggestion form.'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error while deploying commands:', error);
  }
})();
