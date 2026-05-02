const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  Routes, 
  PermissionFlagsBits, 
  EmbedBuilder 
} = require('discord.js');

const { REST } = require('@discordjs/rest');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================
const token = process.env.MTQ5OTgyMjc2MjU5MDczNjU4Ng.GCyIPu.sMpHoqbsTGnwBpipD05R7ZFVVNRJZ5YedBgDk8;
const clientId = '1499822762590736586';
const guildId = '1334696250070663231';

const welcomeChannelId = '1499879825006002216';
const exitChannelId = '1499886649234948106';
const autoRoleId = '1334697676679151626';

// ================= GIFS (FUNCIONANDO EM EMBED) =================
const gifsEntrada = [
  'https://media.tenor.com/Wz1sV7R6C6QAAAAC/anime-welcome.gif',
  'https://media.tenor.com/8QxXnVQZsQkAAAAC/anime-hi.gif'
];

const gifsSaida = [
  'https://media.tenor.com/0AVbKGY_MxMAAAAC/anime-sad.gif',
  'https://media.tenor.com/Z6gmDPeM6dgAAAAC/anime-cry.gif'
];

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online'),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar usuário')
    .addUserOption(o =>
      o.setName('usuario')
       .setDescription('Usuário')
       .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Comandos registrados!');
  } catch (err) {
    console.error('❌ Erro ao registrar comandos:', err);
  }
})();

// ================= ENTRADA =================
client.on('guildMemberAdd', async member => {
  console.log(`➡️ ${member.user.tag} entrou`);

  // Cargo automático
  try {
    const cargo = member.guild.roles.cache.get(autoRoleId);
    if (cargo) {
      await member.roles.add(cargo);
      console.log('🎭 Cargo automático aplicado');
    }
  } catch (err) {
    console.log('❌ Erro ao dar cargo:', err);
  }

  // Canal
  const canal = member.guild.channels.cache.get(welcomeChannelId);
  if (!canal) return console.log('❌ Canal de entrada não encontrado');

  const gif = gifsEntrada[Math.floor(Math.random() * gifsEntrada.length)];

  const embed = new EmbedBuilder()
    .setColor(0x8a2be2)
    .setAuthor({
      name: `${member.user.username} conectou-se`,
      iconURL: member.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `✦ **Bem-vindo(a) ao Noctra Core** ${member}\n\n` +
      `🎮 Pegue seus cargos e mergulhe no servidor\n` +
      `🌙 Aqui a vibe é gameplay, anime e resenha`
    )
    .setImage(gif)
    .setFooter({ text: 'Noctra Core • Stay connected' })
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

// ================= SAÍDA =================
client.on('guildMemberRemove', async member => {
  console.log(`⬅️ ${member.user.tag} saiu`);

  const canal = member.guild.channels.cache.get(exitChannelId);
  if (!canal) return console.log('❌ Canal de saída não encontrado');

  const gif = gifsSaida[Math.floor(Math.random() * gifsSaida.length)];

  const embed = new EmbedBuilder()
    .setColor(0x1a1a1a)
    .setAuthor({
      name: `${member.user.username} desconectou`,
      iconURL: member.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `💔 Um membro deixou o servidor...\n\n` +
      `🌑 Talvez nossos caminhos se cruzem novamente`
    )
    .setImage(gif)
    .setFooter({ text: 'Noctra Core • Connection lost' })
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

// ================= COMANDOS =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    return interaction.reply('🏓 Pong! Bot online.');
  }

  if (interaction.commandName === 'kick') {
    const user = interaction.options.getUser('usuario');
    const membro = await interaction.guild.members.fetch(user.id);

    if (!membro.kickable)
      return interaction.reply({ content: '❌ Não posso expulsar esse usuário.', ephemeral: true });

    await membro.kick();
    return interaction.reply(`👢 ${user.tag} foi removido.`);
  }
});

// ================= ONLINE =================
client.once('ready', () => {
  console.log(`🤖 ${client.user.tag} está online!`);
});

client.login(token);