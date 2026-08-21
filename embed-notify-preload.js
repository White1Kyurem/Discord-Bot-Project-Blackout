const {
  Client,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionsBitField,
  MessageFlags,
  SlashCommandBuilder,
  ApplicationCommandOptionType,
} = require('discord.js');

const NOTIFY_MODAL_PREFIX = 'custom_embed_notify_modal_';
const DEFAULT_EMBED_COLOR = 0x5b2a86;
const DEFAULT_HEX_COLOR = '#5B2A86';
const PLAYER_NOTIFY_ROLE_ID =
  process.env.EMBED_NOTIFY_ROLE_ID || '1479390268921741343';
const PATCH_FLAG = Symbol.for('project-blackout.embed-notify-preload');

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function parseHexColor(input) {
  const raw = safeString(input, '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return DEFAULT_EMBED_COLOR;
  return parseInt(raw, 16);
}

function buildNotifyEmbedModal(channelId, notifyPlayers) {
  const modal = new ModalBuilder()
    .setCustomId(
      `${NOTIFY_MODAL_PREFIX}${channelId}_${notifyPlayers ? '1' : '0'}`
    )
    .setTitle('Create Custom Embed');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Embed Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('Example: PvP Event Tonight');

  const colorInput = new TextInputBuilder()
    .setCustomId('color')
    .setLabel('Embed Color Hex')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7)
    .setPlaceholder(DEFAULT_HEX_COLOR);

  const textInput = new TextInputBuilder()
    .setCustomId('text')
    .setLabel('Embed Text')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(3000)
    .setPlaceholder('Write your event announcement here...');

  const imageInput = new TextInputBuilder()
    .setCustomId('image')
    .setLabel('Image URL Optional')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('https://example.com/image.png');

  const footerInput = new TextInputBuilder()
    .setCustomId('footer')
    .setLabel('Footer Optional')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder(process.env.SERVER_NAME || 'Project Blackout PVP');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(textInput),
    new ActionRowBuilder().addComponents(imageInput),
    new ActionRowBuilder().addComponents(footerInput)
  );

  return modal;
}

async function getPlayerNotifyRole(guild) {
  if (!guild || !PLAYER_NOTIFY_ROLE_ID) return null;

  return guild.roles.fetch(PLAYER_NOTIFY_ROLE_ID).catch(() => null);
}

function getMissingPermissions(
  channel,
  me,
  notifyPlayers,
  notifyRoleMentionable = false
) {
  const perms = channel.permissionsFor(me);
  if (!perms) {
    return notifyPlayers
      ? [
          'ViewChannel',
          'SendMessages',
          'EmbedLinks',
          'Mention @everyone, @here, and All Roles',
        ]
      : ['ViewChannel', 'SendMessages', 'EmbedLinks'];
  }

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

  if (
    notifyPlayers &&
    !notifyRoleMentionable &&
    !perms.has(PermissionsBitField.Flags.MentionEveryone)
  ) {
    missing.push('Mention @everyone, @here, and All Roles');
  }

  return missing;
}

async function replyWithError(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    await interaction
      .editReply({ content, embeds: [], components: [] })
      .catch(() => null);
    return;
  }

  await interaction
    .reply({ content, flags: MessageFlags.Ephemeral })
    .catch(() => null);
}

