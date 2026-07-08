const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');

const DEFAULT_SERVER_INFO = {
  serverName: 'Project Blackout PVP',
  ipAddress: '208.115.251.67',
  gamePort: '2491',
  map: 'ChernarusPlus',
  slots: '40',
  perspective: 'First Person Only',
  maxGroupSize: '4 Players',
  groupSizeNote:
    'The group limit includes all online and offline members. Alliances are not permitted.',
  language: 'English',
  platform: 'PC',
  raidTimes: '24/7',
  serverRegion: 'Europe',
  timeZone: 'Europe/Zurich',
  restartTimes: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  features: [
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
  ],
  channels: {
    rules: '1479225004607406190',
    support: '1479481269942226984',
    tickets: '1479479331393634404',
    announcements: '1479495228527214724',
    status: '',
  },
  panel: {
    guildId: '',
    channelId: '',
    messageId: '',
  },
};

function cloneDefaultServerInfo() {
  return JSON.parse(JSON.stringify(DEFAULT_SERVER_INFO));
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function mergeServerInfoData(parsed = {}) {
  const defaults = cloneDefaultServerInfo();

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
      ...defaults.channels,
      ...(parsed.channels || {}),
    },
    panel: {
      ...defaults.panel,
      ...(parsed.panel || {}),
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
        JSON.stringify(cloneDefaultServerInfo(), null, 2),
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
      return cloneDefaultServerInfo();
    }
  }

  function saveData(data) {
    try {
      ensureFile();
      const normalized = mergeServerInfoData(data);
      fs.writeFileSync(
        serverInfoFile,
        JSON.stringify(normalized, null, 2),
        'utf8'
      );
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

    if (!values.length) {
      return null;
    }

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
      : DEFAULT_SERVER_INFO.timeZone;
    const now = DateTime.now().setZone(zone);
    const restartTimes = Array.isArray(data.restartTimes)
      ? data.restartTimes
      : DEFAULT_SERVER_INFO.restartTimes;

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
      'The server restarts every four hours.',
      '',
      timestamps.join(' • '),
      '',
      '*Restart times are automatically displayed in your local time zone.*',
    ].join('\n');
  }

  function formatChannelLine(label, channelId) {
    if (!safeString(channelId)) return null;
    return `**${label}:** <#${channelId}>`;
  }

  function buildEmbeds(data = getData()) {
    const directConnect = `${safeString(data.ipAddress, 'Not configured')}:${safeString(
      data.gamePort,
      'Not configured'
    )}`;

    const connection = [
      `**Server Name:** ${safeString(data.serverName, DEFAULT_SERVER_INFO.serverName)}`,
      `**IP Address:** \`${safeString(data.ipAddress, 'Not configured')}\``,
      `**Game Port:** \`${safeString(data.gamePort, 'Not configured')}\``,
      `**Direct Connect:** \`${directConnect}\``,
    ].join('\n');

    const details = [
      `**Map:** ${safeString(data.map, 'Not configured')}`,
      `**Slots:** ${safeString(data.slots, 'Not configured')} Players`,
      `**Perspective:** ${safeString(data.perspective, 'Not configured')}`,
      `**Language:** ${safeString(data.language, 'Not configured')}`,
      `**Platform:** ${safeString(data.platform, 'PC')}`,
      `**Region:** ${safeString(data.serverRegion, 'Europe')}`,
    ].join('\n');

    const groupAndRaid = [
      `**Maximum Group Size:** ${safeString(data.maxGroupSize, 'Not configured')}`,
      safeString(data.groupSizeNote),
      '',
      `**Raiding:** ${safeString(data.raidTimes, 'Not configured')}`,
    ]
      .filter((line, index, array) => line || (index > 0 && array[index - 1]))
      .join('\n');

    const featureLines = (Array.isArray(data.features) ? data.features : [])
      .map(feature => safeString(feature))
      .filter(Boolean)
      .slice(0, 25)
      .map(feature => `• ${feature}`)
      .join('\n');

    const channelLines = [
      formatChannelLine('Server Rules', data.channels?.rules),
      formatChannelLine('Support', data.channels?.support),
      formatChannelLine('Tickets', data.channels?.tickets),
      formatChannelLine('Announcements', data.channels?.announcements),
      formatChannelLine('Server Status', data.channels?.status),
    ]
      .filter(Boolean)
      .join('\n');

    const howToJoin = [
      `**DZSA Launcher:** Search for **${safeString(data.serverName, DEFAULT_SERVER_INFO.serverName)}**, select the server and press **Play**.`,
      `**Official DayZ Launcher:** Open **Servers → Community**, search for **${safeString(data.serverName, DEFAULT_SERVER_INFO.serverName)}**, then select **Setup DLCs and Mods and Join**.`,
      `**Direct Connect:** Use \`${directConnect}\`.`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(
        `${safeString(data.serverName, DEFAULT_SERVER_INFO.serverName).toUpperCase()} — SERVER INFORMATION`
      )
      .setDescription(
        'Everything you need to connect to the server and start playing.'
      )
      .addFields(
        { name: '🔌 SERVER CONNECTION', value: connection, inline: false },
        { name: '🌍 SERVER DETAILS', value: details, inline: true },
        { name: '👥 GROUP & RAID INFORMATION', value: groupAndRaid, inline: true },
        { name: '🔄 SERVER RESTARTS', value: buildRestartText(data), inline: false },
        {
          name: '✨ SERVER FEATURES',
          value: featureLines || 'No features configured.',
          inline: false,
        },
        {
          name: '🔗 IMPORTANT CHANNELS',
          value: channelLines || 'No channels configured.',
          inline: false,
        },
        { name: '🚀 HOW TO JOIN', value: howToJoin, inline: false }
      )
      .setFooter({
        text: `Restart schedule: ${safeString(
          data.timeZone,
          DEFAULT_SERVER_INFO.timeZone
        )}`,
      })
      .setTimestamp();

    return [embed];
  }

  async function fetchPanelMessage(data = getData()) {
    const channelId = safeString(data.panel?.channelId);
    const messageId = safeString(data.panel?.messageId);

    if (!channelId || !messageId) return null;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return null;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message || message.author.id !== client.user.id) return null;

    return message;
  }

  async function refreshPanel(data = getData()) {
    const message = await fetchPanelMessage(data);
    if (!message) return false;

    await message.edit({ embeds: buildEmbeds(data) });
    return true;
  }

  async function setupPanel({ guildId, channel }) {
    const data = getData();
    let message = await fetchPanelMessage(data);

    if (message && message.channelId === channel.id) {
      await message.edit({ embeds: buildEmbeds(data) });
    } else {
      message = await channel.send({ embeds: buildEmbeds(data) });
    }

    data.panel = {
      guildId,
      channelId: channel.id,
      messageId: message.id,
    };

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
      : DEFAULT_SERVER_INFO.timeZone;
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
      await refreshPanel();
    } catch (error) {
      console.error('[Server Info] Initial refresh failed:', error);
    }

    scheduleNextUpdate();
  }

  return {
    file: serverInfoFile,
    ensureFile,
    getData,
    saveData,
    buildEmbeds,
    setupPanel,
    refreshPanel,
    startScheduler,
    normalizeRestartTimes,
    isValidTimeZone,
  };
}

module.exports = {
  createServerInfoService,
};
