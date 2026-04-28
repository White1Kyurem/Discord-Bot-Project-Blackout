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
  ActivityType,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const { deployCommands } = require('./deploy-commands');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const EMBED_COLOR = 0x5b2a86;
const DEFAULT_RULES_COLOR = '#5B2A86';
const EDIT_RULES_MODAL_PREFIX = 'edit_rules_modal_';

const CONFIG = {
  token: process.env.DISCORD_TOKEN || '',
  serverName: process.env.SERVER_NAME || 'Project Blackout PVP',

  trelloKey: process.env.TRELLO_KEY || '',
  trelloToken: process.env.TRELLO_TOKEN || '',
  trelloBoardShortlink: process.env.TRELLO_BOARD_SHORTLINK || '',
  trelloTargetListName: process.env.TRELLO_TARGET_LIST_NAME || 'Suggestions',
  trelloBoardUrl: process.env.TRELLO_BOARD_URL || 'https://trello.com/',

  trelloHighPriorityLabelName: process.env.TRELLO_HIGH_PRIORITY_LABEL_NAME || 'High Priority',
  trelloMediumPriorityLabelName: process.env.TRELLO_MEDIUM_PRIORITY_LABEL_NAME || 'Medium Priority',
  trelloHighPriorityLabelColor: process.env.TRELLO_HIGH_PRIORITY_LABEL_COLOR || 'red',
  trelloMediumPriorityLabelColor: process.env.TRELLO_MEDIUM_PRIORITY_LABEL_COLOR || 'yellow',

  logChannelId: process.env.LOG_CHANNEL_ID || '',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
  verifiedRoleId: process.env.VERIFIED_ROLE_ID || '',
  welcomeImageUrl: process.env.WELCOME_IMAGE_URL || '',

  verifyRoleId: process.env.VERIFY_ROLE_ID || '',
  unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || '',
  verifyLogChannelId: process.env.VERIFY_LOG_CHANNEL_ID || '',
  verifyImageUrl: process.env.VERIFY_IMAGE_URL || '',

  priorityHighRoleIds: process.env.PRIORITY_HIGH_ROLE_IDS || '',
  priorityMediumRoleIds: process.env.PRIORITY_MEDIUM_ROLE_IDS || '',

  donationForumChannelId: process.env.DONATION_FORUM_CHANNEL_ID || '',
  donationGoalAmount: Number(process.env.DONATION_GOAL_AMOUNT || 500),
  donationCurrencySymbol: process.env.DONATION_CURRENCY_SYMBOL || '€',
};

