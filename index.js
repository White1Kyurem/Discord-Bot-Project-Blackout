require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionType,
  PermissionsBitField,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const {
  DISCORD_TOKEN,
  TRELLO_KEY,
  TRELLO_TOKEN,
  TRELLO_BOARD_SHORTLINK,
  TRELLO_TARGET_LIST_NAME = 'Suggestions',
  LOG_CHANNEL_ID,
  WELCOME_CHANNEL_ID,
  VERIFIED_ROLE_ID,
  STATUS_CHANNEL_ID,
  CFTOOLS_API_TOKEN,
  CFTOOLS_APPLICATION_ID,
  CFTOOLS_SERVER_ID,
  RESTART_TIMES = '00:00,04:00,08:00,12:00,16:00,20:00',
  TIMEZONE = 'Europe/Zurich',
  STATUS_PANEL_TITLE = 'Project Blackout PVP',
  WELCOME_IMAGE_URL = 'https://raw.githubusercontent.com/White1Kyurem/Discord-Bot-Project-Blackout/main/ChatGPT%20Image%2031.%20M%C3%A4rz%202026%2C%2019_16_34.png',
  SERVER_ADDRESS = '51.89.27.103:3437',
  TRELLO_BOARD_URL = 'https://trello.com/b/VmxUfjSm',
} = process.env;

const DATA_DIR = path.join(__dirname, 'data');
const STATUS_STATE_FILE = path.join(DATA_DIR, 'status-panel.json');

const PANEL_BUTTON_ID = 'open_suggestion_modal';
const SUGGESTION_MODAL_ID = 'suggestion_modal';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureStatusStateFile() {
  ensureDataDir();
  if (!fs.existsSync(STATUS_STATE_FILE)) {
    fs.writeFileSync(STATUS_STATE_FILE, '{}', 'utf8');
  }
}

function safe(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to write ${filePath}:`, error);
  }
}

function getStatusPanelState() {
  return readJsonFile(STATUS_STATE_FILE, {});
}

function setStatusPanelState(state) {
  writeJsonFile(STATUS_STATE_FILE, state);
}

function buildSuggestionPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x111111)
    .setTitle('📝 Project Blackout Suggestions')
    .setDescription(
      'Have an idea for the server?\n\n' +
      'Use the button below to submit a suggestion for new features, balancing, events, fixes, or improvements.'
    )
    .addFields(
      {
        name: 'What you can suggest',
        value: '• New features\n• PvP changes\n• Loot changes\n• Events\n• Bug fixes',
        inline: false,
      },
      {
        name: 'How it works',
        value:
          'Click the button below, fill out the form, and your suggestion will be sent directly to our Trello board.',
        inline: false,
      }
    )
    .setFooter({ text: 'Project Blackout PVP • Community Suggestions' });

  const button = new ButtonBuilder()
    .setCustomId(PANEL_BUTTON_ID)
    .setLabel('Submit Suggestion')
    .setStyle(ButtonStyle.Success);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

function buildSuggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId(SUGGESTION_MODAL_ID)
    .setTitle('Submit a Suggestion');

  const title = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. New event area');

  const category = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder('e.g. PvP, Loot, Map');

  const description = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder('Explain your suggestion clearly');

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(category),
    new ActionRowBuilder().addComponents(description)
  );

  return modal;
}

async function findTrelloListId() {
  const response = await axios.get(
    `https://api.trello.com/1/boards/${TRELLO_BOARD_SHORTLINK}/lists`,
    {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
      },
      timeout: 15000,
    }
  );

  const list = response.data.find(
    (item) => item.name.toLowerCase() === TRELLO_TARGET_LIST_NAME.toLowerCase()
  );

  if (!list) {
    throw new Error(`Trello list "${TRELLO_TARGET_LIST_NAME}" was not found.`);
  }

  return list.id;
}

async function createSuggestionCard(data) {
  const listId = await findTrelloListId();

  const desc = [
    `User: ${data.user}`,
    `User ID: ${data.userId}`,
    `Server: ${data.guild}`,
    `Category: ${data.category}`,
    '',
    data.description,
  ].join('\n');

  const response = await axios.post('https://api.trello.com/1/cards', null, {
    params: {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      idList: listId,
      name: data.title,
      desc,
    },
    timeout: 15000,
  });

  return response.data;
}

