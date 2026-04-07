const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Sendet das Suggestion Panel in einen bestimmten Kanal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Der Kanal, in den das Suggestion Panel gesendet wird')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Öffnet das Suggestion Formular direkt'),

  new SlashCommandBuilder()
    .setName('rulespanel')
    .setDescription('Sendet die Serverregeln in einen bestimmten Kanal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Der Kanal, in den die Regeln gesendet werden')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Ändert die Serverregeln')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Der komplette Regeltext')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Optionaler Titel für das Embed')
        .setRequired(false)
    ),
].map(command => command.toJSON());

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
    console.error('Fehlende Werte in .env: DISCORD_TOKEN, CLIENT_ID oder GUILD_ID');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('✅ Slash Commands erfolgreich registriert.');
}

main().catch((error) => {
  console.error('❌ Fehler beim Deployen der Commands:', error);
  process.exit(1);
});
