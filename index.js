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

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  TRELLO_KEY,
  TRELLO_TOKEN,
  TRELLO_BOARD_SHORTLINK,
  TRELLO_TARGET_LIST_NAME = 'Suggestions',
  LOG_CHANNEL_ID,
} = process.env;

const PANEL_BUTTON_ID = 'open_suggestion_modal';

function safe(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback;
  const v = value.trim();
  return v.length ? v : fallback;
}

async function findListId() {
  const res = await axios.get(
    `https://api.trello.com/1/boards/${TRELLO_BOARD_SHORTLINK}/lists`,
    {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
      },
    }
  );

  const list = res.data.find(
    (l) =>
      l.name.toLowerCase() === TRELLO_TARGET_LIST_NAME.toLowerCase()
  );

  if (!list) throw new Error('Trello list not found');

  return list.id;
}

async function createCard(data) {
  const listId = await findListId();

  const desc = [
    `User: ${data.user}`,
    `User ID: ${data.userId}`,
    `Server: ${data.guild}`,
    `Category: ${data.category}`,
    '',
    data.description,
  ].join('\n');

  const res = await axios.post('https://api.trello.com/1/cards', null, {
    params: {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      idList: listId,
      name: data.title,
      desc,
    },
  });

  return res.data;
}

function modal() {
  const m = new ModalBuilder()
    .setCustomId('suggestion_modal')
    .setTitle('Submit a Suggestion');

  const title = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. New mod or loot change');

  const category = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('e.g. Mod, Loot, Event');

  const description = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder('Explain your idea briefly');

  m.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(category),
    new ActionRowBuilder().addComponents(description)
  );

  return m;
}

function panel() {
  const embed = new EmbedBuilder()
    .setTitle('Suggestion System')
    .setDescription(
      'Click the button below to submit a suggestion.\n\nIt will be sent to our Trello board.'
    );

  const button = new ButtonBuilder()
    .setCustomId(PANEL_BUTTON_ID)
    .setLabel('Submit Suggestion')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

client.once(Events.ClientReady, async () => {
  console.log('Bot online');

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    {
      body: [
        {
          name: 'ticketpanel',
          description: 'Send suggestion panel',
          default_member_permissions:
            PermissionFlagsBits.Administrator.toString(),
        },
      ],
    }
  );
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === 'ticketpanel') {
        await i.reply({ content: 'Panel sent', ephemeral: true });
        await i.channel.send(panel());
      }
    }

    if (i.isButton()) {
      if (i.customId === PANEL_BUTTON_ID) {
        await i.showModal(modal());
      }
    }

    if (
      i.type === InteractionType.ModalSubmit &&
      i.customId === 'suggestion_modal'
    ) {
      await i.deferReply({ ephemeral: true });

      const title = safe(i.fields.getTextInputValue('title'), 'No title');
      const category = safe(
        i.fields.getTextInputValue('category'),
        'None'
      );
      const description = safe(
        i.fields.getTextInputValue('description'),
        'No description'
      );

      const card = await createCard({
        title,
        category,
        description,
        user: i.user.tag,
        userId: i.user.id,
        guild: i.guild?.name || 'Unknown',
      });

      // Admin log (optional)
      try {
        if (LOG_CHANNEL_ID) {
          const ch = await i.guild.channels.fetch(LOG_CHANNEL_ID);
          if (ch) {
            await ch.send('New Suggestion');
          }
        }
      } catch {}

      await i.editReply({
        content:
          'Your suggestion has been submitted.\n' +
          `View it here: ${card.shortUrl}`,
      });
    }
  } catch (err) {
    console.error(err);

    await i.editReply({
      content: 'Error occurred. Try again.',
    });
  }
});

client.login(DISCORD_TOKEN);