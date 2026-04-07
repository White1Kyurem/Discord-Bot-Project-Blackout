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
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const CONFIG = {
  token: process.env.DISCORD_TOKEN,
  serverName: process.env.SERVER_NAME || 'Project Blackout PVP',

  trelloKey: process.env.TRELLO_KEY || '',
  trelloToken: process.env.TRELLO_TOKEN || '',
  trelloBoardShortlink: process.env.TRELLO_BOARD_SHORTLINK || '',
  trelloTargetListName: process.env.TRELLO_TARGET_LIST_NAME || 'Suggestions',
  trelloBoardUrl: process.env.TRELLO_BOARD_URL || 'https://trello.com/',

  logChannelId: process.env.LOG_CHANNEL_ID || '',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
  verifiedRoleId: process.env.VERIFIED_ROLE_ID || '',
  welcomeImageUrl: process.env.WELCOME_IMAGE_URL || '',
};

const DATA_DIR = path.join(__dirname, 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');

const PANEL_BUTTON_ID = 'open_suggestion_modal';
const SUGGESTION_MODAL_ID = 'suggestion_modal';

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

function getRulesData() {
  const fallback = {
    title: 'Server Rules',
    text:
      '1. Respect all players.\n' +
      '2. No cheating or exploiting.\n' +
      '3. No abusive language.\n' +
      '4. Follow staff instructions.\n' +
      '5. Have fun.',
  };

  try {
    ensureDataFiles();

    const raw = fs.readFileSync(RULES_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      title: safeString(parsed.title, fallback.title),
      text: safeString(parsed.text, fallback.text),
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

function buildRulesEmbed(title, text) {
  return new EmbedBuilder()
    .setColor(0x111111)
    .setTitle(`📜 ${title}`)
    .setDescription(text)
    .setFooter({ text: `${CONFIG.serverName} • Rules Panel` });
}

function buildDefaultRulesEmbed() {
  const rules = getRulesData();
  return buildRulesEmbed(rules.title, rules.text);
}

function buildSuggestionPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x111111)
    .setTitle('📝 Suggestion Panel')
    .setDescription(
      'Have an idea for the server?\n\n' +
        'Click the button below to submit a suggestion for features, balancing, events, fixes, or improvements.'
    )
    .addFields(
      {
        name: 'Examples',
        value:
          '• New features\n' +
          '• Base building changes\n' +
          '• Raiding changes\n' +
          '• PvP balancing\n' +
          '• Bug fixes',
      },
      {
        name: 'How it works',
        value:
          'Press the button, fill out the form, and the suggestion will be sent to the Trello board.',
      }
    )
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` });

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

function buildSuggestionSuccessEmbed() {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ Suggestion Submitted')
    .setDescription(
      'Your suggestion was sent successfully.\n\n' +
        'You can track progress and updates on the Trello board.'
    )
    .addFields({
      name: 'Trello Board',
      value: `[Open Board](${CONFIG.trelloBoardUrl})`,
    })
    .setFooter({ text: `${CONFIG.serverName} • Suggestions` });
}

function buildWelcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setColor(0x0f0f0f)
    .setTitle(`Welcome to ${CONFIG.serverName}`)
    .setDescription(
      `Welcome ${member}!\n\n` +
        'You are now verified and ready to join the community.\n' +
        'Please read the rules, stay respectful, and have fun.'
    )
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }))
    .setFooter({ text: CONFIG.serverName })
    .setTimestamp();

  if (safeString(CONFIG.welcomeImageUrl)) {
    embed.setImage(CONFIG.welcomeImageUrl);
  }

  return embed;
}

function getMissingChannelPermissions(channel, me) {
  const perms = channel.permissionsFor(me);
  if (!perms) return ['ViewChannel', 'SendMessages', 'EmbedLinks'];

  const missing = [];

  if (!perms.has(PermissionsBitField.Flags.ViewChannel)) {
    missing.push('ViewChannel');
  }

  if (!perms.has(PermissionsBitField.Flags.SendMessages)) {
    missing.push('SendMessages');
  }

  if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) {
    missing.push('EmbedLinks');
  }

  return missing;
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
    item =>
      item.name.toLowerCase() === CONFIG.trelloTargetListName.toLowerCase()
  );

  if (!list) {
    throw new Error(`Trello list "${CONFIG.trelloTargetListName}" was not found.`);
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
      key: CONFIG.trelloKey,
      token: CONFIG.trelloToken,
      idList: listId,
      name: data.title,
      desc,
    },
    timeout: 15000,
  });

  return response.data;
}

async function sendSuggestionLog(interaction, title, category, description, cardUrl) {
  if (!CONFIG.logChannelId || !interaction.guild) return;

  const channel = await interaction.guild.channels
    .fetch(CONFIG.logChannelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle('New Suggestion')
    .addFields(
      {
        name: 'User',
        value: `${interaction.user.tag} (${interaction.user.id})`,
      },
      {
        name: 'Category',
        value: category || 'None',
        inline: true,
      },
      {
        name: 'Title',
        value: title,
        inline: true,
      },
      {
        name: 'Description',
        value: description.slice(0, 1024),
      },
      {
        name: 'Trello Card',
        value: cardUrl || 'Created',
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
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

client.once(Events.ClientReady, () => {
  ensureDataFiles();
  console.log(`Logged in as ${client.user.tag}`);

  try {
    client.user.setActivity(CONFIG.serverName, { type: ActivityType.Watching });
  } catch (error) {
    console.error('Failed to set bot activity:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'rules' || interaction.commandName === 'serverrules') {
        await interaction.reply({
          embeds: [buildDefaultRulesEmbed()],
        });
        return;
      }

      if (interaction.commandName === 'setrules' || interaction.commandName === 'setserverrules') {
        const title = interaction.options.getString('title') || 'Server Rules';
        const text = interaction.options.getString('text');

        const success = saveRulesData({ title, text });

        if (!success) {
          await interaction.reply({
            content: '❌ Failed to update the default rules.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply({
          content: '✅ Default rules updated successfully.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'rulespanel') {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const text = interaction.options.getString('text');

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
            content:
              `I cannot send the rules panel to ${channel}.\n` +
              `Missing permissions: ${missing.join(', ')}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await channel.send({
          embeds: [buildRulesEmbed(title, text)],
        });

        await interaction.reply({
          content: `✅ Custom rules panel sent to ${channel}.`,
          flags: MessageFlags.Ephemeral,
        });
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
            content:
              `I cannot send the suggestion panel to ${channel}.\n` +
              `Missing permissions: ${missing.join(', ')}`,
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

      if (interaction.commandName === 'suggestion') {
        await interaction.showModal(buildSuggestionModal());
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
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (
        !CONFIG.trelloKey ||
        !CONFIG.trelloToken ||
        !CONFIG.trelloBoardShortlink
      ) {
        await interaction.editReply({
          content:
            'The suggestion system is not configured yet. Please contact an administrator.',
        });
        return;
      }

      const title = safeString(
        interaction.fields.getTextInputValue('title'),
        'No title'
      );
      const category = safeString(
        interaction.fields.getTextInputValue('category'),
        'None'
      );
      const description = safeString(
        interaction.fields.getTextInputValue('description'),
        'No description'
      );

      try {
        const card = await createSuggestionCard({
          title,
          category,
          description,
          user: interaction.user.tag,
          userId: interaction.user.id,
          guild: interaction.guild?.name || 'Unknown',
        });

        try {
          await sendSuggestionLog(
            interaction,
            title,
            category,
            description,
            card.shortUrl
          );
        } catch (logError) {
          console.error('Suggestion log error:', logError);
        }

        await interaction.editReply({
          embeds: [buildSuggestionSuccessEmbed()],
        });
      } catch (error) {
        console.error('Suggestion submit error:', error);
        await interaction.editReply({
          content:
            '❌ Failed to submit the suggestion. Please try again later.',
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
      const channel = await newMember.guild.channels
        .fetch(CONFIG.welcomeChannelId)
        .catch(() => null);

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
