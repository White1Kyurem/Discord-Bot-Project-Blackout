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
  PermissionsBitField,
  ActivityType,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const CONFIG = {
  serverName: process.env.SERVER_NAME || 'Project Blackout PVP',
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
  verifiedRoleId: process.env.VERIFIED_ROLE_ID || '',
  welcomeImageUrl: process.env.WELCOME_IMAGE_URL || '',
  trelloKey: process.env.TRELLO_KEY || '',
  trelloToken: process.env.TRELLO_TOKEN || '',
  trelloBoardShortlink: process.env.TRELLO_BOARD_SHORTLINK || '',
  trelloTargetListName: process.env.TRELLO_TARGET_LIST_NAME || 'Suggestions',
  trelloBoardUrl: process.env.TRELLO_BOARD_URL || '',
  cftoolsServerId: process.env.CFTOOLS_SERVER_ID || '',
  cftoolsApiToken: process.env.CFTOOLS_API_TOKEN || '',
  statusPanelTitle: process.env.STATUS_PANEL_TITLE || 'Server Status',
  statusChannelId: process.env.STATUS_CHANNEL_ID || '',
};

const RULES_FILE = path.join(__dirname, 'rules.json');
const STATUS_STATE_FILE = path.join(__dirname, 'data', 'status-panel.json');
const SUGGESTION_BUTTON_ID = 'open_suggestion_modal';
const SUGGESTION_MODAL_ID = 'suggestion_modal';
const DEFAULT_RULES = {
  title: 'Server Rules',
  text:
    '1. Respect all players.\n' +
    '2. No cheating, exploiting, or duping.\n' +
    '3. No hate speech, harassment, or excessive toxicity.\n' +
    '4. Follow staff instructions immediately.\n' +
    '5. Keep the server fun and fair for everyone.',
};

function ensureDataFiles() {
  if (!fs.existsSync(path.dirname(STATUS_STATE_FILE))) {
    fs.mkdirSync(path.dirname(STATUS_STATE_FILE), { recursive: true });
  }

  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2));
  }

  if (!fs.existsSync(STATUS_STATE_FILE)) {
    fs.writeFileSync(
      STATUS_STATE_FILE,
      JSON.stringify({ channelId: null, messageId: null }, null, 2)
    );
  }
}

function safeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getRules() {
  const data = loadJson(RULES_FILE, DEFAULT_RULES);
  return {
    title: safeText(data.title, DEFAULT_RULES.title),
    text: safeText(data.text, DEFAULT_RULES.text),
  };
}

function saveRules(title, text) {
  saveJson(RULES_FILE, {
    title: safeText(title, DEFAULT_RULES.title),
    text: safeText(text, DEFAULT_RULES.text),
  });
}

function getStatusState() {
  return loadJson(STATUS_STATE_FILE, { channelId: null, messageId: null });
}

function saveStatusState(state) {
  saveJson(STATUS_STATE_FILE, state);
}

function buildRulesEmbed() {
  const rules = getRules();

  return new EmbedBuilder()
    .setColor(0x111111)
    .setTitle(`📜 ${rules.title}`)
    .setDescription(rules.text)
    .setFooter({ text: `${CONFIG.serverName} • Rules` })
    .setTimestamp();
}

function buildSuggestionPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x1f2937)
    .setTitle('💡 Submit a Suggestion')
    .setDescription(
      'Have an idea that could improve the server?\n\n' +
        'Use the button below to send feedback, feature ideas, balance changes, event ideas, or bug reports.'
    )
    .addFields(
      {
        name: 'Examples',
        value: '• New events\n• Balance changes\n• Economy ideas\n• Quality-of-life fixes\n• Bug reports',
      },
      {
        name: 'What happens next?',
        value: 'Your suggestion is sent to Trello if it is configured. A log entry can also be sent to your log channel.',
      }
    )
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` });

  const button = new ButtonBuilder()
    .setCustomId(SUGGESTION_BUTTON_ID)
    .setLabel('Open Suggestion Form')
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
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Example: Add a weekend PvP event');

  const category = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder('Example: PvP, Events, Loot, Economy');

  const description = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder('Explain your idea in detail.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(category),
    new ActionRowBuilder().addComponents(description)
  );

  return modal;
}

function buildSuggestionSuccessEmbed(cardUrl) {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ Suggestion Submitted')
    .setDescription('Your suggestion was received successfully.')
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` })
    .setTimestamp();

  if (cardUrl) {
    embed.addFields({ name: 'Trello Card', value: `[Open Card](${cardUrl})` });
  } else if (CONFIG.trelloBoardUrl) {
    embed.addFields({ name: 'Suggestion Board', value: `[Open Board](${CONFIG.trelloBoardUrl})` });
  }

  return embed;
}

function buildWelcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setColor(0x0f172a)
    .setTitle(`👋 Welcome to ${CONFIG.serverName}`)
    .setDescription(
      `Welcome ${member}!\n\n` +
        'Please read the rules, choose your roles, and enjoy your stay.'
    )
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }))
    .setFooter({ text: CONFIG.serverName })
    .setTimestamp();

  if (CONFIG.welcomeImageUrl) {
    embed.setImage(CONFIG.welcomeImageUrl);
  }

  return embed;
}

function mapMissingPermissions(channel, me) {
  const perms = channel.permissionsFor(me);
  if (!perms) return ['ViewChannel', 'SendMessages', 'EmbedLinks'];

  const missing = [];
  if (!perms.has(PermissionsBitField.Flags.ViewChannel)) missing.push('ViewChannel');
  if (!perms.has(PermissionsBitField.Flags.SendMessages)) missing.push('SendMessages');
  if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) missing.push('EmbedLinks');
  return missing;
}

async function replyError(interaction, message) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: message, embeds: [], components: [] }).catch(() => null);
  } else {
    await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
  }
}

async function fetchTrelloListId() {
  if (!CONFIG.trelloKey || !CONFIG.trelloToken || !CONFIG.trelloBoardShortlink) {
    return null;
  }

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

  const list = response.data.find((entry) => {
    return entry.name.toLowerCase() === CONFIG.trelloTargetListName.toLowerCase();
  });

  if (!list) {
    throw new Error(`Trello list not found: ${CONFIG.trelloTargetListName}`);
  }

  return list.id;
}

async function createTrelloSuggestionCard({ userTag, userId, guildName, title, category, description }) {
  const listId = await fetchTrelloListId();
  if (!listId) return null;

  const desc = [
    `User: ${userTag}`,
    `User ID: ${userId}`,
    `Server: ${guildName}`,
    `Category: ${category || 'Uncategorized'}`,
    '',
    description,
  ].join('\n');

  const response = await axios.post('https://api.trello.com/1/cards', null, {
    params: {
      key: CONFIG.trelloKey,
      token: CONFIG.trelloToken,
      idList: listId,
      name: title,
      desc,
    },
    timeout: 15000,
  });

  return response.data;
}