const DATA_DIR = path.join(__dirname, 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');
const DONATION_FILE = path.join(DATA_DIR, 'donation-progress.json');

const PANEL_BUTTON_ID = 'open_suggestion_modal';
const VERIFY_BUTTON_ID = 'verify_user_button';
const SUGGESTION_MODAL_ID = 'suggestion_modal';
const RULES_MODAL_PREFIX = 'rules_modal_';

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(
      RULES_FILE,
      JSON.stringify(
        {
          title: 'Server Rules',
          text:
            '1. Respect all players.\n' +
            '2. No cheating or exploiting.\n' +
            '3. No abusive language.\n' +
            '4. Follow staff instructions.\n' +
            '5. Have fun.',
          color: DEFAULT_RULES_COLOR,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  if (!fs.existsSync(DONATION_FILE)) {
    fs.writeFileSync(
      DONATION_FILE,
      JSON.stringify(
        {
          currentAmount: 0,
          goalAmount: CONFIG.donationGoalAmount,
          currencySymbol: CONFIG.donationCurrencySymbol,
          forumChannelId: CONFIG.donationForumChannelId,
          threadId: '',
          messageId: '',
          lastDonation: null,
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function clampText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function parseHexColor(input) {
  const raw = safeString(input, '').replace('#', '').trim();
  if (!raw) return EMBED_COLOR;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return EMBED_COLOR;
  return parseInt(raw, 16);
}

function normalizeHexColor(input = DEFAULT_RULES_COLOR) {
  const raw = safeString(input, DEFAULT_RULES_COLOR).replace('#', '').trim();
  if (!raw) return DEFAULT_RULES_COLOR;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return DEFAULT_RULES_COLOR;
  return `#${raw.toUpperCase()}`;
}

function parseRoleIds(value) {
  return safeString(value)
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
}

function getSuggestionPriority(member) {
  if (!member || !member.roles || !member.roles.cache) return 'NORMAL';

  const highRoleIds = parseRoleIds(CONFIG.priorityHighRoleIds);
  const mediumRoleIds = parseRoleIds(CONFIG.priorityMediumRoleIds);

  if (member.roles.cache.some(role => highRoleIds.includes(role.id))) return 'HIGH';
  if (member.roles.cache.some(role => mediumRoleIds.includes(role.id))) return 'MEDIUM';

  return 'NORMAL';
}

function getPriorityColor(priority) {
  if (priority === 'HIGH') return 0xff0000;
  if (priority === 'MEDIUM') return 0xfacc15;
  return EMBED_COLOR;
}

function getRulesData() {
  const fallback = {
    title: 'Server Rules',
    text:
      '1. Respect all players.\n' +
      '2. No cheating or exploiting.\n' +
      '3. No abusive language.\n' +
      '4. Follow staff instructions.\n' +
      '5. Have fun.',
    color: DEFAULT_RULES_COLOR,
  };

  try {
    ensureDataFiles();
    const raw = fs.readFileSync(RULES_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      title: safeString(parsed.title, fallback.title),
      text: safeString(parsed.text, fallback.text),
      color: normalizeHexColor(parsed.color || fallback.color),
    };
  } catch (error) {
    console.error('Failed to read rules file:', error);
    return fallback;
  }
}

function saveRulesData(data) {
  try {
    ensureDataFiles();

    fs.writeFileSync(
      RULES_FILE,
      JSON.stringify(
        {
          title: safeString(data.title, 'Server Rules'),
          text: safeString(data.text, ''),
          color: normalizeHexColor(data.color || DEFAULT_RULES_COLOR),
        },
        null,
        2
      ),
      'utf8'
    );

    return true;
  } catch (error) {
    console.error('Failed to save rules file:', error);
    return false;
  }
}

function splitTextIntoChunks(text, maxLength = 4000) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;

    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    let remaining = line;
    while (remaining.length > maxLength) {
      chunks.push(remaining.slice(0, maxLength));
      remaining = remaining.slice(maxLength);
    }
    current = remaining;
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : ['No content provided.'];
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

async function replyWithError(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content,
      embeds: [],
      components: [],
    }).catch(() => null);
    return;
  }

  await interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  }).catch(() => null);
}

function buildRulesEmbeds(title, text, colorInput = DEFAULT_RULES_COLOR) {
  const chunks = splitTextIntoChunks(text, 4000);
  const color = parseHexColor(colorInput);
  const normalizedColor = normalizeHexColor(colorInput);

  return chunks.map((chunk, index) => {
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(index === 0 ? `📜 ${title}` : `📜 ${title} (${index + 1})`)
      .setDescription(chunk)
      .setFooter({
        text: `${CONFIG.serverName} • Rules Panel • ${normalizedColor}`,
      });
  });
}

function buildDefaultRulesEmbeds() {
  const rules = getRulesData();
  return buildRulesEmbeds(rules.title, rules.text, rules.color);
}

function buildRulesModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`${RULES_MODAL_PREFIX}${channelId}`)
    .setTitle('Create Rules Panel');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Panel Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Example: Basebuilding Rules');

  const colorInput = new TextInputBuilder()
    .setCustomId('color')
    .setLabel('Embed Color Hex')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7)
    .setPlaceholder('#5B2A86');

  const textInput = new TextInputBuilder()
    .setCustomId('text')
    .setLabel('Rules Text')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setPlaceholder('Write your rules here.\n\nYou can use multiple lines, empty lines, and bullet points.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(textInput)
  );

  return modal;
}