async function sendSuggestionLog(interaction, title, category, description, cardUrl) {
  if (!LOG_CHANNEL_ID || !interaction.guild) return;

  const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle('New Suggestion')
    .addFields(
      { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
      { name: 'Category', value: category, inline: true },
      { name: 'Title', value: title, inline: true },
      { name: 'Description', value: description.slice(0, 1024), inline: false },
      { name: 'Trello Card', value: cardUrl || 'Created', inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

function parseRestartTimes() {
  return RESTART_TIMES.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(entry);
      if (!match) return null;

      const hours = Number(match[1]);
      const minutes = Number(match[2]);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      return { hours, minutes };
    })
    .filter(Boolean)
    .sort((a, b) => (a.hours * 60 + a.minutes) - (b.hours * 60 + b.minutes));
}

function getLocalDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const out = {};

  for (const part of parts) {
    if (part.type !== 'literal') out[part.type] = part.value;
  }

  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
  };
}

function getNextRestartText() {
  const schedule = parseRestartTimes();
  if (!schedule.length) return 'Not configured';

  const now = new Date();
  const local = getLocalDateParts(now, TIMEZONE);
  const currentMinutes = local.hour * 60 + local.minute;

  let targetMinutes = null;

  for (const time of schedule) {
    const total = time.hours * 60 + time.minutes;
    if (total > currentMinutes) {
      targetMinutes = total;
      break;
    }
  }

  let diffMinutes;
  if (targetMinutes === null) {
    diffMinutes = (24 * 60 - currentMinutes) + (schedule[0].hours * 60 + schedule[0].minutes);
  } else {
    diffMinutes = targetMinutes - currentMinutes;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

async function fetchCFToolsServerStatus() {
  if (!CFTOOLS_API_TOKEN || !CFTOOLS_SERVER_ID || !CFTOOLS_APPLICATION_ID) {
    return { ok: false, error: 'Missing CFTools configuration' };
  }

  try {
    const response = await axios.get(
      `https://data.cftools.cloud/v1/server/${CFTOOLS_SERVER_ID}`,
      {
        headers: {
          Authorization: `Bearer ${CFTOOLS_API_TOKEN}`,
          'User-Agent': CFTOOLS_APPLICATION_ID,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return { ok: true, payload: response.data };
  } catch (error) {
    console.error('CFTools error response:', error.response?.data || error.message);

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unknown error';

    return { ok: false, error: message };
  }
}

function extractServerStatus(payload) {
  const root = payload?.server || payload?.data || payload || {};

  console.log('CFTools RAW:', JSON.stringify(root, null, 2));

  const statusString =
    root.status ||
    root.attributes?.status ||
    root.server_status ||
    root.game?.status ||
    '';

  const online =
    String(statusString).toLowerCase() === 'online' ||
    root.online === true ||
    root.isOnline === true ||
    root.attributes?.online === true;

  const players =
    root.players ??
    root.attributes?.players ??
    root.playerCount ??
    root.attributes?.playerCount ??
    root.game?.players ??
    0;

  const maxPlayers =
    root.maxPlayers ??
    root.attributes?.maxPlayers ??
    root.slots ??
    root.attributes?.slots ??
    root.game?.maxPlayers ??
    0;

  const name =
    root.name ||
    root.attributes?.name ||
    root.serverName ||
    STATUS_PANEL_TITLE;

  return {
    online,
    players: Number(players) || 0,
    maxPlayers: Number(maxPlayers) || 0,
    name,
  };
}

function buildStatusPanel(status) {
  const connectButton = new ButtonBuilder()
    .setLabel('Connect to Server')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://dayzsalauncher.com/#/join/${SERVER_ADDRESS}`);

  const embed = new EmbedBuilder()
    .setColor(status.online ? 0x16a34a : 0xdc2626)
    .setTitle(`📡 ${status.name || STATUS_PANEL_TITLE}`)
    .setDescription(
      status.online
        ? 'The server is currently online and ready to play.'
        : 'The server is currently offline.'
    )
    .addFields(
      {
        name: 'Server Status',
        value: status.online ? '🟢 Online' : '🔴 Offline',
        inline: true,
      },
      {
        name: 'Players',
        value: `${status.players} / ${status.maxPlayers}`,
        inline: true,
      },
      {
        name: 'Next Restart',
        value: getNextRestartText(),
        inline: true,
      },
      {
        name: 'IP & Port',
        value: `\`${SERVER_ADDRESS}\``,
        inline: false,
      }
    )
    .setFooter({ text: 'Project Blackout PVP • Live Server Status' });

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(connectButton)],
  };
}

async function resolveStatusMessage() {
  if (!STATUS_CHANNEL_ID) throw new Error('STATUS_CHANNEL_ID is missing');

  const channel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Status channel not found or not text based');
  }

  const state = getStatusPanelState();
  const messageId = safe(state.messageId);

  if (!messageId) return { channel, message: null };

  const message = await channel.messages.fetch(messageId).catch(() => null);
  return { channel, message };
}

async function renderStatusPanel() {
  const result = await fetchCFToolsServerStatus();

  if (!result.ok) {
    const connectButton = new ButtonBuilder()
      .setLabel('Connect to Server')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://dayzsalauncher.com/#/join/${SERVER_ADDRESS}`);

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0xdc2626)
          .setTitle(STATUS_PANEL_TITLE)
          .setDescription('The server status could not be loaded right now.')
          .addFields(
            { name: 'Server Status', value: '🔴 Offline', inline: true },
            { name: 'Players', value: '0 / 0', inline: true },
            { name: 'Next Restart', value: getNextRestartText(), inline: true },
            { name: 'IP & Port', value: `\`${SERVER_ADDRESS}\``, inline: false }
          )
          .setFooter({
            text: `Status fetch failed: ${String(result.error).slice(0, 120)}`,
          }),
      ],
      components: [new ActionRowBuilder().addComponents(connectButton)],
    };
  }

  const status = extractServerStatus(result.payload);
  return buildStatusPanel(status);
}

