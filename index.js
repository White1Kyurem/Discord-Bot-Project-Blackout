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
  TRELLO_BOARD_URL = 'https://trello.com/b/VmxUfjSm',
  LOG_CHANNEL_ID,
  WELCOME_CHANNEL_ID,
  VERIFIED_ROLE_ID,
  WELCOME_IMAGE_URL = 'https://raw.githubusercontent.com/White1Kyurem/Discord-Bot-Project-Blackout/main/ChatGPT%20Image%2031.%20M%C3%A4rz%202026%2C%2019_16_34.png',
} = process.env;

const PANEL_BUTTON_ID = 'open_suggestion_modal';
const SUGGESTION_MODAL_ID = 'suggestion_modal';
const RULES_FILE = path.join(__dirname, 'rules.json');

function safe(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function getRulesData() {
  try {
    if (!fs.existsSync(RULES_FILE)) {
      return {
        title: 'Server Rules',
        text:
          '1. Respect all players.\n' +
          '2. No cheating or exploiting.\n' +
          '3. No abusive language.\n' +
          '4. Follow staff instructions.\n' +
          '5. Have fun.',
      };
    }

    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  } catch (error) {
    console.error('Failed to read rules file:', error);
    return {
      title: 'Server Rules',
      text:
        '1. Respect all players.\n' +
        '2. No cheating or exploiting.\n' +
        '3. No abusive language.\n' +
        '4. Follow staff instructions.\n' +
        '5. Have fun.',
    };
  }
}

function saveRulesData(data) {
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save rules file:', error);
  }
}

function buildRulesEmbed() {
  const rules = getRulesData();

  return new EmbedBuilder()
    .setColor(0x111111)
    .setTitle(`📜 ${rules.title}`)
    .setDescription(rules.text)
    .setFooter({ text: 'Project Blackout PVP • Server Rules' });
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

      if (interaction.commandName === 'rulespanel' || interaction.commandName === 'serverrules') {
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
              `I cannot send the rules panel in this channel.\n` +
              `Missing permissions: ${missing.join(', ')}`,
            ephemeral: true,
          });
          return;
        }

        await channel.send({ embeds: [buildRulesEmbed()] });
        await interaction.reply({
          content: 'Rules panel sent.',
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'setrules' || interaction.commandName === 'setserverrules') {
        await interaction.deferReply({ ephemeral: true });

        try {
          const title = interaction.options.getString('title') || 'Server Rules';
          const text = interaction.options.getString('text');

          saveRulesData({
            title,
            text,
          });

          await interaction.editReply({
            content: 'Rules updated successfully.',
          });
        } catch (error) {
          console.error('Set rules error:', error);
          await interaction.editReply({
            content: 'Failed to update the rules.',
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