function cleanEmbedTitle(title) {
  return safeString(title, 'Rules Panel')
    .replace(/^📜\s*/, '')
    .replace(/\s\(\d+\)$/, '');
}

function getColorFromEmbed(embed) {
  if (!embed || typeof embed.color !== 'number') return DEFAULT_RULES_COLOR;
  return `#${embed.color.toString(16).padStart(6, '0').toUpperCase()}`;
}

function buildEditRulesModal(channelId, messageId, existingTitle, existingText, existingColor) {
  const modal = new ModalBuilder()
    .setCustomId(`${EDIT_RULES_MODAL_PREFIX}${channelId}_${messageId}`)
    .setTitle('Edit Rules Panel');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Panel Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setValue(cleanEmbedTitle(existingTitle));

  const colorInput = new TextInputBuilder()
    .setCustomId('color')
    .setLabel('Embed Color Hex')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7)
    .setValue(normalizeHexColor(existingColor));

  const textInput = new TextInputBuilder()
    .setCustomId('text')
    .setLabel('Rules Text')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setValue(clampText(existingText, 4000));

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(textInput)
  );

  return modal;
}

function buildSuggestionPanel() {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('📝 Suggestion Panel')
    .setDescription(
      'Have an idea for the server?\n\n' +
        'Click the button below to submit a suggestion for features, balancing, events, fixes, or improvements.'
    )
    .addFields({
      name: 'Examples',
      value:
        '• New features\n' +
        '• Base building changes\n' +
        '• Raiding changes\n' +
        '• PvP balancing\n' +
        '• Bug fixes',
    })
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` });

  const button = new ButtonBuilder()
    .setCustomId(PANEL_BUTTON_ID)
    .setLabel('Submit Suggestion')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

function buildSuggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId(SUGGESTION_MODAL_ID)
    .setTitle('Submit a Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Example: New event zone');

  const categoryInput = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder('Example: PvP, Raiding, Base Building');

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder('Explain your suggestion in detail');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  return modal;
}

function buildSuggestionSuccessEmbed(priority = 'NORMAL') {
  return new EmbedBuilder()
    .setColor(getPriorityColor(priority))
    .setTitle('✅ Suggestion Submitted')
    .setDescription(
      'Your suggestion was sent successfully.\n\n' +
        `Priority: **${priority}**\n\n` +
        'You can track progress and updates on the Trello board.'
    )
    .addFields({
      name: 'Trello Board',
      value: `[Open Board](${CONFIG.trelloBoardUrl})`,
    })
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` });
}

async function findTrelloListId() {
  const response = await axios.get(
    `https://api.trello.com/1/boards/${CONFIG.trelloBoardShortlink}/lists`,
    {
      params: {
        key: CONFIG.trelloKey,
        token: CONFIG.trelloToken,
      },
      timeout: 15000,
    }
  );

  const list = response.data.find(
    item => item.name.toLowerCase() === CONFIG.trelloTargetListName.toLowerCase()
  );

  if (!list) throw new Error(`Trello list "${CONFIG.trelloTargetListName}" was not found.`);
  return list.id;
}

async function findOrCreateTrelloLabel(labelName, labelColor) {
  const response = await axios.get(
    `https://api.trello.com/1/boards/${CONFIG.trelloBoardShortlink}/labels`,
    {
      params: {
        key: CONFIG.trelloKey,
        token: CONFIG.trelloToken,
      },
      timeout: 15000,
    }
  );

  const existingLabel = response.data.find(
    label => label.name.toLowerCase() === labelName.toLowerCase()
  );

  if (existingLabel) return existingLabel.id;

  const createdLabel = await axios.post('https://api.trello.com/1/labels', null, {
    params: {
      key: CONFIG.trelloKey,
      token: CONFIG.trelloToken,
      idBoard: CONFIG.trelloBoardShortlink,
      name: labelName,
      color: labelColor,
    },
    timeout: 15000,
  });

  return createdLabel.data.id;
}