async function createOrReplaceStatusPanel() {
  const { channel, message } = await resolveStatusMessage();
  const panel = await renderStatusPanel();

  let finalMessage = message;

  try {
    if (finalMessage) {
      await finalMessage.edit(panel);
    } else {
      finalMessage = await channel.send(panel);
      setStatusPanelState({ channelId: channel.id, messageId: finalMessage.id });
    }

    return finalMessage;
  } catch (error) {
    const errorCode = error?.code || error?.rawError?.code;

    if (errorCode === 10008) {
      finalMessage = await channel.send(panel);
      setStatusPanelState({ channelId: channel.id, messageId: finalMessage.id });
      return finalMessage;
    }

    throw error;
  }
}

async function refreshStatusPanel() {
  try {
    const { channel, message } = await resolveStatusMessage();
    const panel = await renderStatusPanel();

    if (!message) {
      const newMessage = await channel.send(panel);
      setStatusPanelState({ channelId: channel.id, messageId: newMessage.id });
      return;
    }

    try {
      await message.edit(panel);
    } catch (error) {
      const errorCode = error?.code || error?.rawError?.code;

      if (errorCode === 10008) {
        const newMessage = await channel.send(panel);
        setStatusPanelState({ channelId: channel.id, messageId: newMessage.id });
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error('Status refresh error:', error);
  }
}

function buildWelcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setColor(0x0f0f0f)
    .setTitle('🛡️ Welcome to Project Blackout PVP')
    .setDescription(
      `Welcome ${member} to **Project Blackout PVP**!\n\n` +
      `⚔️ Prepare for intense battles\n` +
      `🧟 Survive the darkness\n` +
      `🔥 Build your legacy\n\n` +
      `We are glad to have you here. Stay sharp.`
    )
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }))
    .setFooter({ text: 'Project Blackout PVP' })
    .setTimestamp();

  if (safe(WELCOME_IMAGE_URL)) {
    embed.setImage(WELCOME_IMAGE_URL);
  }

  return embed;
}

function buildSuggestionSuccessEmbed() {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ Suggestion Submitted')
    .setDescription(
      'Your suggestion has been successfully sent to our Trello board.\n\n' +
      'You can track all suggestions, updates, and current work below.'
    )
    .addFields({
      name: 'View all suggestions',
      value: `[Open Trello Board](${TRELLO_BOARD_URL})`,
    })
    .setFooter({ text: 'Project Blackout PVP • Suggestions' });
}

