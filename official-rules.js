const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require('discord.js');

const officialRules = require('./official-rules.json');

const DEFAULT_COLOR = 0x5b2a86;

function createOfficialRulesService({
  client,
  dataDir,
  embedColor = DEFAULT_COLOR,
  serverName = 'Project Blackout PvP',
}) {
  const stateFile = path.join(dataDir, 'official-rules-panels.json');
  let activeSync = null;

  function defaultState() {
    return {
      channelId: '',
      messageIds: {},
      updatedAt: null,
    };
  }

  function ensureStateFile() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(stateFile)) {
      fs.writeFileSync(stateFile, JSON.stringify(defaultState(), null, 2), 'utf8');
    }
  }

  function getState() {
    try {
      ensureStateFile();
      const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

      return {
        channelId:
          typeof parsed.channelId === 'string' ? parsed.channelId : '',
        messageIds:
          parsed.messageIds &&
          typeof parsed.messageIds === 'object' &&
          !Array.isArray(parsed.messageIds)
            ? parsed.messageIds
            : {},
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
    } catch (error) {
      console.error('Failed to read official rules panel state:', error);
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      ensureStateFile();
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save official rules panel state:', error);
      return false;
    }
  }

  function buildEmbed(rule, index) {
    return new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(rule.title)
      .setDescription(rule.description)
      .setFooter({
        text: `${serverName} • Official Rules • ${String(index + 1).padStart(2, '0')}/${officialRules.length}`,
      });
  }

  function getMissingPermissions(channel, member) {
    const permissions = channel.permissionsFor(member);

    if (!permissions) {
      return [
        'View Channel',
        'Send Messages',
        'Embed Links',
        'Read Message History',
      ];
    }

    const required = [
      [PermissionsBitField.Flags.ViewChannel, 'View Channel'],
      [PermissionsBitField.Flags.SendMessages, 'Send Messages'],
      [PermissionsBitField.Flags.EmbedLinks, 'Embed Links'],
      [PermissionsBitField.Flags.ReadMessageHistory, 'Read Message History'],
    ];

    return required
      .filter(([permission]) => !permissions.has(permission))
      .map(([, label]) => label);
  }

  async function performSync(channel) {
    if (!channel || !channel.isTextBased() || !channel.guild) {
      throw new Error('Please select a valid server text channel.');
    }

    const member =
      channel.guild.members.me ||
      (await channel.guild.members.fetchMe().catch(() => null));

    if (!member) {
      throw new Error('The bot member could not be loaded for this server.');
    }

    const missingPermissions = getMissingPermissions(channel, member);

    if (missingPermissions.length) {
      throw new Error(
        `Missing channel permissions: ${missingPermissions.join(', ')}`
      );
    }

    const savedState = getState();
    const state = {
      channelId: channel.id,
      messageIds:
        savedState.channelId === channel.id ? { ...savedState.messageIds } : {},
      updatedAt: savedState.updatedAt,
    };

    let created = 0;
    let updated = 0;

    for (let index = 0; index < officialRules.length; index += 1) {
      const rule = officialRules[index];
      const savedMessageId = state.messageIds[rule.key];
      let message = null;

      if (savedMessageId) {
        message = await channel.messages
          .fetch(savedMessageId)
          .catch(() => null);

        if (message && message.author.id !== client.user.id) {
          message = null;
        }
      }

      const payload = {
        embeds: [buildEmbed(rule, index)],
      };

      if (message) {
        const editedMessage = await message.edit(payload).catch(() => null);

        if (editedMessage) {
          message = editedMessage;
          updated += 1;
        } else {
          message = null;
        }
      }

      if (!message) {
        message = await channel.send(payload);
        created += 1;
      }

      state.messageIds[rule.key] = message.id;
      state.updatedAt = new Date().toISOString();

      if (!saveState(state)) {
        throw new Error('The rules panel state could not be saved.');
      }
    }

    return {
      channelId: channel.id,
      created,
      updated,
      total: officialRules.length,
    };
  }

  async function sync(channel) {
    if (activeSync) {
      throw new Error('An official rules sync is already running.');
    }

    activeSync = performSync(channel);

    try {
      return await activeSync;
    } finally {
      activeSync = null;
    }
  }

  async function handleCommand(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: '❌ Please select a valid text channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const result = await sync(channel);

      await interaction.editReply({
        content:
          `✅ Official rules synchronized in <#${result.channelId}>.\n` +
          `Panels: **${result.total}**\n` +
          `Created: **${result.created}**\n` +
          `Updated: **${result.updated}**\n\n` +
          'Running the command again updates these messages instead of creating duplicates.',
      });
    } catch (error) {
      console.error('Official rules sync failed:', error);

      await interaction.editReply({
        content: `❌ Official rules could not be synchronized.\n${error.message}`,
      });
    }
  }

  return {
    handleCommand,
    sync,
  };
}

module.exports = {
  createOfficialRulesService,
};
