require('dotenv').config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
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
      .setName('sendrulespanels')
      .setDescription('Send all saved rules panels to their assigned channels.'),

    new SlashCommandBuilder()
      .setName('saverulespanel')
      .setDescription('Save an existing rules panel permanently.')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel where the rules panel is located')
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
      .setName('setrules')
      .setDescription('Set or update the default server rules.')
      .addStringOption(option =>
        option.setName('title').setDescription('Title of the rules panel').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('text').setDescription('Rules text').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('color').setDescription('Embed color hex, example: #5B2A86').setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('setserverrules')
      .setDescription('Set or update the default server rules.')
      .addStringOption(option =>
        option.setName('title').setDescription('Title of the rules panel').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('text').setDescription('Rules text').setRequired(true)
      )
      .addStringOption(option =>
        option.setName('color').setDescription('Embed color hex, example: #5B2A86').setRequired(false)
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
        option.setName('message_id').setDescription('The message ID of the rules panel').setRequired(true)
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

    new SlashCommandBuilder()
      .setName('embedpanel')
      .setDescription('Create a custom embed message with a form.')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel where the embed should be sent')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('Create and manage the server information panel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(subcommand =>
        subcommand
          .setName('setup')
          .setDescription('Create the server info panel or move it to another channel.')
          .addChannelOption(option =>
            option
              .setName('channel')
              .setDescription('Channel where the server info panel should be posted')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement
              )
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('edit')
          .setDescription('Edit a saved server information value.')
          .addStringOption(option =>
            option
              .setName('setting')
              .setDescription('Server information value to edit')
              .setRequired(true)
              .addChoices(
                { name: 'Server Name', value: 'server_name' },
                { name: 'IP Address', value: 'ip_address' },
                { name: 'Game Port', value: 'game_port' },
                { name: 'Map', value: 'map' },
                { name: 'Slots', value: 'slots' },
                { name: 'Perspective', value: 'perspective' },
                { name: 'Maximum Group Size', value: 'max_group_size' },
                { name: 'Group Size Note', value: 'group_size_note' },
                { name: 'Language', value: 'language' },
                { name: 'Platform', value: 'platform' },
                { name: 'Raid Times', value: 'raid_times' },
                { name: 'Server Region', value: 'server_region' },
                { name: 'Time Zone', value: 'time_zone' }
              )
          )
          .addStringOption(option =>
            option
              .setName('value')
              .setDescription('New value')
              .setMaxLength(1000)
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('links')
          .setDescription('Update one or more channel links in the server info panel.')
          .addChannelOption(option =>
            option
              .setName('rules')
              .setDescription('Rules channel')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
              )
              .setRequired(false)
          )
          .addChannelOption(option =>
            option
              .setName('support')
              .setDescription('Support channel')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
              )
              .setRequired(false)
          )
          .addChannelOption(option =>
            option
              .setName('tickets')
              .setDescription('Tickets channel')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
              )
              .setRequired(false)
          )
          .addChannelOption(option =>
            option
              .setName('announcements')
              .setDescription('Announcements channel')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
              )
              .setRequired(false)
          )
          .addChannelOption(option =>
            option
              .setName('status')
              .setDescription('Server status channel')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum
              )
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('features')
          .setDescription('Replace the server feature list.')
          .addStringOption(option =>
            option
              .setName('list')
              .setDescription('Separate features with | characters')
              .setMaxLength(1000)
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('restarts')
          .setDescription('Change the daily server restart times.')
          .addStringOption(option =>
            option
              .setName('times')
              .setDescription('Example: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00')
              .setMaxLength(200)
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('refresh')
          .setDescription('Refresh the server info panel and local restart times.')
      ),

    new SlashCommandBuilder()
      .setName('donation')
      .setDescription('Manage the donation progress post.')
      .addSubcommand(subcommand =>
        subcommand
          .setName('setup')
          .setDescription('Create or update the donation progress forum post.')
          .addChannelOption(option =>
            option
              .setName('channel')
              .setDescription('Donation forum channel')
              .addChannelTypes(ChannelType.GuildForum)
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add a donation amount.')
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Donation amount')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('donor')
              .setDescription('Donor name')
              .setRequired(false)
          )
          .addStringOption(option =>
            option
              .setName('note')
              .setDescription('Donation note')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('set')
          .setDescription('Set the current donation amount.')
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('New current amount')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('goal')
          .setDescription('Set the donation goal.')
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('New goal amount')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('reset')
          .setDescription('Reset the donation progress.')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('status')
          .setDescription('Show the current donation status.')
      ),
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