async function sendLogEmbed(guild, embed) {
  if (!CONFIG.logChannelId || !guild) return;
  const channel = await guild.channels.fetch(CONFIG.logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  await channel.send({ embeds: [embed] }).catch(() => null);
}

async function logSuggestion(interaction, { title, category, description, cardUrl }) {
  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle('New Suggestion')
    .addFields(
      { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})` },
      { name: 'Title', value: title, inline: true },
      { name: 'Category', value: category || 'Uncategorized', inline: true },
      { name: 'Description', value: description.slice(0, 1024) }
    )
    .setTimestamp();

  if (cardUrl) {
    embed.addFields({ name: 'Trello Card', value: cardUrl });
  }

  await sendLogEmbed(interaction.guild, embed);
}

function formatStatusValue(label, value) {
  return `**${label}:** ${value}`;
}

async function fetchServerStatus() {
  if (!CONFIG.cftoolsServerId || !CONFIG.cftoolsApiToken) {
    return {
      configured: false,
      online: false,
      serverName: CONFIG.serverName,
      players: 'Not configured',
      queue: 'Not configured',
      map: 'Unknown',
      ip: 'Unknown',
      game: 'Unknown',
      time: new Date().toISOString(),
    };
  }

  const response = await axios.get(
    `https://data.cftools.cloud/v1/server/${CONFIG.cftoolsServerId}`,
    {
      headers: {
        Authorization: `Bearer ${CONFIG.cftoolsApiToken}`,
      },
      timeout: 15000,
    }
  );

  const payload = response.data;
  const server = payload.server || payload.data || payload;
  const status = server.status || {};

  return {
    configured: true,
    online: Boolean(status.online ?? server.online ?? false),
    serverName: server.name || CONFIG.serverName,
    players:
      typeof status.players === 'number' && typeof status.maxPlayers === 'number'
        ? `${status.players}/${status.maxPlayers}`
        : (server.players ? `${server.players}` : 'Unknown'),
    queue:
      typeof status.queue === 'number'
        ? `${status.queue}`
        : typeof server.queue === 'number'
          ? `${server.queue}`
          : '0',
    map: status.map || server.map || 'Unknown',
    ip: status.ip || server.ip || 'Unknown',
    game: server.game || 'DayZ',
    time: new Date().toISOString(),
  };
}

