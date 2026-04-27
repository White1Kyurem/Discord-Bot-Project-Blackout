require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require('discord.js');

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token) {
    throw new Error('Missing DISCORD_TOKEN in .env');
  }

  if (!clientId) {
    throw new Error('Missing CLIENT_ID in .env');
  }

  if (!guildId) {
    throw new Error('Missing GUILD_ID in .env');
  }

  const commands = [
    new SlashCommandBuilder()
      .setName('rules')
      .setDescription('Show the default server rules.'),

    new SlashCommandBuilder()
      .setName('serverrules')
      .setDescription('Show the default server rules.'),

    new SlashCommandBuilder()
      .setName('setrules')
      .setDescription('Set or update the default server rules.')
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
      )
      .addStringOption(option =>
        option
          .setName('color')
          .setDescription('Embed color hex, example: #5B2A86')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('setserverrules')
      .setDescription('Set or update the default server rules.')
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
      )
      .addStringOption(option =>
        option
          .setName('color')
          .setDescription('Embed color hex, example: #5B2A86')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('rulespanel')
      .setDescription('Open a form to create a custom rules panel.')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel where the rules panel should be sent')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('editrulespanel')
      .setDescription('Edit an existing rules panel message.')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel where the rules panel message is')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('message_id')
          .setDescription('The message ID of the rules panel')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('ticketpanel')
      .setDescription('Send the suggestion panel to a channel.')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel where the suggestion panel should be sent')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('verifypanel')
      .setDescription('Send the verification panel to a channel.')
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

  console.log(`Started refreshing ${commands.length} application (/) commands.`);

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log('Successfully reloaded application (/) commands.');
}

module.exports = { deployCommands };

if (require.main === module) {
  deployCommands().catch(error => {
    console.error('Error while deploying commands:', error);
    process.exit(1);
  });
}
