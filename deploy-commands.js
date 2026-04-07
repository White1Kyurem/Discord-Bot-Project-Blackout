const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show the server rules'),

  new SlashCommandBuilder()
    .setName('serverrules')
    .setDescription('Show the server rules'),

  new SlashCommandBuilder()
    .setName('rulespanel')
    .setDescription('Send the rules panel to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select the channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Set or update the server rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The rules text')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Optional embed title')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('setserverrules')
    .setDescription('Set or update the server rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The rules text')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Optional embed title')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the suggestion panel to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select the channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Open the suggestion form'),
]
  .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log('🔄 Deploying slash commands...');

    if (!process.env.DISCORD_TOKEN) {
      throw new Error('Missing DISCORD_TOKEN in .env / Railway variables');
    }

    if (!process.env.CLIENT_ID) {
      throw new Error('Missing CLIENT_ID in .env / Railway variables');
    }

    if (!process.env.GUILD_ID) {
      throw new Error('Missing GUILD_ID in .env / Railway variables');
    }

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Slash commands deployed successfully!');
  } catch (error) {
    console.error('❌ Deploy error:', error);
  }
}

deployCommands();