function buildStatusEmbed(status) {
  const onlineText = status.online ? 'Online' : 'Offline';
  const color = status.online ? 0x16a34a : 0xdc2626;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📡 ${CONFIG.statusPanelTitle}`)
    .setDescription(
      [
        formatStatusValue('Server', status.serverName),
        formatStatusValue('Status', onlineText),
        formatStatusValue('Players', status.players),
        formatStatusValue('Queue', status.queue),
        formatStatusValue('Map', status.map),
        formatStatusValue('IP', status.ip),
        formatStatusValue('Game', status.game),
        formatStatusValue('Last Update', `<t:${Math.floor(new Date(status.time).getTime() / 1000)}:R>`),
      ].join('\n')
    )
    .setFooter({ text: `${CONFIG.serverName} • Live Status` })
    .setTimestamp();
}

async function createOrUpdateStatusPanel(channel) {
  const status = await fetchServerStatus();
  const embed = buildStatusEmbed(status);
  const state = getStatusState();

  let message = null;

  if (state.messageId && state.channelId) {
    const savedChannel = await client.channels.fetch(state.channelId).catch(() => null);
    if (savedChannel && savedChannel.isTextBased()) {
      message = await savedChannel.messages.fetch(state.messageId).catch(() => null);
    }
  }

  if (!message && channel) {
    message = await channel.send({ embeds: [embed] });
    saveStatusState({ channelId: channel.id, messageId: message.id });
    return { created: true, message };
  }

  if (message) {
    await message.edit({ embeds: [embed] });
    return { created: false, message };
  }

  throw new Error('No saved status panel message was found. Run /statuspanel first.');
}

async function refreshStatusPanelSilently() {
  const state = getStatusState();
  if (!state.channelId || !state.messageId) return;

  const channel = await client.channels.fetch(state.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  try {
    await createOrUpdateStatusPanel(channel);
  } catch (error) {
    console.error('Automatic status refresh failed:', error.message);
  }
}

client.once(Events.ClientReady, () => {
  ensureDataFiles();
  console.log(`Logged in as ${client.user.tag}`);
  try {
  client.user.setActivity(CONFIG.serverName, { type: ActivityType.Watching });
} catch (error) {
  console.error('Failed to set bot activity:', error);
}

  setInterval(() => {
    refreshStatusPanelSilently();
  }, 60_000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'rules') {
        await interaction.reply({ embeds: [buildRulesEmbed()] });
        return;
      }

      if (interaction.commandName === 'rulespanel') {
        const channel = interaction.options.getChannel('channel');
        const me = interaction.guild?.members?.me;
        const missing = me ? mapMissingPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content: `I cannot send the rules panel in ${channel}. Missing permissions: ${missing.join(', ')}`,
            ephemeral: true,
          });
          return;
        }

        await channel.send({ embeds: [buildRulesEmbed()] });
        await interaction.reply({ content: `Rules panel sent to ${channel}.`, ephemeral: true });
        return;
      }

      if (interaction.commandName === 'setrules') {
        const text = interaction.options.getString('text', true);
        const title = interaction.options.getString('title') || 'Server Rules';

        saveRules(title, text);

        await interaction.reply({
          content: 'Rules updated successfully.',
          embeds: [buildRulesEmbed()],
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'ticketpanel') {
        const channel = interaction.options.getChannel('channel');
        const me = interaction.guild?.members?.me;
        const missing = me ? mapMissingPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.reply({
            content: `I cannot send the suggestion panel in ${channel}. Missing permissions: ${missing.join(', ')}`,
            ephemeral: true,
          });
          return;
        }

        await channel.send(buildSuggestionPanel());
        await interaction.reply({ content: `Suggestion panel sent to ${channel}.`, ephemeral: true });
        return;
      }

      if (interaction.commandName === 'suggestion') {
        await interaction.showModal(buildSuggestionModal());
        return;
      }

      if (interaction.commandName === 'statuspanel') {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel', true);
        const me = interaction.guild?.members?.me;
        const missing = me ? mapMissingPermissions(channel, me) : ['Unknown'];

        if (missing.length) {
          await interaction.editReply(
            `I cannot send the status panel in ${channel}. Missing permissions: ${missing.join(', ')}`
          );
          return;
        }

        saveStatusState({ channelId: channel.id, messageId: null });
        const result = await createOrUpdateStatusPanel(channel);
        saveStatusState({ channelId: channel.id, messageId: result.message.id });

        await interaction.editReply(
          result.created
            ? `Status panel created in ${channel}.`
            : `Status panel updated in ${channel}.`
        );
        return;
      }

      if (interaction.commandName === 'refreshstatus') {
        await interaction.deferReply({ ephemeral: true });
        const state = getStatusState();

        if (!state.channelId) {
          await interaction.editReply('No status panel has been created yet. Run /statuspanel first.');
          return;
        }

        const channel = await client.channels.fetch(state.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          await interaction.editReply('The saved status channel no longer exists or is not a text channel.');
          return;
        }

        const result = await createOrUpdateStatusPanel(channel);
        saveStatusState({ channelId: channel.id, messageId: result.message.id });
        await interaction.editReply('Status panel refreshed.');
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === SUGGESTION_BUTTON_ID) {
      await interaction.showModal(buildSuggestionModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === SUGGESTION_MODAL_ID) {
      await interaction.deferReply({ ephemeral: true });

      const title = safeText(interaction.fields.getTextInputValue('title'), 'Untitled Suggestion');
      const category = safeText(interaction.fields.getTextInputValue('category'), 'Uncategorized');
      const description = safeText(interaction.fields.getTextInputValue('description'), 'No description provided.');

      let card = null;
      try {
        card = await createTrelloSuggestionCard({
          userTag: interaction.user.tag,
          userId: interaction.user.id,
          guildName: interaction.guild?.name || 'Unknown Server',
          title,
          category,
          description,
        });
      } catch (error) {
        console.error('Trello submission failed:', error.message);
      }

      await logSuggestion(interaction, {
        title,
        category,
        description,
        cardUrl: card?.shortUrl || '',
      });

      await interaction.editReply({ embeds: [buildSuggestionSuccessEmbed(card?.shortUrl || '')] });
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    await replyError(interaction, 'Something went wrong while processing that command.');
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    if (!CONFIG.verifiedRoleId || !CONFIG.welcomeChannelId) return;

    const hadVerifiedRole = oldMember.roles.cache.has(CONFIG.verifiedRoleId);
    const hasVerifiedRole = newMember.roles.cache.has(CONFIG.verifiedRoleId);

    if (hadVerifiedRole || !hasVerifiedRole) return;

    const channel = await newMember.guild.channels.fetch(CONFIG.welcomeChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({ embeds: [buildWelcomeEmbed(newMember)] });
  } catch (error) {
    console.error('Welcome handler error:', error);
  }
});

ensureDataFiles();
client.login(process.env.DISCORD_TOKEN);
