const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const DEFAULT_RESTART_TIMES = [
  '00:00',
  '04:00',
  '08:00',
  '12:00',
  '16:00',
  '20:00',
];

const DEFAULT_FEATURES = [
  'Fast-paced PVP economy',
  'Safezone Traders',
  'Full-PVP Black Market',
  'King of the Hill events',
  'Keycard Rooms',
  'Hacked Crate events',
  'Airdrops',
  'Helicopters',
  'Custom Vehicles',
  'BaseBuildingPlus',
  'Custom Weapons and Equipment',
  'Custom Locations',
  '24/7 Raiding',
  'Maximum group size of four players',
  'Active Administration',
];

function envString(name, fallback = '') {
  const value = process.env[name];
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function envList(name, fallback, separatorPattern) {
  const raw = envString(name);
  if (!raw) return [...fallback];

  const values = raw
    .split(separatorPattern)
    .map(value => value.trim())
    .filter(Boolean);

  return values.length ? values : [...fallback];
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function createDefaultServerInfo() {
  return {
    serverName: envString(
      'DAYZ_SERVER_NAME',
      envString('SERVER_NAME', 'Project Blackout PVP')
    ),
    ipAddress: envString('DAYZ_SERVER_IP', '208.115.251.67'),
    gamePort: envString('DAYZ_SERVER_PORT', '2491'),
    map: envString('DAYZ_SERVER_MAP', 'ChernarusPlus'),
    slots: envString('DAYZ_SERVER_SLOTS', '40'),
    perspective: envString('DAYZ_SERVER_PERSPECTIVE', 'First Person Only'),
    maxGroupSize: envString('DAYZ_MAX_GROUP_SIZE', '4 Players'),
    groupSizeNote: envString(
      'DAYZ_GROUP_SIZE_NOTE',
      'The group limit includes all online and offline members. Alliances are not permitted.'
    ),
    language: envString('DAYZ_SERVER_LANGUAGE', 'English'),
    platform: envString('DAYZ_SERVER_PLATFORM', 'PC'),
    raidTimes: envString('DAYZ_RAID_TIMES', '24/7'),
    serverRegion: envString('DAYZ_SERVER_REGION', 'Europe'),
    timeZone: envString('DAYZ_SERVER_TIME_ZONE', 'Europe/Zurich'),
    restartTimes: envList(
      'DAYZ_RESTART_TIMES',
      DEFAULT_RESTART_TIMES,
      /[;,|]+/
    ),
    features: envList('DAYZ_SERVER_FEATURES', DEFAULT_FEATURES, /\|+/),
    channels: {
      rules: envString(
        'SERVER_INFO_RULES_CHANNEL_ID',
        envString('SERVER_RULES_CHANNEL_ID', '1479225004607406190')
      ),
      support: envString(
        'SERVER_INFO_SUPPORT_CHANNEL_ID',
        '1479481269942226984'
      ),
      tickets: envString(
        'SERVER_INFO_TICKETS_CHANNEL_ID',
        '1479479331393634404'
      ),
      announcements: envString(
        'SERVER_INFO_ANNOUNCEMENTS_CHANNEL_ID',
        '1479495228527214724'
      ),
      status: envString('SERVER_INFO_STATUS_CHANNEL_ID'),
    },
    panel: {
      guildId: envString('GUILD_ID'),
      channelId: envString('SERVER_INFO_CHANNEL_ID'),
      messageId: envString('SERVER_INFO_MESSAGE_ID'),
    },
  };
}

function mergeServerInfoData(parsed = {}) {
  const defaults = createDefaultServerInfo();

  return {
    ...defaults,
    ...parsed,
    restartTimes:
      Array.isArray(parsed.restartTimes) && parsed.restartTimes.length
        ? parsed.restartTimes
        : defaults.restartTimes,
    features:
      Array.isArray(parsed.features) && parsed.features.length
        ? parsed.features
        : defaults.features,
    channels: {
      rules: safeString(parsed.channels?.rules, defaults.channels.rules),
      support: safeString(parsed.channels?.support, defaults.channels.support),
      tickets: safeString(parsed.channels?.tickets, defaults.channels.tickets),
      announcements: safeString(
        parsed.channels?.announcements,
        defaults.channels.announcements
      ),
      status: safeString(parsed.channels?.status, defaults.channels.status),
    },
    panel: {
      guildId: safeString(parsed.panel?.guildId, defaults.panel.guildId),
      channelId: safeString(parsed.panel?.channelId, defaults.panel.channelId),
      messageId: safeString(parsed.panel?.messageId, defaults.panel.messageId),
    },
  };
}

function createServerInfoService({ client, dataDir, embedColor = 0x5b2a86 }) {
  const serverInfoFile = path.join(dataDir, 'server-info.json');
  let updateTimer = null;

  function ensureFile() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(serverInfoFile)) {
      fs.writeFileSync(
        serverInfoFile,
        JSON.stringify(createDefaultServerInfo(), null, 2),
        'utf8'
      );
    }
  }

  function getData() {
    try {
      ensureFile();
      const raw = fs.readFileSync(serverInfoFile, 'utf8');
      return mergeServerInfoData(JSON.parse(raw));
    } catch (error) {
      console.error('Failed to read server info file:', error);
      return createDefaultServerInfo();
    }
  }

  function saveData(data) {
    try {
      ensureFile();
      const normalized = mergeServerInfoData(data);
      const temporaryFile = `${serverInfoFile}.tmp`;

      fs.writeFileSync(
        temporaryFile,
        JSON.stringify(normalized, null, 2),
        'utf8'
      );
      fs.renameSync(temporaryFile, serverInfoFile);

      return normalized;
    } catch (error) {
      console.error('Failed to save server info file:', error);
      return null;
    }
  }

  function isValidTimeZone(timeZone) {
    return DateTime.now().setZone(timeZone).isValid;
  }

  function normalizeRestartTimes(input) {
    const values = safeString(input)
      .split(/[;,|]+/)
      .map(value => value.trim())
      .filter(Boolean);

    if (!values.length) return null;

    const parsed = [];

    for (const value of values) {
      const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!match) return null;

      const hour = Number(match[1]);
      const minute = Number(match[2]);

      parsed.push({
        value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        minutes: hour * 60 + minute,
      });
    }

    return [...new Map(parsed.map(item => [item.value, item])).values()]
      .sort((a, b) => a.minutes - b.minutes)
      .map(item => item.value);
  }

  function buildRestartText(data) {
    const zone = isValidTimeZone(data.timeZone)
      ? data.timeZone
      : 'Europe/Zurich';
    const now = DateTime.now().setZone(zone);
    const restartTimes = Array.isArray(data.restartTimes)
      ? data.restartTimes
      : DEFAULT_RESTART_TIMES;

    const timestamps = restartTimes
      .map(value => {
        const match = String(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) return null;

        const restart = now.startOf('day').set({
          hour: Number(match[1]),
          minute: Number(match[2]),
          second: 0,
          millisecond: 0,
        });

        return `<t:${Math.floor(restart.toSeconds())}:t>`;
      })
      .filter(Boolean);

    return [
      '**Every four hours** • automatically displayed in your local time zone',
      '',
      `> ${timestamps.join('  •  ')}`,
    ].join('\n');
  }

  function formatChannelLine(label, channelId) {
    const normalizedId = safeString(channelId);
    return normalizedId ? `**${label}:** <#${normalizedId}>` : null;
  }

  function buildEmbeds(data = getData()) {
    const serverName = safeString(data.serverName, 'Project Blackout PVP');
    const ipAddress = safeString(data.ipAddress, 'Not configured');
    const gamePort = safeString(data.gamePort, 'Not configured');
    const directConnect = `${ipAddress}:${gamePort}`;
    const features = (Array.isArray(data.features) ? data.features : [])
      .map(feature => safeString(feature))
      .filter(Boolean)
      .slice(0, 24);
    const featureSplit = Math.ceil(features.length / 2);
    const firstFeatureColumn = features
      .slice(0, featureSplit)
      .map(feature => `› ${feature}`)
      .join('\n');
    const secondFeatureColumn = features
      .slice(featureSplit)
      .map(feature => `› ${feature}`)
      .join('\n');

    const joinEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`⚔️ ${serverName.toUpperCase()}`)
      .setDescription(
        [
          '### JOIN THE SERVER',
          '```text',
          directConnect,
          '```',
          `**${safeString(data.map, 'Unknown Map')}**  •  ` +
            `**${safeString(data.slots, '?')} Slots**  •  ` +
            `**${safeString(data.perspective, 'Unknown Perspective')}**  •  ` +
            `**${safeString(data.raidTimes, 'Unknown Raid Times')} Raiding**`,
        ].join('\n')
      )
      .addFields(
        {
          name: '🌐 IP ADDRESS',
          value: `\`${ipAddress}\``,
          inline: true,
        },
        {
          name: '🔌 GAME PORT',
          value: `\`${gamePort}\``,
          inline: true,
        },
        {
          name: '👥 MAX GROUP',
          value: `**${safeString(data.maxGroupSize, 'Not configured')}**`,
          inline: true,
        }
      );

    const overviewEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('📊 SERVER OVERVIEW')
      .setDescription(
        'Fast-paced, first-person DayZ PVP with custom content, events and progression.'
      )
      .addFields(
        {
          name: '🗺️ SERVER DETAILS',
          value: [
            `**Map:** ${safeString(data.map, 'Not configured')}`,
            `**Platform:** ${safeString(data.platform, 'PC')}`,
            `**Language:** ${safeString(data.language, 'Not configured')}`,
            `**Region:** ${safeString(data.serverRegion, 'Europe')}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🛡️ GROUP & RAID RULES',
          value: [
            `**Group Limit:** ${safeString(data.maxGroupSize, 'Not configured')}`,
            safeString(data.groupSizeNote),
            `**Raiding:** ${safeString(data.raidTimes, 'Not configured')}`,
          ]
            .filter(Boolean)
            .join('\n'),
          inline: true,
        },
        {
          name: '🕒 DAILY RESTART SCHEDULE',
          value: buildRestartText(data),
          inline: false,
        },
        {
          name: '🚀 HOW TO JOIN',
          value: [
            `**1. DZSA Launcher:** Search for **${serverName}** and press **Play**.`,
            `**2. Official Launcher:** Open **Servers → Community**, search for **${serverName}**, then choose **Setup DLCs and Mods and Join**.`,
            `**3. Direct Connect:** Enter \`${directConnect}\`.`,
          ].join('\n'),
          inline: false,
        }
      );

    const featuresEmbed = new EmbedBuilder()
      .setColor(0x6d28d9)
      .setTitle('✨ SERVER HIGHLIGHTS')
      .addFields(
        {
          name: '🔥 GAMEPLAY & EVENTS',
          value: firstFeatureColumn || 'No features configured.',
          inline: true,
        },
        {
          name: '🧰 CUSTOM CONTENT',
          value: secondFeatureColumn || 'More features coming soon.',
          inline: true,
        }
      )
      .setFooter({
        text: `Project Blackout PVP • Restart timezone: ${safeString(
          data.timeZone,
          'Europe/Zurich'
        )}`,
      })
      .setTimestamp();

    return [joinEmbed, overviewEmbed, featuresEmbed];
  }

  function buildComponents(data = getData()) {
    const guildId = safeString(data.panel?.guildId);
    if (!guildId) return [];

    const definitions = [
      ['Rules', '📜', data.channels?.rules],
      ['Support', '🛟', data.channels?.support],
      ['Tickets', '🎫', data.channels?.tickets],
      ['Announcements', '📢', data.channels?.announcements],
      ['Server Status', '📡', data.channels?.status],
    ];

    const buttons = definitions
      .filter(([, , channelId]) => safeString(channelId))
      .slice(0, 5)
      .map(([label, emoji, channelId]) =>
        new ButtonBuilder()
          .setLabel(label)
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
      );

    if (!buttons.length) return [];

    return [new ActionRowBuilder().addComponents(buttons)];
  }

  function buildMessagePayload(data = getData()) {
    return {
      embeds: buildEmbeds(data),
      components: buildComponents(data),
    };
  }

  async function fetchPanelMessage(data = getData()) {
    const channelId = safeString(data.panel?.channelId);
    const messageId = safeString(data.panel?.messageId);

    if (!channelId || !messageId || !client.user) return null;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return null;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message || message.author.id !== client.user.id) return null;

    return message;
  }

  async function refreshPanel(data = getData()) {
    const message = await fetchPanelMessage(data);
    if (!message) return false;

    await message.edit(buildMessagePayload(data));
    return true;
  }

  async function setupPanel({ guildId, channel }) {
    const data = getData();
    let message = await fetchPanelMessage(data);

    data.panel = {
      guildId: safeString(guildId, channel.guildId || ''),
      channelId: channel.id,
      messageId: safeString(message?.id),
    };

    if (message && message.channelId === channel.id) {
      await message.edit(buildMessagePayload(data));
    } else {
      message = await channel.send(buildMessagePayload(data));
    }

    data.panel.messageId = message.id;

    const saved = saveData(data);
    if (!saved) {
      throw new Error('The server info panel settings could not be saved.');
    }

    return message;
  }

  function getNextUpdateDelay() {
    const data = getData();
    const zone = isValidTimeZone(data.timeZone)
      ? data.timeZone
      : 'Europe/Zurich';
    const now = DateTime.now().setZone(zone);
    let next = now.set({ hour: 0, minute: 5, second: 0, millisecond: 0 });

    if (next <= now) {
      next = next.plus({ days: 1 });
    }

    return Math.max(1000, next.toMillis() - now.toMillis());
  }

  function scheduleNextUpdate() {
    if (updateTimer) clearTimeout(updateTimer);

    updateTimer = setTimeout(async () => {
      try {
        const updated = await refreshPanel();
        if (updated) {
          console.log('[Server Info] Restart timestamps updated.');
        }
      } catch (error) {
        console.error('[Server Info] Automatic refresh failed:', error);
      } finally {
        scheduleNextUpdate();
      }
    }, getNextUpdateDelay());

    if (typeof updateTimer.unref === 'function') {
      updateTimer.unref();
    }
  }

  async function startScheduler() {
    ensureFile();

    try {
      const data = getData();
      const refreshed = await refreshPanel(data);

      if (!refreshed && safeString(data.panel?.channelId)) {
        const channel = await client.channels
          .fetch(data.panel.channelId)
          .catch(() => null);

        if (channel && channel.isTextBased()) {
          const message = await setupPanel({
            guildId: safeString(data.panel.guildId, channel.guildId || ''),
            channel,
          });

          console.log(
            `[Server Info] Panel created automatically in channel ${channel.id} ` +
              `(message ${message.id}).`
          );
        } else {
          console.error(
            '[Server Info] SERVER_INFO_CHANNEL_ID is configured, but the channel could not be found or is not text-based.'
          );
        }
      }
    } catch (error) {
      console.error('[Server Info] Initial refresh/setup failed:', error);
    }

    scheduleNextUpdate();
  }

  function hasManageGuildPermission(interaction) {
    return Boolean(
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    );
  }

  function getMissingPanelPermissions(channel, guildMember) {
    if (!guildMember || typeof channel.permissionsFor !== 'function') {
      return ['Unable to check bot permissions'];
    }

    const permissions = channel.permissionsFor(guildMember);
    if (!permissions) return ['Unable to check bot permissions'];

    const required = [
      ['View Channel', PermissionFlagsBits.ViewChannel],
      ['Send Messages', PermissionFlagsBits.SendMessages],
      ['Embed Links', PermissionFlagsBits.EmbedLinks],
      ['Read Message History', PermissionFlagsBits.ReadMessageHistory],
    ];

    return required
      .filter(([, permission]) => !permissions.has(permission))
      .map(([label]) => label);
  }

  async function handleCommand(interaction) {
    if (!hasManageGuildPermission(interaction)) {
      await interaction.reply({
        content: '❌ You need the **Manage Server** permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel');

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: '❌ Please select a valid text channel.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const missingPermissions = getMissingPanelPermissions(
        channel,
        interaction.guild?.members?.me
      );

      if (missingPermissions.length) {
        await interaction.reply({
          content:
            `❌ I cannot send the server info panel to ${channel}.\n` +
            `Missing permissions: ${missingPermissions.join(', ')}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const message = await setupPanel({
        guildId: interaction.guildId,
        channel,
      });

      await interaction.editReply({
        content:
          `✅ Server info panel created or updated in ${channel}.\n` +
          `[Open the server info message](${message.url})`,
      });
      return;
    }

    if (subcommand === 'edit') {
      const setting = interaction.options.getString('setting', true);
      const value = interaction.options.getString('value', true).trim();

      const settingMap = {
        server_name: 'serverName',
        ip_address: 'ipAddress',
        game_port: 'gamePort',
        map: 'map',
        slots: 'slots',
        perspective: 'perspective',
        max_group_size: 'maxGroupSize',
        group_size_note: 'groupSizeNote',
        language: 'language',
        platform: 'platform',
        raid_times: 'raidTimes',
        server_region: 'serverRegion',
        time_zone: 'timeZone',
      };

      const maximumLengths = {
        server_name: 100,
        ip_address: 255,
        game_port: 5,
        map: 100,
        slots: 4,
        perspective: 100,
        max_group_size: 100,
        group_size_note: 700,
        language: 50,
        platform: 50,
        raid_times: 100,
        server_region: 100,
        time_zone: 100,
      };

      const dataKey = settingMap[setting];

      if (!dataKey || !value) {
        await interaction.reply({
          content: '❌ The setting or new value is invalid.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (value.length > maximumLengths[setting]) {
        await interaction.reply({
          content: `❌ This value can contain a maximum of ${maximumLengths[setting]} characters.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (setting === 'ip_address' && /\s/.test(value)) {
        await interaction.reply({
          content: '❌ The IP address or hostname cannot contain spaces.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (setting === 'game_port') {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          await interaction.reply({
            content: '❌ Please enter a valid port between 1 and 65535.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      if (setting === 'slots') {
        const slots = Number(value);
        if (!Number.isInteger(slots) || slots < 1 || slots > 1000) {
          await interaction.reply({
            content: '❌ Please enter a valid slot count.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      if (setting === 'time_zone' && !isValidTimeZone(value)) {
        await interaction.reply({
          content:
            '❌ Please enter a valid IANA time zone, for example `Europe/Zurich`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = getData();
      data[dataKey] = value;
      const saved = saveData(data);

      if (!saved) {
        await interaction.reply({
          content: '❌ The server information could not be saved.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const refreshed = await refreshPanel(saved);

      await interaction.reply({
        content:
          `✅ **${setting.replaceAll('_', ' ')}** was updated to \`${value}\`.` +
          (refreshed
            ? '\nThe server info panel was updated immediately.'
            : '\nThe value was saved. Run `/serverinfo setup` to create the panel.'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'links') {
      const selectedChannels = {
        rules: interaction.options.getChannel('rules'),
        support: interaction.options.getChannel('support'),
        tickets: interaction.options.getChannel('tickets'),
        announcements: interaction.options.getChannel('announcements'),
        status: interaction.options.getChannel('status'),
      };

      const changes = Object.entries(selectedChannels).filter(
        ([, channel]) => channel
      );

      if (!changes.length) {
        await interaction.reply({
          content: '❌ Select at least one channel to update.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = getData();
      for (const [key, channel] of changes) {
        data.channels[key] = channel.id;
      }

      const saved = saveData(data);
      if (!saved) {
        await interaction.reply({
          content: '❌ The channel links could not be saved.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const refreshed = await refreshPanel(saved);
      const changedList = changes
        .map(([key, channel]) => `**${key}:** ${channel}`)
        .join('\n');

      await interaction.reply({
        content:
          `✅ Server info channel links updated:\n${changedList}` +
          (refreshed
            ? '\n\nThe server info panel was updated immediately.'
            : '\n\nRun `/serverinfo setup` to create the panel.'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'features') {
      const rawFeatures = interaction.options.getString('list', true);
      const features = rawFeatures
        .split('|')
        .map(feature => feature.trim())
        .filter(Boolean);

      if (!features.length || features.length > 25) {
        await interaction.reply({
          content:
            '❌ Enter between 1 and 25 features and separate them with `|`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const renderedLength = features.map(feature => `• ${feature}`).join('\n').length;
      if (renderedLength > 1024) {
        await interaction.reply({
          content:
            '❌ The complete feature list is too long for a Discord embed. Please shorten it.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = getData();
      data.features = features;
      const saved = saveData(data);

      if (!saved) {
        await interaction.reply({
          content: '❌ The features could not be saved.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const refreshed = await refreshPanel(saved);
      await interaction.reply({
        content:
          `✅ Saved **${features.length}** server features.` +
          (refreshed
            ? '\nThe server info panel was updated immediately.'
            : '\nRun `/serverinfo setup` to create the panel.'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'restarts') {
      const input = interaction.options.getString('times', true);
      const restartTimes = normalizeRestartTimes(input);

      if (!restartTimes) {
        await interaction.reply({
          content:
            '❌ Use 24-hour times separated by commas, for example `00:00, 04:00, 08:00, 12:00, 16:00, 20:00`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const data = getData();
      data.restartTimes = restartTimes;
      const saved = saveData(data);

      if (!saved) {
        await interaction.reply({
          content: '❌ The restart times could not be saved.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const refreshed = await refreshPanel(saved);
      await interaction.reply({
        content:
          `✅ Restart times updated: \`${restartTimes.join(', ')}\`` +
          (refreshed
            ? '\nThe local-time timestamps were refreshed immediately.'
            : '\nRun `/serverinfo setup` to create the panel.'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'refresh') {
      const refreshed = await refreshPanel();

      await interaction.reply({
        content: refreshed
          ? '✅ The server info panel and local restart timestamps were refreshed.'
          : '❌ No saved server info panel was found. Run `/serverinfo setup` first.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  return {
    file: serverInfoFile,
    ensureFile,
    getData,
    saveData,
    buildEmbeds,
    buildComponents,
    buildMessagePayload,
    setupPanel,
    refreshPanel,
    startScheduler,
    normalizeRestartTimes,
    isValidTimeZone,
    handleCommand,
  };
}

module.exports = {
  createServerInfoService,
};