async function getPriorityLabelId(priority) {
  if (priority === 'HIGH') {
    return findOrCreateTrelloLabel(
      CONFIG.trelloHighPriorityLabelName,
      CONFIG.trelloHighPriorityLabelColor
    );
  }

  if (priority === 'MEDIUM') {
    return findOrCreateTrelloLabel(
      CONFIG.trelloMediumPriorityLabelName,
      CONFIG.trelloMediumPriorityLabelColor
    );
  }

  return null;
}

async function createSuggestionCard(data) {
  const listId = await findTrelloListId();
  const priority = data.priority || 'NORMAL';
  const labelId = await getPriorityLabelId(priority);

  const desc = [
    `Priority: ${priority}`,
    `User: ${data.user}`,
    `User ID: ${data.userId}`,
    `Server: ${data.guild}`,
    `Category: ${data.category}`,
    '',
    data.description,
  ].join('\n');

  const params = {
    key: CONFIG.trelloKey,
    token: CONFIG.trelloToken,
    idList: listId,
    name: data.title,
    desc,
  };

  if (labelId) params.idLabels = labelId;

  const response = await axios.post('https://api.trello.com/1/cards', null, {
    params,
    timeout: 15000,
  });

  return response.data;
}

async function sendSuggestionLog(interaction, title, category, description, cardUrl, priority = 'NORMAL') {
  if (!CONFIG.logChannelId || !interaction.guild) return;

  const channel = await interaction.guild.channels.fetch(CONFIG.logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(getPriorityColor(priority))
    .setTitle('New Suggestion')
    .addFields(
      { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: 'Priority', value: priority || 'NORMAL', inline: true },
      { name: 'Category', value: category || 'None', inline: true },
      { name: 'Title', value: title, inline: true },
      { name: 'Description', value: clampText(description, 1024) },
      { name: 'Trello Card', value: cardUrl || 'Created' }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

function buildVerifyPanel() {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('🔐 Server Verification')
    .setDescription(
      'To access the full server, you need to verify yourself.\n\n' +
        'Click the button below to get verified and unlock all channels.'
    )
    .setFooter({ text: `${CONFIG.serverName} • Verification` });

  if (safeString(CONFIG.verifyImageUrl)) embed.setImage(CONFIG.verifyImageUrl);

  const button = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)],
  };
}

async function sendVerifyLog(member) {
  if (!CONFIG.verifyLogChannelId) return;

  const channel = await member.guild.channels.fetch(CONFIG.verifyLogChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('✅ User Verified')
    .addFields(
      { name: 'User', value: `${member.user.tag} (${member.id})` },
      {
        name: 'Verified Role',
        value: CONFIG.verifyRoleId ? `<@&${CONFIG.verifyRoleId}>` : 'Not configured',
        inline: true,
      },
      {
        name: 'Unverified Removed',
        value: CONFIG.unverifiedRoleId ? `<@&${CONFIG.unverifiedRoleId}>` : 'Not configured',
        inline: true,
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

function buildWelcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`Welcome to ${CONFIG.serverName}`)
    .setDescription(
      `Welcome ${member}!\n\n` +
        'You are now verified and ready to join the community.\n' +
        'Please read the rules, stay respectful, and have fun.'
    )
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }))
    .setFooter({ text: CONFIG.serverName })
    .setTimestamp();

  if (safeString(CONFIG.welcomeImageUrl)) embed.setImage(CONFIG.welcomeImageUrl);
  return embed;
}

/* =========================
   DONATION SYSTEM
========================= */