async function replyWithError(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, embeds: [], components: [] }).catch(() => null);
  } else {
    await interaction.reply({ content, ephemeral: true }).catch(() => null);
  }
}

function getMissingChannelPermissions(channel, me) {
  const perms = channel.permissionsFor(me);
  if (!perms) return ['ViewChannel', 'SendMessages', 'EmbedLinks'];

  const missing = [];

  if (!perms.has(PermissionsBitField.Flags.ViewChannel)) missing.push('ViewChannel');
  if (!perms.has(PermissionsBitField.Flags.SendMessages)) missing.push('SendMessages');
  if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) missing.push('EmbedLinks');

  return missing;
}

client.once(Events.ClientReady, async () => {
  console.log('Bot online');

  ensureStatusStateFile();

  try {
    await refreshStatusPanel();
  } catch (error) {
    console.error('Initial status refresh error:', error);
  }

  setInterval(async () => {
    await refreshStatusPanel();
  }, 60 * 1000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticketpanel') {
        const channel = interaction.channel;

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: 'This command can only be used in a normal text channel.',
            ephemeral: true,
          });
          return;
        }

        const me = interaction.guild?.members?.me;
        const missing = me ? getMissingChannelPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content:
              `I cannot send the suggestion panel in this channel.\n` +
              `Missing permissions: ${missing.join(', ')}`,
            ephemeral: true,
          });
          return;
        }

        await channel.send(buildSuggestionPanel());
        await interaction.reply({
          content: 'Suggestion panel sent.',
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'suggestion') {
        await interaction.showModal(buildSuggestionModal());
        return;
      }

      if (interaction.commandName === 'statuspanel') {
        await interaction.deferReply({ ephemeral: true });

        try {
          await createOrReplaceStatusPanel();
          await interaction.editReply({
            content: 'Status panel created successfully.',
          });
        } catch (error) {
          console.error('Status panel error:', error);
          await interaction.editReply({
            content: 'Failed to create the status panel.',
          });
        }

        return;
      }

      if (interaction.commandName === 'refreshstatus') {
        await interaction.deferReply({ ephemeral: true });

        try {
          await refreshStatusPanel();
          await interaction.editReply({
            content: 'Status panel refreshed.',
          });
        } catch (error) {
          console.error('Refresh status error:', error);
          await interaction.editReply({
            content: 'Failed to refresh the status panel.',
          });
        }

        return;
      }
    }

    if (interaction.isButton() && interaction.customId === PANEL_BUTTON_ID) {
      await interaction.showModal(buildSuggestionModal());
      return;
    }

    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === SUGGESTION_MODAL_ID
    ) {
      await interaction.deferReply({ ephemeral: true });

      if (!TRELLO_KEY || !TRELLO_TOKEN || !TRELLO_BOARD_SHORTLINK) {
        await interaction.editReply({
          content: 'The suggestion system is not configured yet. Please contact an administrator.',
        });
        return;
      }

      const title = safe(interaction.fields.getTextInputValue('title'), 'No title');
      const category = safe(interaction.fields.getTextInputValue('category'), 'None');
      const description = safe(
        interaction.fields.getTextInputValue('description'),
        'No description'
      );

      const card = await createSuggestionCard({
        title,
        category,
        description,
        user: interaction.user.tag,
        userId: interaction.user.id,
        guild: interaction.guild?.name || 'Unknown',
      });

      try {
        await sendSuggestionLog(interaction, title, category, description, card.shortUrl);
      } catch (logError) {
        console.error('Suggestion log error:', logError);
      }

      await interaction.editReply({
        embeds: [buildSuggestionSuccessEmbed()],
      });
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    await replyWithError(interaction, 'Something went wrong. Please try again.');
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    if (!VERIFIED_ROLE_ID || !WELCOME_CHANNEL_ID) return;

    const hadRole = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
    const hasRoleNow = newMember.roles.cache.has(VERIFIED_ROLE_ID);

    if (!hadRole && hasRoleNow) {
      const channel = await newMember.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      await channel.send({ embeds: [buildWelcomeEmbed(newMember)] });
    }
  } catch (error) {
    console.error('Welcome error:', error);
  }
});

client.login(DISCORD_TOKEN);
