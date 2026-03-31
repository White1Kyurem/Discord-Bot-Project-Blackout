require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionType,
  PermissionFlagsBits,
} = require('discord.js');
const axios = require('axios');

const REQUIRED_ENV = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'TRELLO_KEY',
  'TRELLO_TOKEN',
  'TRELLO_BOARD_SHORTLINK',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD_SHORTLINK = process.env.TRELLO_BOARD_SHORTLINK;
const TRELLO_TARGET_LIST_NAME = process.env.TRELLO_TARGET_LIST_NAME || 'Suggestions';

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || null;
const PANEL_BUTTON_ID = 'open_suggestion_modal';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function registerGuildCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

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

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands },
  );
}

async function getBoardLists() {
  const response = await axios.get(
    `https://api.trello.com/1/boards/${encodeURIComponent(TRELLO_BOARD_SHORTLINK)}/lists`,
    {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
        fields: 'name,id,closed,pos',
        filter: 'open',
      },
    },
  );

  return response.data;
}

async function findTargetListId() {
  const lists = await getBoardLists();

  const exact = lists.find(
    (list) => list.name.trim().toLowerCase() === TRELLO_TARGET_LIST_NAME.trim().toLowerCase(),
  );

  if (exact) return exact.id;

  const availableLists = lists.map((list) => `"${list.name}"`).join(', ');
  throw new Error(
    `Trello list "${TRELLO_TARGET_LIST_NAME}" was not found. Available lists: ${availableLists}`,
  );
}

async function createTrelloCard({ title, category, description, discordUserTag, discordUserId, guildName }) {
  const targetListId = await findTargetListId();

  const cardDescription = [
    `Submitted by: ${discordUserTag}`,
    `Discord User ID: ${discordUserId}`,
    guildName ? `Discord Server: ${guildName}` : null,
    category ? `Category: ${category}` : null,
    '',
    'Suggestion:',
    description,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await axios.post('https://api.trello.com/1/cards', null, {
    params: {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      idList: targetListId,
      name: title,
      desc: cardDescription,
      pos: 'top',
    },
  });

  return response.data;
}

async function sendLogMessage(guild) {
  if (!LOG_CHANNEL_ID || !guild) return;

  const channel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('New Suggestion')
    .setDescription('A new suggestion has been submitted to the Trello board.');

  await channel.send({ embeds: [embed] });
}

function buildSuggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId('suggestion_modal')
    .setTitle('Submit a Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('suggestion_title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(100)
    .setPlaceholder('e.g. Add new mod / Adjust hacked crate loot / New event idea');

  const categoryInput = new TextInputBuilder()
    .setCustomId('suggestion_category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(50)
    .setPlaceholder('e.g. Mod, Loot, Event, Balance, QoL');

  const descriptionInput = new TextInputBuilder()
    .setCustomId('suggestion_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1500)
    .setPlaceholder('Explain your idea in detail, including what should be changed or added and why it would improve the server.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(descriptionInput),
  );

  return modal;
}

function buildPanelMessage() {
  const embed = new EmbedBuilder()
    .setTitle('Suggestion System')
    .setDescription(
      'Click the button below to submit a suggestion for the server.\n\n' +
      'A form will open directly in Discord. Once submitted, your suggestion will automatically be sent to our Trello board.'
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_ID)
      .setLabel('Submit Suggestion')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  return { embeds: [embed], components: [row] };
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot online as ${readyClient.user.tag}`);

  try {
    await registerGuildCommands();
    console.log('Slash commands registered or updated.');
  } catch (error) {
    console.error('Error while registering commands:', error.message);
  }

  try {
    const listId = await findTargetListId();
    console.log(`Trello target list found: ${TRELLO_TARGET_LIST_NAME} (${listId})`);
  } catch (error) {
    console.error('Error while checking Trello list:', error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticketpanel') {
        const panel = buildPanelMessage();

        await interaction.reply({
          content: 'Suggestion panel sent.',
          ephemeral: true,
        });

        await interaction.channel.send(panel);
        return;
      }

      if (interaction.commandName === 'suggestion') {
        await interaction.showModal(buildSuggestionModal());
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === PANEL_BUTTON_ID) {
      await interaction.showModal(buildSuggestionModal());
      return;
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'suggestion_modal') {
      await interaction.deferReply({ ephemeral: true });

      const title = interaction.fields.getTextInputValue('suggestion_title').trim();
      const category = interaction.fields.getTextInputValue('suggestion_category').trim();
      const description = interaction.fields.getTextInputValue('suggestion_description').trim();

      const card = await createTrelloCard({
        title,
        category,
        description,
        discordUserTag: interaction.user.tag,
        discordUserId: interaction.user.id,
        guildName: interaction.guild?.name || 'Unknown',
      });

      await sendLogMessage(interaction.guild);

      await interaction.editReply({
        content:
          'Your suggestion has been successfully submitted.\n' +
          `Trello card: ${card.shortUrl}`,
      });
    }
  } catch (error) {
    console.error('Interaction error:', error);

    const message = `An error occurred while processing your request:\n\`${error.message}\``;

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