function getDonationData() {
  ensureDataFiles();

  try {
    const raw = fs.readFileSync(DONATION_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      currentAmount: Number(parsed.currentAmount || 0),
      goalAmount: Number(parsed.goalAmount || CONFIG.donationGoalAmount),
      currencySymbol: safeString(parsed.currencySymbol, CONFIG.donationCurrencySymbol),
      forumChannelId: safeString(parsed.forumChannelId, CONFIG.donationForumChannelId),
      threadId: safeString(parsed.threadId, ''),
      messageId: safeString(parsed.messageId, ''),
      lastDonation: parsed.lastDonation || null,
    };
  } catch (error) {
    console.error('Failed to read donation file:', error);

    return {
      currentAmount: 0,
      goalAmount: CONFIG.donationGoalAmount,
      currencySymbol: CONFIG.donationCurrencySymbol,
      forumChannelId: CONFIG.donationForumChannelId,
      threadId: '',
      messageId: '',
      lastDonation: null,
    };
  }
}

function saveDonationData(data) {
  ensureDataFiles();
  fs.writeFileSync(DONATION_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function buildDonationProgressBar(current, goal, size = 18) {
  const safeGoal = Math.max(Number(goal || 0), 1);
  const percent = Math.min(Math.max(Number(current || 0) / safeGoal, 0), 1);
  const filled = Math.round(size * percent);

  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
}

function buildDonationEmbed(data) {
  const current = Number(data.currentAmount || 0);
  const goal = Math.max(Number(data.goalAmount || CONFIG.donationGoalAmount), 1);
  const currency = safeString(data.currencySymbol, CONFIG.donationCurrencySymbol);
  const percentNumber = Math.min((current / goal) * 100, 100);
  const remaining = Math.max(goal - current, 0);

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('💎 Support Project Blackout')
    .setDescription(
      [
        '> Help us grow the server and improve the experience for everyone.',
        '',
        '**Donation Progress**',
        `\`${buildDonationProgressBar(current, goal)}\` **${percentNumber.toFixed(1)}%**`,
        '',
        `💰 **Raised:** ${current.toFixed(2)}${currency}`,
        `🎯 **Goal:** ${goal.toFixed(2)}${currency}`,
        `📌 **Remaining:** ${remaining.toFixed(2)}${currency}`,
        '',
        '✨ Every donation helps us improve Project Blackout.',
        '❤️ Thank you for your support!',
      ].join('\n')
    )
    .setFooter({ text: `${CONFIG.serverName} • Donation System` })
    .setTimestamp();

  if (data.lastDonation) {
    embed.addFields({
      name: '🌟 Latest Donation',
      value:
        `**Amount:** ${Number(data.lastDonation.amount || 0).toFixed(2)}${currency}\n` +
        `**Donor:** ${safeString(data.lastDonation.donor, 'Unknown')}\n` +
        `**Note:** ${safeString(data.lastDonation.note, 'No note')}`,
    });
  }

  return embed;
}

async function ensureDonationPost(interaction, data) {
  const forumChannelId = safeString(data.forumChannelId, CONFIG.donationForumChannelId);

  if (!forumChannelId) {
    throw new Error('DONATION_FORUM_CHANNEL_ID is not configured.');
  }

  const forum = await interaction.guild.channels.fetch(forumChannelId).catch(() => null);

  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error('The configured donation channel is not a forum channel.');
  }

  if (data.threadId && data.messageId) {
    const existingThread = await interaction.guild.channels.fetch(data.threadId).catch(() => null);

    if (existingThread) {
      const existingMessage = await existingThread.messages.fetch(data.messageId).catch(() => null);

      if (existingMessage) {
        await existingMessage.edit({
          embeds: [buildDonationEmbed(data)],
        });

        return data;
      }
    }
  }

  const thread = await forum.threads.create({
    name: '💎 Donation Progress',
    message: {
      embeds: [buildDonationEmbed(data)],
    },
  });

  const starterMessage = await thread.fetchStarterMessage();

  data.threadId = thread.id;
  data.messageId = starterMessage.id;

  saveDonationData(data);

  return data;
}

async function updateDonationPost(interaction, data) {
  const updatedData = await ensureDonationPost(interaction, data);

  const thread = await interaction.guild.channels.fetch(updatedData.threadId).catch(() => null);
  if (!thread) throw new Error('Donation thread was not found.');

  const message = await thread.messages.fetch(updatedData.messageId).catch(() => null);
  if (!message) throw new Error('Donation message was not found.');

  await message.edit({
    embeds: [buildDonationEmbed(updatedData)],
  });

  return updatedData;
}

/* =========================
   BOT EVENTS
========================= */

client.once(Events.ClientReady, async () => {
  ensureDataFiles();
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await deployCommands();
  } catch (error) {
    console.error('Failed to deploy slash commands:', error);
  }

  try {
    client.user.setActivity(CONFIG.serverName, { type: ActivityType.Watching });
  } catch (error) {
    console.error('Failed to set bot activity:', error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    if (!CONFIG.unverifiedRoleId) return;

    const role = member.guild.roles.cache.get(CONFIG.unverifiedRoleId);
    if (!role) return;

    await member.roles.add(role).catch(() => null);
  } catch (error) {
    console.error('Unverified role error:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'rules' || interaction.commandName === 'serverrules') {
        await interaction.reply({
          embeds: buildDefaultRulesEmbeds(),
        });
        return;
      }

      if (interaction.commandName === 'setrules' || interaction.commandName === 'setserverrules') {
        const title = interaction.options.getString('title') || 'Server Rules';
        const text = interaction.options.getString('text');
        const color = interaction.options.getString('color') || DEFAULT_RULES_COLOR;

        const success = saveRulesData({ title, text, color });

        if (!success) {
          await interaction.reply({
            content: '❌ Failed to update the default rules.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply({
          content: `✅ Default rules updated successfully.\nColor: ${normalizeHexColor(color)}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'rulespanel') {
        const channel = interaction.options.getChannel('channel');

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: 'Please select a valid text channel.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const me = interaction.guild?.members?.me;
        const missing = me ? getMissingChannelPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content: `I cannot send the rules panel to ${channel}.\nMissing permissions: ${missing.join(', ')}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.showModal(buildRulesModal(channel.id));
        return;
      }

      if (interaction.commandName === 'editrulespanel') {
        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: 'Please select a valid text channel.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const message = await channel.messages.fetch(messageId).catch(() => null);

        if (!message) {
          await interaction.reply({
            content: 'I could not find a message with that ID in the selected channel.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (message.author.id !== client.user.id) {
          await interaction.reply({
            content: 'I can only edit rules panels that were sent by this bot.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const firstEmbed = message.embeds[0];

        if (!firstEmbed) {
          await interaction.reply({
            content: 'That message does not contain an embed.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const existingTitle = firstEmbed.title || 'Rules Panel';
        const existingColor = getColorFromEmbed(firstEmbed);
        const existingText = message.embeds
          .map(embed => embed.description || '')
          .filter(Boolean)
          .join('\n');

        await interaction.showModal(
          buildEditRulesModal(channel.id, message.id, existingTitle, existingText, existingColor)
        );
        return;
      }

      if (interaction.commandName === 'ticketpanel') {
        const channel = interaction.options.getChannel('channel');

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: 'Please select a valid text channel.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const me = interaction.guild?.members?.me;
        const missing = me ? getMissingChannelPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content: `I cannot send the suggestion panel to ${channel}.\nMissing permissions: ${missing.join(', ')}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await channel.send(buildSuggestionPanel());

        await interaction.reply({
          content: `✅ Suggestion panel sent to ${channel}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'verifypanel') {
        const channel = interaction.options.getChannel('channel');

        if (!channel || !channel.isTextBased()) {
          await interaction.reply({
            content: 'Please select a valid text channel.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const me = interaction.guild?.members?.me;
        const missing = me ? getMissingChannelPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content: `I cannot send the verify panel to ${channel}.\nMissing permissions: ${missing.join(', ')}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await channel.send(buildVerifyPanel());

        await interaction.reply({
          content: `✅ Verify panel sent to ${channel}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'donation') {
        await interaction.deferReply({
          flags: MessageFlags.Ephemeral,
        });

        const subcommand = interaction.options.getSubcommand();
        const data = getDonationData();

        try {
          if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');

            if (channel) {
              if (channel.type !== ChannelType.GuildForum) {
                await interaction.editReply({
                  content: '❌ Please select a valid forum channel.',
                });
                return;
              }

              data.forumChannelId = channel.id;
            }

            await ensureDonationPost(interaction, data);
            saveDonationData(data);

            await interaction.editReply({
              content: '✅ Donation progress post has been created or updated.',
            });
            return;
          }

          if (subcommand === 'add') {
            const amount = interaction.options.getNumber('amount');
            const donor = interaction.options.getString('donor') || 'Anonymous';
            const note = interaction.options.getString('note') || 'No note';

            if (!amount || amount <= 0) {
              await interaction.editReply({
                content: '❌ Amount must be higher than 0.',
              });
              return;
            }

            data.currentAmount += amount;
            data.lastDonation = {
              amount,
              donor,
              note,
              addedBy: interaction.user.tag,
              addedAt: new Date().toISOString(),
            };

            saveDonationData(data);
            await updateDonationPost(interaction, data);

            await interaction.editReply({
              content: `✅ Added **${amount.toFixed(2)}${data.currencySymbol}** to the donation progress.`,
            });
            return;
          }

          if (subcommand === 'set') {
            const amount = interaction.options.getNumber('amount');

            if (amount < 0) {
              await interaction.editReply({
                content: '❌ Amount cannot be negative.',
              });
              return;
            }

            data.currentAmount = amount;
            saveDonationData(data);
            await updateDonationPost(interaction, data);

            await interaction.editReply({
              content: `✅ Donation progress set to **${amount.toFixed(2)}${data.currencySymbol}**.`,
            });
            return;
          }

          if (subcommand === 'goal') {
            const amount = interaction.options.getNumber('amount');

            if (!amount || amount <= 0) {
              await interaction.editReply({
                content: '❌ Goal must be higher than 0.',
              });
              return;
            }

            data.goalAmount = amount;
            saveDonationData(data);
            await updateDonationPost(interaction, data);

            await interaction.editReply({
              content: `✅ Donation goal set to **${amount.toFixed(2)}${data.currencySymbol}**.`,
            });
            return;
          }

          if (subcommand === 'reset') {
            data.currentAmount = 0;
            data.lastDonation = null;
            saveDonationData(data);
            await updateDonationPost(interaction, data);

            await interaction.editReply({
              content: '✅ Donation progress has been reset.',
            });
            return;
          }

          if (subcommand === 'status') {
            await ensureDonationPost(interaction, data);

            await interaction.editReply({
              embeds: [buildDonationEmbed(data)],
            });
            return;
          }
        } catch (error) {
          console.error('Donation command error:', error);

          await interaction.editReply({
            content: `❌ Donation command failed: ${error.message}`,
          });
          return;
        }
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

    if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ This button can only be used in a server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!CONFIG.verifyRoleId) {
        await interaction.reply({
          content: '❌ VERIFY_ROLE_ID is not configured.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) {
        await interaction.reply({
          content: '❌ Member not found.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const verifyRole = interaction.guild.roles.cache.get(CONFIG.verifyRoleId);
      if (!verifyRole) {
        await interaction.reply({
          content: '❌ Verified role not found.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (member.roles.cache.has(CONFIG.verifyRoleId)) {
        await interaction.reply({
          content: '✅ You are already verified.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await member.roles.add(CONFIG.verifyRoleId).catch(() => null);

      if (CONFIG.unverifiedRoleId && member.roles.cache.has(CONFIG.unverifiedRoleId)) {
        await member.roles.remove(CONFIG.unverifiedRoleId).catch(() => null);
      }

      await sendVerifyLog(member);

      await interaction.reply({
        content: '✅ You have been verified successfully.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId.startsWith(RULES_MODAL_PREFIX)
    ) {
      const channelId = interaction.customId.replace(RULES_MODAL_PREFIX, '');
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: 'Channel not found.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const me = interaction.guild?.members?.me;
      const missing = me ? getMissingChannelPermissions(channel, me) : ['Unknown'];

      if (missing.length) {
        await interaction.reply({
          content: `I cannot send the rules panel to ${channel}.\nMissing permissions: ${missing.join(', ')}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const title = safeString(interaction.fields.getTextInputValue('title'), 'Rules Panel');
      const text = safeString(interaction.fields.getTextInputValue('text'), 'No rules text provided.');
      const color = safeString(interaction.fields.getTextInputValue('color'), DEFAULT_RULES_COLOR);

      const embeds = buildRulesEmbeds(title, text, color);

      await channel.send({ embeds });

      await interaction.reply({
        content:
          `✅ Rules panel sent to ${channel}.\n` +
          `Title: ${title}\n` +
          `Color: ${normalizeHexColor(color)}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId.startsWith(EDIT_RULES_MODAL_PREFIX)
    ) {
      const parts = interaction.customId.replace(EDIT_RULES_MODAL_PREFIX, '').split('_');
      const channelId = parts[0];
      const messageId = parts[1];

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: 'Channel not found.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);

      if (!message) {
        await interaction.reply({
          content: 'Message not found.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (message.author.id !== client.user.id) {
        await interaction.reply({
          content: 'I can only edit rules panels that were sent by this bot.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const title = safeString(interaction.fields.getTextInputValue('title'), 'Rules Panel');
      const text = safeString(interaction.fields.getTextInputValue('text'), 'No rules text provided.');
      const color = safeString(interaction.fields.getTextInputValue('color'), DEFAULT_RULES_COLOR);

      const embeds = buildRulesEmbeds(title, text, color);

      await message.edit({ embeds });

      await interaction.reply({
        content:
          `✅ Rules panel updated in ${channel}.\n` +
          `Title: ${title}\n` +
          `Color: ${normalizeHexColor(color)}`,
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === SUGGESTION_MODAL_ID
    ) {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (!CONFIG.trelloKey || !CONFIG.trelloToken || !CONFIG.trelloBoardShortlink) {
        await interaction.editReply({
          content: 'The suggestion system is not configured yet. Please contact an administrator.',
        });
        return;
      }

      const title = safeString(interaction.fields.getTextInputValue('title'), 'No title');
      const category = safeString(interaction.fields.getTextInputValue('category'), 'None');
      const description = safeString(interaction.fields.getTextInputValue('description'), 'No description');

      const priority = getSuggestionPriority(interaction.member);

      try {
        const card = await createSuggestionCard({
          title,
          category,
          description,
          user: interaction.user.tag,
          userId: interaction.user.id,
          guild: interaction.guild?.name || 'Unknown',
          priority,
        });

        try {
          await sendSuggestionLog(interaction, title, category, description, card.shortUrl, priority);
        } catch (logError) {
          console.error('Suggestion log error:', logError);
        }

        await interaction.editReply({
          embeds: [buildSuggestionSuccessEmbed(priority)],
        });
      } catch (error) {
        console.error('Suggestion submit error:', error);
        await interaction.editReply({
          content: '❌ Failed to submit the suggestion. Please try again later.',
        });
      }

      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    await replyWithError(interaction, 'Something went wrong. Please try again.');
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    if (!CONFIG.verifiedRoleId || !CONFIG.welcomeChannelId) return;

    const hadRole = oldMember.roles.cache.has(CONFIG.verifiedRoleId);
    const hasRoleNow = newMember.roles.cache.has(CONFIG.verifiedRoleId);

    if (!hadRole && hasRoleNow) {
      const channel = await newMember.guild.channels.fetch(CONFIG.welcomeChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      await channel.send({
        embeds: [buildWelcomeEmbed(newMember)],
      });
    }
  } catch (error) {
    console.error('Welcome error:', error);
  }
});

if (!CONFIG.token) {
  console.error('Missing DISCORD_TOKEN in environment variables.');
  process.exit(1);
}

client.login(CONFIG.token);