async function handleEmbedPanelInteraction(interaction) {
  if (
    interaction.isChatInputCommand?.() &&
    interaction.commandName === 'embedpanel'
  ) {
    const channel = interaction.options.getChannel('channel');
    const notifyPlayers =
      interaction.options.getBoolean('notify_players') ?? false;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: '❌ Please select a valid text channel.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const notifyRole = notifyPlayers
      ? await getPlayerNotifyRole(interaction.guild)
      : null;

    if (notifyPlayers && !notifyRole) {
      await interaction.reply({
        content:
          `❌ The configured player notification role could not be found.\n` +
          `Role ID: ${PLAYER_NOTIFY_ROLE_ID}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const me = interaction.guild?.members?.me;
    const missing = me
      ? getMissingPermissions(
          channel,
          me,
          notifyPlayers,
          notifyRole?.mentionable ?? false
        )
      : ['Unknown'];

    if (missing.length) {
      await interaction.reply({
        content:
          `I cannot send this embed to ${channel}.\n` +
          `Missing permissions: ${missing.join(', ')}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await interaction.showModal(
      buildNotifyEmbedModal(channel.id, notifyPlayers)
    );
    return true;
  }

  if (
    interaction.isModalSubmit?.() &&
    interaction.customId.startsWith(NOTIFY_MODAL_PREFIX)
  ) {
    const payload = interaction.customId.replace(NOTIFY_MODAL_PREFIX, '');
    const separatorIndex = payload.lastIndexOf('_');
    const channelId = payload.slice(0, separatorIndex);
    const notifyPlayers = payload.slice(separatorIndex + 1) === '1';

    const channel = await interaction.guild?.channels
      .fetch(channelId)
      .catch(() => null);

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: '❌ Channel not found.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const notifyRole = notifyPlayers
      ? await getPlayerNotifyRole(interaction.guild)
      : null;

    if (notifyPlayers && !notifyRole) {
      await interaction.reply({
        content:
          `❌ The configured player notification role could not be found.\n` +
          `Role ID: ${PLAYER_NOTIFY_ROLE_ID}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const me = interaction.guild?.members?.me;
    const missing = me
      ? getMissingPermissions(
          channel,
          me,
          notifyPlayers,
          notifyRole?.mentionable ?? false
        )
      : ['Unknown'];

    if (missing.length) {
      await interaction.reply({
        content:
          `I cannot send this embed to ${channel}.\n` +
          `Missing permissions: ${missing.join(', ')}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const title = safeString(
      interaction.fields.getTextInputValue('title'),
      'Announcement'
    );
    const color = safeString(
      interaction.fields.getTextInputValue('color'),
      DEFAULT_HEX_COLOR
    );
    const text = safeString(
      interaction.fields.getTextInputValue('text'),
      'No text provided.'
    );
    const image = safeString(
      interaction.fields.getTextInputValue('image'),
      ''
    );
    const footer = safeString(
      interaction.fields.getTextInputValue('footer'),
      process.env.SERVER_NAME || 'Project Blackout PVP'
    );

    const embed = new EmbedBuilder()
      .setColor(parseHexColor(color))
      .setTitle(title)
      .setDescription(text)
      .setFooter({ text: footer })
      .setTimestamp();

    if (image.startsWith('http://') || image.startsWith('https://')) {
      embed.setImage(image);
    }

    const messagePayload = { embeds: [embed] };

    if (notifyPlayers) {
      messagePayload.content = `<@&${PLAYER_NOTIFY_ROLE_ID}>`;
      messagePayload.allowedMentions = {
        parse: [],
        roles: [PLAYER_NOTIFY_ROLE_ID],
      };
    }

    await channel.send(messagePayload);

    await interaction.reply({
      content:
        `✅ Custom embed sent to ${channel}.\n` +
        `🔔 Player notification: **${
          notifyPlayers ? `Enabled (<@&${PLAYER_NOTIFY_ROLE_ID}>)` : 'Disabled'
        }**`,
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral,
    });

    return true;
  }

  return false;
}

if (!globalThis[PATCH_FLAG]) {
  globalThis[PATCH_FLAG] = true;

  const originalToJSON = SlashCommandBuilder.prototype.toJSON;

  SlashCommandBuilder.prototype.toJSON = function patchedToJSON(...args) {
    const json = originalToJSON.apply(this, args);

    if (
      json?.name === 'embedpanel' &&
      !json.options?.some(option => option.name === 'notify_players')
    ) {
      json.options = [
        ...(json.options || []),
        {
          type: ApplicationCommandOptionType.Boolean,
          name: 'notify_players',
          description: 'Ping the configured player role when the embed is sent',
          required: false,
        },
      ];
    }

    return json;
  };

  const originalOn = Client.prototype.on;

  Client.prototype.on = function patchedOn(eventName, listener) {
    if (eventName !== Events.InteractionCreate) {
      return originalOn.call(this, eventName, listener);
    }

    const wrappedListener = async interaction => {
      try {
        if (await handleEmbedPanelInteraction(interaction)) {
          return;
        }
      } catch (error) {
        console.error('Embed notification handler error:', error);
        await replyWithError(
          interaction,
          '❌ Something went wrong while sending the custom embed.'
        );
        return;
      }

      return listener(interaction);
    };

    return originalOn.call(this, eventName, wrappedListener);
  };
}
