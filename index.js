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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
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
  WELCOME_CHANNEL_ID,
  VERIFIED_ROLE_ID,
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
    .setMaxLength(100);

  const category = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const description = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500);

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
    .setDescription('Click the button below to submit a suggestion.');

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
        {
          name: 'suggestion',
          description: 'Open the suggestion form directly',
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

      if (i.commandName === 'suggestion') {
        await i.showModal(modal());
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
      const category = safe(i.fields.getTextInputValue('category'), 'None');
      const description = safe(i.fields.getTextInputValue('description'), 'No description');

      const card = await createCard({
        title,
        category,
        description,
        user: i.user.tag,
        userId: i.user.id,
        guild: i.guild?.name || 'Unknown',
      });

      if (LOG_CHANNEL_ID) {
        const ch = await i.guild.channels.fetch(LOG_CHANNEL_ID);
        if (ch && ch.isTextBased()) {
          await ch.send(`New suggestion by ${i.user.tag}`);
        }
      }

      await i.editReply({
        content: 'Your suggestion has been submitted successfully.',
      });
    }
  } catch (err) {
    console.error(err);

    if (i.deferred || i.replied) {
      await i.editReply({ content: 'Error occurred. Try again.' });
    } else {
      await i.reply({ content: 'Error occurred. Try again.', ephemeral: true });
    }
  }
});

// Welcome system
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    if (!VERIFIED_ROLE_ID || !WELCOME_CHANNEL_ID) return;

    const hadRole = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
    const hasRoleNow = newMember.roles.cache.has(VERIFIED_ROLE_ID);

    if (!hadRole && hasRoleNow) {
      const channel = await newMember.guild.channels.fetch(WELCOME_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0x0f0f0f)
        .setTitle('🛡️ Welcome to Project Blackout PVP')
        .setDescription(
          `Welcome ${newMember} to **Project Blackout PVP**!\n\n` +
          `⚔️ Prepare for intense battles\n` +
          `🧟 Survive the darkness\n` +
          `🔥 Build your legacy\n\n` +
          `We’re glad to have you here. Stay sharp.`
        )
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setImage('https://raw.githubusercontent.com/White1Kyurem/Discord-Bot-Project-Blackout/main/ChatGPT%20Image%2031.%20M%C3%A4rz%202026%2C%2019_16_34.png')
        .setFooter({ text: 'Project Blackout PVP' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Welcome error:', err);
  }
});

client.login(DISCORD_TOKEN);
