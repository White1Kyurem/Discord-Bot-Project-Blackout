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

const REQUIRED_ENV = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'TRELLO_KEY',
  'TRELLO_TOKEN',
  'TRELLO_BOARD_SHORTLINK',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Fehlende Umgebungsvariable: ${key}`);
    process.exit(1);
  }
}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD_SHORTLINK = process.env.TRELLO_BOARD_SHORTLINK;
const TRELLO_TARGET_LIST_NAME = process.env.TRELLO_TARGET_LIST_NAME || 'Suggestions';

const PANEL_BUTTON_ID = 'open_idea_ticket_modal';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function registerGuildCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    {
      name: 'ticketpanel',
      description: 'Sendet das Idea Ticket-Panel mit Button in den aktuellen Kanal',
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: 'idee',
      description: 'Öffnet direkt das Ideen-Formular',
    },
  ];

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands },
  );
}

async function getBoardLists() {
  const response = await axios.get(
    `https://api.trello.com/1/boards/${encodeURIComponent(TRELLO_BOARD_SHORTLINK)}/lists`,
    {
      params: {
        key: TRELLO_KEY,
        token: TRELLO_TOKEN,
        fields: 'name,id,closed,pos',
        filter: 'open',
      },
    },
  );

  return response.data;
}

async function findTargetListId() {
  const lists = await getBoardLists();

  const exact = lists.find(
    (list) => list.name.trim().toLowerCase() === TRELLO_TARGET_LIST_NAME.trim().toLowerCase(),
  );

  if (exact) return exact.id;

  const availableLists = lists.map((list) => `"${list.name}"`).join(', ');
  throw new Error(
    `Trello-Liste "${TRELLO_TARGET_LIST_NAME}" nicht gefunden. Vorhandene Listen: ${availableLists}`,
  );
}

async function createTrelloCard({ title, category, description, discordUserTag, discordUserId, guildName }) {
  const targetListId = await findTargetListId();

  const cardDescription = [
    `Eingereicht von: ${discordUserTag}`,
    `Discord User ID: ${discordUserId}`,
    guildName ? `Discord Server: ${guildName}` : null,
    category ? `Category: ${category}` : null,
    '',
    'Idea:',
    description,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await axios.post('https://api.trello.com/1/cards', null, {
    params: {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      idList: targetListId,
      name: title,
      desc: cardDescription,
      pos: 'top',
    },
  });

  return response.data;
}

async function sendLogMessage(guild) {
  const logChannelId = process.env.LOG_CHANNEL_ID;

  if (!logChannelId || !guild) return;

  const channel = await guild.channels.fetch(logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('New Suggestion')
    .setDescription('A new suggestion has been created in the Trello board.');

  await channel.send({ embeds: [embed] });
}

function buildIdeaModal() {
  const modal = new ModalBuilder()
    .setCustomId('idee_modal')
    .setTitle('Submit Idea');

  const titleInput = new TextInputBuilder()
    .setCustomId('idee_titel')
    .setLabel('Idea Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(100)
    .setPlaceholder('z. B. Neue Quest für Anfänger');

  const categoryInput = new TextInputBuilder()
    .setCustomId('idee_kategorie')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(50)
    .setPlaceholder('z. B. Quest, Event, Item, Map');

  const descriptionInput = new TextInputBuilder()
    .setCustomId('idee_beschreibung')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1500)
    .setPlaceholder('Beschreibe deine Idee möglichst genau.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(descriptionInput),
  );

  return modal;
}

function buildPanelMessage() {
  const embed = new EmbedBuilder()
    .setTitle('Idea Ticket')
    .setDescription(
      'Klicke auf den Button unten, um eine Idee einzureichen.\n\n' +
      'Danach öffnet sich direkt in Discord ein Formular-Fenster, in das der Spieler seine Idee eintragen kann. ' +
      'Nach dem Absenden wird automatisch eine Trello-Karte in der Liste "Ideas" erstellt.'
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_ID)
      .setLabel('Submit Idea')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  return { embeds: [embed], components: [row] };
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot online als ${readyClient.user.tag}`);

  try {
    await registerGuildCommands();
    console.log('Slash-Commands registriert oder aktualisiert.');
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error.message);
  }

  try {
    const listId = await findTargetListId();
    console.log(`Trello-Zielliste gefunden: ${TRELLO_TARGET_LIST_NAME} (${listId})`);
  } catch (error) {
    console.error('Fehler beim Prüfen der Trello-Liste:', error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticketpanel') {
        const panel = buildPanelMessage();
        await interaction.reply({
          content: 'Ticket panel sent.',
          ephemeral: true,
        });
        await interaction.channel.send(panel);
        return;
      }

      if (interaction.commandName === 'idee') {
        await interaction.showModal(buildIdeaModal());
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === PANEL_BUTTON_ID) {
      await interaction.showModal(buildIdeaModal());
      return;
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'idee_modal') {
      await interaction.deferReply({ ephemeral: true });

      const title = interaction.fields.getTextInputValue('idee_titel').trim();
      const category = interaction.fields.getTextInputValue('idee_kategorie').trim();
      const description = interaction.fields.getTextInputValue('idee_beschreibung').trim();

      const card = await createTrelloCard({
        title,
        category,
        description,
        discordUserTag: interaction.user.tag,
        discordUserId: interaction.user.id,
        guildName: interaction.guild?.name || 'Unbekannt',
      });

      await sendLogMessage(interaction.guild);

      await interaction.editReply({
        content:
          'Your idea has been successfully submitted.\n' +
          `Trello-Karte: ${card.shortUrl}`,
      });
    }
  } catch (error) {
    console.error('Interaction-Fehler:', error);

    const message = `Beim Verarbeiten ist ein Fehler aufgetreten:\n\`${error.message}\``;

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
