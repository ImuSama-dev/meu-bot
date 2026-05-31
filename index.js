require('dotenv').config();

process.env.FFMPEG_PATH = require('ffmpeg-static');
const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  SlashCommandBuilder,
 StringSelectMenuBuilder,
 ModalBuilder,
 TextInputBuilder,
 TextInputStyle,
 Routes
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const mongoose = require('mongoose');
let voiceTools;
let playDl;
let firestore;

function getVoiceTools() {
  if (!voiceTools) voiceTools = require('@discordjs/voice');
  return voiceTools;
}

function getPlayDl() {
  if (!playDl) playDl = require('play-dl');
  return playDl;
}

function getFirestore() {
  if (firestore) return firestore;

  const admin = require('firebase-admin');
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require('./firebase-service-account.json');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  firestore = admin.firestore();
  return firestore;
}


// ================= ENV =================
const token = process.env.TOKEN;
const mongoUrl = process.env.MONGO_URL;
const clientId = process.env.CLIENT_ID || '1499822762590736586';
const guildId = process.env.GUILD_ID || '1334696250070663231';
const pedidosChannelId = '1503133804477419530';
const recrutamentoChannelId = '1502761123852849212';
const SUGESTOES_CHANNEL_ID = "1508246866909986947";
const DENUNCIAS_CHANNEL_ID = "1508246816993312828";
const DENUNCIAS_STAFF_CHANNEL_ID = "1510609309916987442";
const COMO_AJUDAR_CHANNEL_ID = "1508254799345356991";

if (!token || !mongoUrl || !clientId) {
  console.log('Preencha TOKEN, MONGO_URL e CLIENT_ID no arquivo .env');
  process.exit(1);
}

function logRuntimeStatus(label) {
  const memory = process.memoryUsage();
  const mb = value => Math.round(value / 1024 / 1024);

  console.log(
    `${label} | uptime=${Math.round(process.uptime())}s ` +
    `rss=${mb(memory.rss)}MB heap=${mb(memory.heapUsed)}/${mb(memory.heapTotal)}MB`
  );
}

async function shutdown(signal) {
  logRuntimeStatus(`PROCESSO RECEBEU ${signal}`);

  try {
    client.destroy();
    await mongoose.connection.close(false);
  } catch (error) {
    console.log('ERRO AO FINALIZAR BOT:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', error => {
  console.log('UNHANDLED REJECTION:', error);
  logRuntimeStatus('STATUS APOS UNHANDLED REJECTION');
});
process.on('uncaughtException', error => {
  console.log('UNCAUGHT EXCEPTION:', error);
  logRuntimeStatus('STATUS APOS UNCAUGHT EXCEPTION');
});

// ================= CONFIG PADRAO =================
const DEFAULT_CONFIG = {
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '1499879825006002216',
  exitChannelId: process.env.EXIT_CHANNEL_ID || '1499886649234948106',
  logChannelId: process.env.LOG_CHANNEL_ID || '1500255471410479154',
  rulesChannelId: process.env.RULES_CHANNEL_ID || '1361360073774989604',
  rulesEmoji: process.env.RULES_EMOJI || '✅',
  visitorRoleId: process.env.VISITOR_ROLE_ID || '1500224581145858090',
  memberRoleId: process.env.MEMBER_ROLE_ID || '1334697264668741662',
  staffRoleId: process.env.STAFF_ROLE_ID || null,
 ticketCategoryId: process.env.TICKET_CATEGORY_ID || '1502288315410550784',
  levelRoles: {
    5: process.env.LEVEL_ROLE_5 || '1500290223366733976',
    10: process.env.LEVEL_ROLE_10 || '1500290952018001981',
    20: process.env.LEVEL_ROLE_20 || '1500291699518341330'
  },

    updatesChannelId: process.env.UPDATES_CHANNEL_ID || '1502442679622041630',
  announcementsChannelId: process.env.ANNOUNCEMENTS_CHANNEL_ID || '1502773491492196572',
siteUrl: process.env.SITE_URL || 'https://imusama-dev.github.io/noctra-site/index.html',
  xpBlockedChannels: [],
  automod: {
    enabled: true,
    capsMinLength: 100,
    maxLength: 2000,
    spamLimit: 6,
    spamWindowMs: 5000,
    timeoutMs: 5 * 60 * 1000
  },
  antiRaid: {
    enabled: true,
    joinLimit: 6,
    windowMs: 30000,
    minAccountAgeDays: 3,
    quarantineRoleId: process.env.QUARANTINE_ROLE_ID || '1500224581145858090'
  },
  economy: {
    dailyAmount: 150,
    messageMin: 1,
    messageMax: 5
  }
};

// ================= MONGODB =================
async function startBot() {
  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 30000
    });

    console.log('MongoDB conectado');
    console.log('Iniciando login no Discord...');
    await client.login(token);
    console.log('Login enviado ao Discord.');
  } catch (err) {
    console.log('ERRO AO INICIAR BOT:', err);
    process.exit(1);
  }
}


const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannelId: String,
  exitChannelId: String,
  logChannelId: String,
  rulesChannelId: String,
  rulesEmoji: String,
  updatesChannelId: String,
  announcementsChannelId: String,
  siteUrl: String,
  visitorRoleId: String,
  memberRoleId: String,
  staffRoleId: String,
  ticketCategoryId: String,
  levelRoles: { type: Map, of: String, default: {} },
  xpBlockedChannels: { type: [String], default: [] },
  automod: {
    enabled: { type: Boolean, default: true },
    capsMinLength: { type: Number, default: 100 },
    maxLength: { type: Number, default: 400 },
    spamLimit: { type: Number, default: 6 },
    spamWindowMs: { type: Number, default: 5000 },
    timeoutMs: { type: Number, default: 300000 }
  },
  antiRaid: {
    enabled: { type: Boolean, default: true },
    joinLimit: { type: Number, default: 6 },
    windowMs: { type: Number, default: 30000 },
    minAccountAgeDays: { type: Number, default: 3 },
    quarantineRoleId: String
  },
  economy: {
    dailyAmount: { type: Number, default: 150 },
    messageMin: { type: Number, default: 1 },
    messageMax: { type: Number, default: 5 }
  }
}, { timestamps: true });

const xpSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });
xpSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const warningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: 'Sem motivo informado.' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const economySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  coins: { type: Number, default: 0 },
  lastDailyAt: Date
}, { timestamps: true });
economySchema.index({ guildId: 1, userId: 1 }, { unique: true });

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closedBy: String,
  closedAt: Date,
  transcript: String
}, { timestamps: true });
const pedidoSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  obraOriginal: { type: String, required: true },
  obraNormalizada: { type: String, required: true }
}, { timestamps: true });

pedidoSchema.index(
  { guildId: 1, obraNormalizada: 1 },
  { unique: true }
);
const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);
const XP = mongoose.model('XP', xpSchema);
const Warning = mongoose.model('Warning', warningSchema);
const Economy = mongoose.model('Economy', economySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Pedido = mongoose.model('Pedido', pedidoSchema);
const announcementSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  type: { type: String, required: true },
  itemId: { type: String, required: true }
}, { timestamps: true });

announcementSchema.index({ guildId: 1, type: 1, itemId: 1 }, { unique: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const xpCooldown = new Map();
const spamMap = new Map();
const raidMap = new Map();
const musicPlayers = new Map();

// ================= GIFS =================
const gifsEntrada = [
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWx0aG5ycDcyZWwzcm95cms1aWdjbHBhbDRweWVrZmEzMjhzY2RsbyZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/2LDlwWdQW3UxLgYrxU/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2pwejhuMWZtYnR3amR0cmpkczA3ejRqMTQ0aWl3a2swZmhud2lhMCZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/hg9iCY1kROgryA3IM0/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM3cm02ZjdxaHM4N3c5aG02aTZ6d2YxYTVscnBqbnBjNXgxeTdsbyZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/E2c87xRlZMnHRTEmoe/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnZtY2drdGEzamhpZ3YyOWlnNWppMXAxZnJ6bTBmbDRyZWNtZWpydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MLT8ctuVCZfX4LTavg/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzY0YjF3dTkyMHh1b2k4OGRhamkyaTJteDVldWVuY2M3NWRnM3hveCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FeAxKYM3TUjaCr3y0T/giphy.gif',
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjRqbWp1NGVscThqdnRyb283OXVrZGV4aHo2dGlka2tnN3ByOGdrcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2xPViTLgsxlOrDBxDn/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjVqcHV4YXBla2o2MXI4cGJydW81eWxjaG85Y2xmN2tpYzBkMzVvMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/q6oUS1vaXPndgrHjvU/giphy.gif'
];
const gifsSaida = [
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjBvdzk5dGE2dWljbTYwcDI4M2YzdHdvdDU0bWxtaXFwaTN5YW9pbSZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/shVJpcnY5MZVK/giphy.gif',
  'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWZ0MDUwcHJ5MWlnczZra2xlZzZ0YTQ1dWx5dXY0aWFpYzM3NzZrZCZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/cUl8fuIG75QWs/giphy.gif',
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWphZTdkOTNuOXBjd3Y0ZzdtMGhlNzZ4c2hyOWdmcWxvMWJ4dnl2MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ubO2LLKrX5XdtI9Mnr/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWc1YW0ycGRseWxyYmtxMjYzdmMwdzdiajVvM2dvaGc5YXptOXVkZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tvK94q5OZ11tMucboN/giphy.gif',
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExODd4ODAzdTlsZnd6aGQ2MnV5N3kwZ202cnBpNnBvNjZrbDN0dzBrZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SznCZeibJJiOK6QbhT/giphy.gif'
];


function normalizarTituloPedido(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ================= FUNCOES =================
function mapToObject(mapOrObject) {
  if (!mapOrObject) return {};
  if (mapOrObject instanceof Map) return Object.fromEntries(mapOrObject);
  return mapOrObject;
}

async function ensureConfig(serverId) {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId: serverId },
    { $setOnInsert: { guildId: serverId, ...DEFAULT_CONFIG } },
    { upsert: true, returnDocument: 'after' }
  );

  const raw = config.toObject();
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    levelRoles: { ...DEFAULT_CONFIG.levelRoles, ...mapToObject(raw.levelRoles) },
    automod: { ...DEFAULT_CONFIG.automod, ...(raw.automod || {}) },
    antiRaid: { ...DEFAULT_CONFIG.antiRaid, ...(raw.antiRaid || {}) },
    economy: { ...DEFAULT_CONFIG.economy, ...(raw.economy || {}) }
  };
}

async function checkNewChapterUpdates(guild) {
  const config = await ensureConfig(guild.id);
  if (!config.updatesChannelId) return;

  const channel = guild.channels.cache.get(config.updatesChannelId);
  if (!channel || !channel.isTextBased()) return;

  const snapshot = await getFirestore()
    .collection('manhwas')
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
    .catch(async () => {
      return await getFirestore()
        .collection('manhwas')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    });

  if (!snapshot || snapshot.empty) return;

  const manhwaDoc = snapshot.docs[0];
  const manhwa = manhwaDoc.data();
  const manhwaId = manhwaDoc.id;

  const obraTitulo = manhwa.titulo || manhwa.title || manhwa.nome || manhwaId;
  const capituloTitulo = `Capítulo ${manhwa.caps || manhwa.totalCaps || '?'}`;
  const capaUrl = manhwa.capa || manhwa.cover || manhwa.image || null;

  const updatedAt = manhwa.updatedAt?.toDate
    ? manhwa.updatedAt.toDate().toISOString()
    : String(Date.now());

  const itemId = `${manhwaId}:${updatedAt}`;

  const alreadySent = await Announcement.findOne({
    guildId: guild.id,
    type: 'chapter',
    itemId
  });

  if (alreadySent) {
    console.log('JÁ ENVIADO:', itemId);
    return;
  }

  const obraUrl = `${config.siteUrl.replace('index.html', 'obra.html')}?id=${manhwaId}`;
  const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel('Ler agora')
    .setStyle(ButtonStyle.Link)
    .setURL(obraUrl)
);

const embed = new EmbedBuilder()
  .setColor('#a855f7')
  .setTitle('☾ Capítulo atualizado na Noctra Core')
  .setDescription(
    `Uma nova atualização acaba de chegar à **Noctra**.\n\n` +
    `✦ **Obra:** ${obraTitulo}\n` +
    `✦ **Capítulo:** ${capituloTitulo}\n\n` +
    `As páginas foram atualizadas. Continue a leitura e acompanhe essa história diretamente pelo site.`
  )
  .setImage(capaUrl)
  .setFooter({
    text: `Noctra Core • Atualização automática`
  })
  .setTimestamp();

await channel.send({
  content: `<@&${config.memberRoleId}> ☾ **Nova atualização disponível na Noctra Core**`,
  embeds: [embed],
  components: [row],
  allowedMentions: {
    roles: [config.memberRoleId]
  }
});
  await Announcement.create({
    guildId: guild.id,
    type: 'chapter',
    itemId
  }).catch(() => {});
}
async function sendLog(guild, title, description, color = '#2b2d31') {
  const config = await ensureConfig(guild.id);
  if (!config.logChannelId) return;

  const channel = guild.channels.cache.get(config.logChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}

function canModerate(interaction, targetMember, permission) {
  const moderator = interaction.member;
  const botMember = interaction.guild.members.me;

  if (!targetMember) return 'Usuario nao encontrado no servidor.';
  if (targetMember.id === interaction.guild.ownerId) return 'Não posso punir o dono do servidor.';
  if (targetMember.id === interaction.user.id) return 'Você nao pode punir a si mesmo.';
  if (targetMember.id === client.user.id) return 'Eu não posso punir a mim mesmo.';
  if (!moderator.permissions.has(permission)) return 'Você não tem permissão para isso.';
  if (!botMember.permissions.has(permission)) return 'Eu não tenho permissão suficiente para isso.';
  if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
    return 'Esse usuário tem cargo igual ou acima do seu.';
  }
  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return 'Meu cargo precisa ficar acima do cargo desse usuário.';
  }

  return null;
}

function countRecent(map, key, windowMs) {
  const now = Date.now();
  const old = map.get(key) || [];
  const recent = old.filter(time => now - time < windowMs);
  recent.push(now);
  map.set(key, recent);
  return recent.length;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addXP(guildIdParam, userId, member, config) {
  const now = Date.now();
  const key = `${guildIdParam}:${userId}`;
  const last = xpCooldown.get(key) || 0;

  if (now - last < 60000) return null;
  xpCooldown.set(key, now);

  let data = await XP.findOne({ guildId: guildIdParam, userId });
  if (!data) data = new XP({ guildId: guildIdParam, userId, xp: 0, level: 1 });

  data.xp += Math.floor(Math.random() * 10) + 5;

  const needed = data.level * 100;
  if (data.xp >= needed) {
    data.xp -= needed;
    data.level++;

    const roleId = config.levelRoles[String(data.level)];
    if (roleId && member) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    await data.save();
    return data.level;
  }

  await data.save();
  return null;
}

async function getWallet(serverId, userId) {
  return Economy.findOneAndUpdate(
    { guildId: serverId, userId },
    { $setOnInsert: { guildId: serverId, userId, coins: 0 } },
    { upsert: true, returnDocument: 'after' }
  );
}

async function addCoins(serverId, userId, amount) {
  return Economy.findOneAndUpdate(
    { guildId: serverId, userId },
    { $inc: { coins: amount }, $setOnInsert: { guildId: serverId, userId } },
{ upsert: true, returnDocument: 'after' }
  );
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 1000 });
  return messages
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(msg => `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content || '[sem texto]'}`)
    .join('\n');
}

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot esta online.'),
  
  new SlashCommandBuilder()
  .setName('avisos')
  .setDescription('Envia a mensagem oficial de avisos'),
  
  new SlashCommandBuilder()
  .setName('atualizacao')
  .setDescription('Força o envio manual da última atualização')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Apaga mensagens.')
    .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade entre 1 e 100.').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario alvo.').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo.').setMaxLength(500))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario alvo.').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo.').setMaxLength(500))
    .addIntegerOption(o => o.setName('apagar_dias').setDescription('Apagar mensagens dos ultimos dias.').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Remove banimento por ID.')
    .addStringOption(o => o.setName('id').setDescription('ID do usuario.').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo.').setMaxLength(500))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia temporariamente um usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario alvo.').setRequired(true))
    .addIntegerOption(o => o.setName('minutos').setDescription('Duracao em minutos.').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo.').setMaxLength(500))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avisa um usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario alvo.').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo.').setRequired(true).setMaxLength(500))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Mostra warns ativos.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario alvo.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove um warn pelo ID.')
    .addStringOption(o => o.setName('id').setDescription('ID do warn.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra seu nivel ou o nivel de outro usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario opcional.')),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('Mostra ranking de XP.'),
  
new SlashCommandBuilder()
  .setName('recrutamento')
  .setDescription('Envia a mensagem de recrutamento'),
  new SlashCommandBuilder()
  .setName('play')
  .setDescription('Toca uma musica do YouTube')
  .addStringOption(o =>
    o.setName('musica')
      .setDescription('Nome ou link da musica')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Para a musica'),

new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Pula a musica atual'),
  new SlashCommandBuilder()
    .setName('leveladmin')
    .setDescription('Administra XP e nivel.')
    .addSubcommand(s => s.setName('setlevel')
      .setDescription('Define nivel.')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario.').setRequired(true))
      .addIntegerOption(o => o.setName('nivel').setDescription('Nivel.').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('reset')
      .setDescription('Reseta nivel.')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario.').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Coleta moedas diarias.'),

  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Mostra saldo de moedas.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario opcional.')),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Mostra avatar.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario opcional.')),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostra informacoes de usuario.')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario opcional.')),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Mostra informacoes do servidor.'),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envia embed personalizado.')
    .addStringOption(o => o.setName('titulo').setDescription('Titulo.').setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName('descricao').setDescription('Descricao.').setRequired(true).setMaxLength(3000))
    .addChannelOption(o => o.setName('canal').setDescription('Canal.').setRequired(true))
    .addStringOption(o => o.setName('cor').setDescription('Cor HEX, exemplo #2b2d31.'))
    .addStringOption(o => o.setName('imagem').setDescription('URL da imagem.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gerencia tickets.')
    .addSubcommand(s => s.setName('painel')
      .setDescription('Envia painel de ticket.')
      .addChannelOption(o => o.setName('canal').setDescription('Canal.').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
new SlashCommandBuilder()
  .setName('pedidos')
  .setDescription('Envia o painel de pedidos')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  new SlashCommandBuilder()
  .setName('comoajudar')
  .setDescription('Envia o painel de como ajudar a Noctra Core')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  new SlashCommandBuilder()
  .setName('denuncias')
  .setDescription('Envia o painel de denúncias')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  new SlashCommandBuilder()
  .setName('sugestoes')
  .setDescription('Envia o painel de sugestões')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Envia painel de cargos por menu.')
    .addChannelOption(o => o.setName('canal').setDescription('Canal.').setRequired(true))
    .addRoleOption(o => o.setName('cargo1').setDescription('Primeiro cargo.').setRequired(true))
    .addRoleOption(o => o.setName('cargo2').setDescription('Segundo cargo.'))
    .addRoleOption(o => o.setName('cargo3').setDescription('Terceiro cargo.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o bot.')
    .addSubcommand(s => s.setName('canal')
      .setDescription('Define canais.')
      .addStringOption(o => o.setName('tipo').setDescription('Tipo.').setRequired(true).addChoices(
        { name: 'boas-vindas', value: 'welcomeChannelId' },
        { name: 'saida', value: 'exitChannelId' },
        { name: 'logs', value: 'logChannelId' },
        { name: 'atualizações', value: 'updatesChannelId' },
        { name: 'avisos', value: 'announcementsChannelId' },
        { name: 'regras', value: 'rulesChannelId' },
        { name: 'categoria-ticket', value: 'ticketCategoryId' }
      ))
.addChannelOption(o =>
  o
    .setName('canal')
    .setDescription('Canal ou categoria.')
    .addChannelTypes(
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildCategory
)
    .setRequired(true)
))
    .addSubcommand(s => s.setName('cargo')
      .setDescription('Define cargos.')
      .addStringOption(o => o.setName('tipo').setDescription('Tipo.').setRequired(true).addChoices(
        { name: 'visitante', value: 'visitorRoleId' },
        { name: 'membro', value: 'memberRoleId' },
        { name: 'staff', value: 'staffRoleId' },
        { name: 'quarentena', value: 'antiRaid.quarantineRoleId' }
      ))
      .addRoleOption(o => o.setName('cargo').setDescription('Cargo.').setRequired(true)))
    .addSubcommand(s => s.setName('regras')
      .setDescription('Define emoji das regras.')
      .addStringOption(o => o.setName('emoji').setDescription('Emoji.').setRequired(true)))
    .addSubcommand(s => s.setName('levelrole')
      .setDescription('Define cargo por nivel.')
      .addIntegerOption(o => o.setName('nivel').setDescription('Nivel.').setRequired(true).setMinValue(1))
      .addRoleOption(o => o.setName('cargo').setDescription('Cargo.').setRequired(true)))
    .addSubcommand(s => s.setName('ver').setDescription('Mostra configuracao atual.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(command => command.toJSON());

// ================= READY =================
client.once('clientReady', async () => {
  console.log(`${client.user.tag} online!`);
  logRuntimeStatus('BOT ONLINE');

for (const guild of client.guilds.cache.values()) {
  await ensureConfig(guild.id);
}

  const checkChapterUpdates = () => {
    for (const guild of client.guilds.cache.values()) {
      checkNewChapterUpdates(guild).catch(err => console.log('Erro nas atualizacoes do site:', err));
    }
  };

  console.log('Checagem de capitulos agendada para iniciar em 2 minutos.');
  setTimeout(() => {
    checkChapterUpdates();
    setInterval(checkChapterUpdates, 1 * 60 * 1000);
  }, 2 * 60 * 1000);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Comandos registrados no servidor.');
      logRuntimeStatus('APOS REGISTRAR COMANDOS');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Comandos globais registrados.');
      logRuntimeStatus('APOS REGISTRAR COMANDOS');
    }
  } catch (err) {
    console.log('Erro ao registrar comandos:', err);
  }
});

// ================= ENTRADA =================
client.on('guildMemberAdd', async (member) => {
  const config = await ensureConfig(member.guild.id);
  const now = Date.now();
  const joins = raidMap.get(member.guild.id) || [];
  const recent = joins.filter(time => now - time < config.antiRaid.windowMs);
  recent.push(now);
  raidMap.set(member.guild.id, recent);

  const accountAge = now - member.user.createdTimestamp;
  const minAge = config.antiRaid.minAccountAgeDays * 24 * 60 * 60 * 1000;
  const raidDetected = config.antiRaid.enabled && recent.length >= config.antiRaid.joinLimit;
  const newAccount = config.antiRaid.enabled && accountAge < minAge;

  if ((raidDetected || newAccount) && config.antiRaid.quarantineRoleId) {
    const role = member.guild.roles.cache.get(config.antiRaid.quarantineRoleId);
    if (role) await member.roles.add(role).catch(() => {});
    await sendLog(member.guild, 'Proteção anti-raid', `${member} recebeu quarentena.`, '#ff5555');
  } else if (config.visitorRoleId) {
    const role = member.guild.roles.cache.get(config.visitorRoleId);
    if (role) await member.roles.add(role).catch(() => {});
  }

  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (channel) {
    const mensagens = [
      `✦ ${member}, foi marcado pela escuridão da **Noctra Core**.\n❖ Não há saída.\n☾ Não há luz.`,
      `✧ ${member}, despertou no vazio...\n☾ Não há volta agora.`,
      `❖ ${member} entrou na **Noctra Core**.`
    ];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setDescription(pick(mensagens))
      .setImage(pick(gifsEntrada));

    channel.send({ embeds: [embed] }).catch(() => {});
  }

  await sendLog(member.guild, 'Membro entrou', `${member.user.tag} entrou no servidor.`, '#57f287');
});

// ================= SAIDA =================
client.on('guildMemberRemove', async (member) => {
  const config = await ensureConfig(member.guild.id);
  const channel = member.guild.channels.cache.get(config.exitChannelId);

  if (channel) {
    const embed = new EmbedBuilder()
      .setColor('#111111')
      .setDescription(
        `☠ saiu da Noctra\n\n` +
        `✦ ${member.user} desapareceu na escuridão...💔​\n\n` +
        `O vazio agora se torna mais pesado.\n` +
        `Espero que você se perca!​💢​​`
      )
      .setImage(pick(gifsSaida));

    channel.send({ embeds: [embed] }).catch(() => {});
  }

  await sendLog(member.guild, 'Membro saiu', `${member.user.tag} saiu do servidor.`, '#ed4245');
});

// ================= REGRAS POR REACAO =================
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch {
    return;
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const config = await ensureConfig(guild.id);
  if (reaction.message.channel.id !== config.rulesChannelId) return;
  if (reaction.emoji.name !== config.rulesEmoji) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const visitante = config.visitorRoleId ? guild.roles.cache.get(config.visitorRoleId) : null;
  const membro = config.memberRoleId ? guild.roles.cache.get(config.memberRoleId) : null;

  if (visitante) await member.roles.remove(visitante).catch(() => {});
  if (membro) await member.roles.add(membro).catch(() => {});

  await sendLog(guild, 'Regras aceitas', `${user.tag} aceitou as regras.`, '#5865f2');
});

// ================= XP + ECONOMIA + AUTOMOD =================
client.on('messageCreate', async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const config = await ensureConfig(msg.guild.id);
  if (msg.channel.id === config.rulesChannelId) return;

  if (config.automod.enabled) {
  const textoSemEspaco = msg.content.replace(/\s/g, '').toLowerCase();
  const ehRisadaKKK = /^k+$/.test(textoSemEspaco);

  if (!ehRisadaKKK) {
    const key = `${msg.guild.id}:${msg.author.id}`;
    const spamCount = countRecent(spamMap, key, config.automod.spamWindowMs);

    if (spamCount >= config.automod.spamLimit) {
      const messages = await msg.channel.messages.fetch({ limit: 20 }).catch(() => null);
      const userMsgs = messages?.filter(m => m.author.id === msg.author.id);
      if (userMsgs?.size) await msg.channel.bulkDelete(userMsgs, true).catch(() => {});
      await msg.member.timeout(config.automod.timeoutMs, 'Spam automatico').catch(() => {});
      await sendLog(msg.guild, 'Spam detectado', `${msg.author} recebeu timeout automatico.`, '#ff5555');
      return;
    }

    if (msg.content.length > 100 && msg.content === msg.content.toUpperCase()) {
      await msg.delete().catch(() => {});
      await sendLog(msg.guild, 'Mensagem apagada', `${msg.author} enviou CAPS em ${msg.channel}.`, '#faa61a');
      return;
    }

    if (msg.content.length > config.automod.maxLength) {
      await msg.delete().catch(() => {});
      await sendLog(msg.guild, 'Mensagem apagada', `${msg.author} enviou mensagem longa demais em ${msg.channel}.`, '#faa61a');
      return;
    }
  }
}
  if (!config.xpBlockedChannels.includes(msg.channel.id)) {
    const levelUp = await addXP(msg.guild.id, msg.author.id, msg.member, config);
    if (levelUp) {
      msg.channel.send(`☠ ${msg.author}, seu poder cresceu.\n✦ Nivel ${levelUp}`).catch(() => {});
    }
  }

  const coins = randomBetween(config.economy.messageMin, config.economy.messageMax);
  await addCoins(msg.guild.id, msg.author.id, coins);
});

// ================= LOGS =================
client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  const content = message.content ? `\nConteudo: ${message.content.slice(0, 900)}` : '';
  await sendLog(message.guild, 'Mensagem deletada', `${message.author} em ${message.channel}.${content}`, '#faa61a');
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await sendLog(
    oldMessage.guild,
    'Mensagem editada',
    `${oldMessage.author} em ${oldMessage.channel}.\nAntes: ${(oldMessage.content || '[sem texto]').slice(0, 450)}\nDepois: ${(newMessage.content || '[sem texto]').slice(0, 450)}`,
    '#fee75c'
  );
});

client.on('guildBanAdd', async (ban) => {
  await sendLog(ban.guild, 'Usuario banido', `${ban.user.tag} foi banido.`, '#ed4245');
});

client.on('guildBanRemove', async (ban) => {
  await sendLog(ban.guild, 'Usuario desbanido', `${ban.user.tag} foi desbanido.`, '#57f287');
});

client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  await sendLog(channel.guild, 'Canal criado', `${channel} foi criado.`, '#57f287');
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  await sendLog(channel.guild, 'Canal deletado', `${channel.name} foi deletado.`, '#ed4245');
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  const added = [...newRoles].filter(id => !oldRoles.has(id));
  const removed = [...oldRoles].filter(id => !newRoles.has(id));

  if (added.length) {
    await sendLog(newMember.guild, 'Cargo adicionado', `${newMember} recebeu ${added.map(id => `<@&${id}>`).join(', ')}.`, '#57f287');
  }

  if (removed.length) {
    await sendLog(newMember.guild, 'Cargo removido', `${newMember} perdeu ${removed.map(id => `<@&${id}>`).join(', ')}.`, '#ed4245');
  }
});

// ================= INTERACOES =================
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_menu:')) {
      const roleIds = interaction.customId.split(':')[1].split(',').filter(Boolean);
      const selected = new Set(interaction.values);

      for (const roleId of roleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;

        if (selected.has(roleId)) await interaction.member.roles.add(role).catch(() => {});
        else await interaction.member.roles.remove(role).catch(() => {});
      }

      return interaction.reply({ content: 'Cargos atualizados.', ephemeral: true });
    }

if (interaction.isButton()) {
  
  if (interaction.customId === 'abrir_denuncia') {
  const modal = new ModalBuilder()
    .setCustomId('modal_denuncia')
    .setTitle('Enviar denúncia');

  const usuarioInput = new TextInputBuilder()
    .setCustomId('usuario_denunciado')
    .setLabel('Usuário denunciado')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Nome, @ ou ID da pessoa');

  const motivoInput = new TextInputBuilder()
    .setCustomId('motivo_denuncia')
    .setLabel('Motivo da denúncia')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('Explique o que aconteceu com detalhes.');

  const provasInput = new TextInputBuilder()
    .setCustomId('provas_denuncia')
    .setLabel('Provas ou links')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder('Prints, links de mensagens ou vídeos, se tiver.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(usuarioInput),
    new ActionRowBuilder().addComponents(motivoInput),
    new ActionRowBuilder().addComponents(provasInput)
  );

  await interaction.showModal(modal);
  return;
}
  if (interaction.customId === 'abrir_candidatura') {
    const modal = new ModalBuilder()
      .setCustomId('modal_candidatura')
      .setTitle('Candidatura Noctra');

    const textoInput = new TextInputBuilder()
      .setCustomId('texto_candidatura')
      .setLabel('Mensagem opcional')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('Ex: Quero ajudar como tradutora, editora ou cleaner.');

    const row = new ActionRowBuilder().addComponents(textoInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId === 'abrir_pedido') {
    const modal = new ModalBuilder()
      .setCustomId('modal_pedido')
      .setTitle('Enviar pedido');

    const obraInput = new TextInputBuilder()
      .setCustomId('nome_obra')
      .setLabel('Digite o nome da obra')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Ex: Painter Of The Night');

    const row = new ActionRowBuilder().addComponents(obraInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }
    if (interaction.customId === 'enviar_sugestao') {
    const modal = new ModalBuilder()
      .setCustomId('modal_sugestao')
      .setTitle('Enviar sugestão');

    const sugestaoInput = new TextInputBuilder()
      .setCustomId('texto_sugestao')
      .setLabel('Digite sua sugestão')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Explique sua ideia ou melhoria para a Noctra Core.');

    const row = new ActionRowBuilder().addComponents(sugestaoInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }

  if (interaction.customId === 'ticket_open') {
    const config = await ensureConfig(interaction.guild.id);

    const category = config.ticketCategoryId
      ? interaction.guild.channels.cache.get(config.ticketCategoryId)
      : null;

    const existing = interaction.guild.channels.cache.find(
      c =>
        c.topic === `ticket:${interaction.user.id}` &&
        c.parentId === category?.id
    );

    if (existing) {
      return interaction.reply({
        content: `Você já possui um ticket aberto: ${existing}`,
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category?.id,
      topic: `ticket:${interaction.user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        },
        {
          id: interaction.guild.members.me.id,
          allow: ['ViewChannel', 'SendMessages', 'ManageChannels']
        }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fechar ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user}`,
      embeds: [
        new EmbedBuilder()
          .setColor('#111111')
          .setTitle('☾ Ticket aberto')
          .setDescription('A staff responderá em breve.')
      ],
      components: [row]
    });

    await Ticket.create({
      guildId: interaction.guild.id,
      channelId: channel.id,
      userId: interaction.user.id
    });

    return interaction.reply({
      content: `Ticket criado: ${channel}`,
      ephemeral: true
    });
  }
}
if (interaction.isModalSubmit()) {
  if (interaction.customId === 'modal_denuncia') {
  const usuario = interaction.fields.getTextInputValue('usuario_denunciado');
  const motivo = interaction.fields.getTextInputValue('motivo_denuncia');
  const provas = interaction.fields.getTextInputValue('provas_denuncia') || 'Nenhuma prova enviada.';

  const canalStaff = interaction.guild.channels.cache.get(DENUNCIAS_STAFF_CHANNEL_ID);

  if (!canalStaff) {
    return interaction.reply({
      content: 'Canal da staff para denúncias não encontrado.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle('⚠️ Nova denúncia recebida')
    .setDescription(
      `✦ **Denúncia enviada por:** ${interaction.user}\n\n` +
      `❖ **Usuário denunciado:**\n${usuario}\n\n` +
      `❖ **Motivo:**\n${motivo}\n\n` +
      `❖ **Provas:**\n${provas}`
    )
    .setFooter({
      text: 'Noctra Core • Sistema de Denúncias'
    })
    .setTimestamp();

  await canalStaff.send({
    embeds: [embed]
  });

  await interaction.reply({
    content: 'Sua denúncia foi enviada para a staff com segurança.',
    ephemeral: true
  });

  return;
}
  if (interaction.customId === 'modal_candidatura') {
  const texto = interaction.fields.getTextInputValue('texto_candidatura')?.trim();

  const canal = interaction.guild.channels.cache.get(recrutamentoChannelId) || interaction.channel;

  const embed = new EmbedBuilder()
    .setColor('#a855f7')
    .setTitle('✦ Nova candidatura')
    .setDescription(
      texto
        ? `${interaction.user} se candidatou.\n\n**Mensagem:**\n${texto}`
        : `${interaction.user} se candidatou.`
    )
    .setTimestamp();

  await canal.send({
    embeds: [embed]
  });

  await interaction.reply({
    content: 'Sua candidatura foi enviada com sucesso.',
    flags: 64
  });

  return;
}
  if (interaction.customId === 'modal_sugestao') {
    const sugestao = interaction.fields.getTextInputValue('texto_sugestao');

    const channel = interaction.guild.channels.cache.get(SUGESTOES_CHANNEL_ID);

    if (!channel) {
      return interaction.reply({
        content: 'Canal de sugestões não encontrado.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#111111')
      .setTitle('💡 Nova sugestão recebida')
      .setDescription(
        `✦ **Sugestão enviada por:** ${interaction.user}\n\n` +
        `❖ **Sugestão:**\n${sugestao}`
      )
      .setFooter({
        text: 'Noctra Core • Sistema de Sugestões'
      })
      .setTimestamp();

    await channel.send({
      embeds: [embed]
    });

    await interaction.reply({
      content: 'Sua sugestão foi enviada com sucesso.',
      ephemeral: true
    });

    return;
  }
if (interaction.customId === 'modal_pedido') {

const obra = interaction.fields.getTextInputValue('nome_obra');
  const obraNormalizada = normalizarTituloPedido(obra);

const pedidoExistente = await Pedido.findOne({
  guildId: interaction.guild.id,
  obraNormalizada
});

if (pedidoExistente) {
  return interaction.reply({
    content:
      `☾ Essa obra já foi enviada anteriormente.\n\n` +
      `✦ Pedido existente: **${pedidoExistente.obraOriginal}**`,
    ephemeral: true
  });
}

await Pedido.create({
  guildId: interaction.guild.id,
  userId: interaction.user.id,
  obraOriginal: obra,
  obraNormalizada
});

const pedidosChannel = interaction.guild.channels.cache.get(pedidosChannelId);

if (!pedidosChannel) {
return interaction.reply({
content: 'Canal de pedidos não encontrado.',
ephemeral: true
});
}

const embed = new EmbedBuilder()
.setColor('#8b5cf6')
.setTitle('✦ Novo Pedido de Obra')
.setDescription(
`☾ Pedido enviado por ${interaction.user}\n\n` +
`✦ Obra solicitada:\n` +
`>>> ${obra}`
)
.setTimestamp();

await pedidosChannel.send({
embeds: [embed]
});

await interaction.reply({
content: 'Pedido enviado com sucesso.',
ephemeral: true
});

return;
}
}
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;

    if (command === 'ping') {
      return interaction.reply({ content: `Pong! Latencia: ${client.ws.ping}ms`, ephemeral: true });
    }

    if (command === 'clear') {
      const quantidade = interaction.options.getInteger('quantidade');
      const deleted = await interaction.channel.bulkDelete(quantidade, true);
      await interaction.reply({ content: `${deleted.size} mensagens apagadas.`, ephemeral: true });
      await sendLog(interaction.guild, 'Mensagens apagadas', `${interaction.user.tag} apagou ${deleted.size} mensagens em ${interaction.channel}.`);
      return;
    }

    if (command === 'kick') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('motivo') || 'Sem motivo informado.';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const error = canModerate(interaction, member, PermissionFlagsBits.KickMembers);
      if (error) return interaction.reply({ content: error, ephemeral: true });

      await member.kick(reason);
      await interaction.reply(`${user.tag} foi expulso. Motivo: ${reason}`);
      await sendLog(interaction.guild, 'Usuario expulso', `${user.tag} foi expulso por ${interaction.user.tag}.\nMotivo: ${reason}`, '#faa61a');
      return;
    }

    if (command === 'ban') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('motivo') || 'Sem motivo informado.';
      const deleteMessageSeconds = (interaction.options.getInteger('apagar_dias') || 0) * 24 * 60 * 60;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const error = canModerate(interaction, member, PermissionFlagsBits.BanMembers);
      if (error) return interaction.reply({ content: error, ephemeral: true });

      await member.ban({ reason, deleteMessageSeconds });
      await interaction.reply(`${user.tag} foi banido. Motivo: ${reason}`);
      await sendLog(interaction.guild, 'Usuario banido', `${user.tag} foi banido por ${interaction.user.tag}.\nMotivo: ${reason}`, '#ed4245');
      return;
    }

    if (command === 'unban') {
      const userId = interaction.options.getString('id');
      const reason = interaction.options.getString('motivo') || 'Sem motivo informado.';
      await interaction.guild.members.unban(userId, reason);
      await interaction.reply(`Usuario ${userId} foi desbanido.`);
      await sendLog(interaction.guild, 'Usuario desbanido', `${userId} foi desbanido por ${interaction.user.tag}.\nMotivo: ${reason}`, '#57f287');
      return;
    }

    if (command === 'timeout') {
      const user = interaction.options.getUser('usuario');
      const minutes = interaction.options.getInteger('minutos');
      const reason = interaction.options.getString('motivo') || 'Sem motivo informado.';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const error = canModerate(interaction, member, PermissionFlagsBits.ModerateMembers);
      if (error) return interaction.reply({ content: error, ephemeral: true });

      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(`${user.tag} recebeu timeout por ${minutes} minutos. Motivo: ${reason}`);
      await sendLog(interaction.guild, 'Timeout aplicado', `${user.tag} recebeu timeout por ${interaction.user.tag}.\nDuracao: ${minutes} minutos\nMotivo: ${reason}`, '#faa61a');
      return;
    }

    if (command === 'warn') {
      const user = interaction.options.getUser('usuario');
      const reason = interaction.options.getString('motivo');

      await Warning.create({
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason
      });

      const count = await Warning.countDocuments({ guildId: interaction.guild.id, userId: user.id, active: true });
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (member && count >= 5) await member.timeout(60 * 60 * 1000, '5 warns ativos').catch(() => {});
      else if (member && count >= 3) await member.timeout(10 * 60 * 1000, '3 warns ativos').catch(() => {});

      await interaction.reply(`${user.tag} recebeu warn. Total ativo: ${count}.`);
      await sendLog(interaction.guild, 'Warn aplicado', `${user.tag} recebeu warn de ${interaction.user.tag}.\nMotivo: ${reason}\nTotal ativo: ${count}`, '#faa61a');
      return;
    }

    if (command === 'warnings') {
      const user = interaction.options.getUser('usuario');
      const warnings = await Warning.find({ guildId: interaction.guild.id, userId: user.id, active: true }).sort({ createdAt: -1 }).limit(10);

      const description = warnings.length
        ? warnings.map(warn => `ID: ${warn._id}\nMotivo: ${warn.reason}\nModerador: <@${warn.moderatorId}>`).join('\n\n')
        : 'Nenhum warn ativo.';

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`Warns de ${user.tag}`)
        .setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (command === 'unwarn') {
      const id = interaction.options.getString('id');
      const warn = await Warning.findOneAndUpdate(
        { _id: id, guildId: interaction.guild.id },
        { active: false },
       { returnDocument: 'after' }
      ).catch(() => null);

      if (!warn) return interaction.reply({ content: 'Warn nao encontrado.', ephemeral: true });

      await interaction.reply({ content: 'Warn removido.', ephemeral: true });
      await sendLog(interaction.guild, 'Warn removido', `${interaction.user.tag} removeu warn de <@${warn.userId}>.`);
      return;
    }

    if (command === 'rank') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const data = await XP.findOne({ guildId: interaction.guild.id, userId: user.id });

      if (!data) return interaction.reply(`${user} ainda nao possui nivel.`);

      const needed = data.level * 100;
      const progress = Math.min(10, Math.floor((data.xp / needed) * 10));
      const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setDescription(`${user}\n\n✦ Nivel: ${data.level}\n✦ XP: ${data.xp} / ${needed}\n\n${bar}`);

      await interaction.reply({ embeds: [embed] });
      return;
    }
if (command === 'avisos') {

const embed = new EmbedBuilder()
.setColor('#111111')
.setTitle('☾ Avisos Oficiais • Noctra Core')
.setDescription(
`✦ Acompanhe este canal para receber comunicados importantes da Noctra Core.\n\n` +

`❖ Caso o site fique offline, entre em manutenção ou apresente instabilidades, todas as informações serão enviadas aqui.\n\n` +

`✦ Este canal também será utilizado para:\n` +
`• manutenção do site\n` +
`• ajustes no servidor\n` +
`• problemas técnicos\n\n` +

`☾ Permaneça atento aos avisos enviados pela staff.\n\n` +
`────────────────────\n` +
`Noctra Core • Entre na escuridão.`
)
.setFooter({
  text: 'Noctra Core • Sistema Oficial'
})
.setTimestamp();

const config = await ensureConfig(interaction.guild.id);

const canalAvisos = interaction.guild.channels.cache.get('1502761123852849212');

if (!canalAvisos) {
  return interaction.reply({
    content: 'Canal de avisos não configurado.',
    ephemeral: true
  });
}

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('abrir_candidatura')
    .setLabel('Quero me candidatar')
    .setStyle(ButtonStyle.Success)
);

await canalAvisos.send({
  embeds: [embed],
  components: [row]
});
  
await interaction.reply({
  content: `Aviso enviado em ${canalAvisos}.`,
  ephemeral: true
});

return;
}
    if (command === 'recrutamento') {

const embed = new EmbedBuilder()
.setColor('#8b5cf6')
.setTitle('✦ Recrutamento • Noctra Core')
.setDescription(
`A Noctra Core está recrutando pessoas interessadas em participar da equipe de tradução.\n\n` +

`✦ Procuramos pessoas:\n` +
`• organizadas\n` +
`• dedicadas\n` +
`• interessadas em Yuri ou Yaoi\n\n` +

`❖ As obras serão enviadas pela administração.\n` +
`❖ Cada pessoa poderá escolher preferências antes de começar.\n\n` +

`✦ O projeto busca qualidade, carinho e dedicação em cada capítulo traduzido.\n\n` +

`────────────────────\n` +
`Noctra Core • Recrutamento Oficial`
)
.setFooter({
  text: 'Noctra Core • Staff Oficial'
})
.setTimestamp();

const config = await ensureConfig(interaction.guild.id);

const canalAvisos = interaction.guild.channels.cache.get('1502761123852849212');

if (!canalAvisos) {
  return interaction.reply({
    content: 'Canal de avisos não configurado.',
    ephemeral: true
  });
}

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('abrir_candidatura')
    .setLabel('Quero me candidatar')
    .setStyle(ButtonStyle.Success)
);

await canalAvisos.send({
  embeds: [embed],
  components: [row]
});

await interaction.reply({
  content: `Recrutamento enviado em ${canalAvisos}.`,
  ephemeral: true
});
      return;
}
    
async function findYoutubeVideo(query) {
  const play = getPlayDl();

  if (play.yt_validate(query) === 'video') {
    const info = await play.video_basic_info(query);

    return {
      title: info.video_details.title || 'Link do YouTube',
      url: query,
      thumbnail: info.video_details.thumbnails?.[0]?.url || null
    };
  }

  const results = await play.search(query, {
    limit: 1,
    source: { youtube: 'video' }
  });
  const video = results[0];

  if (!video) return null;

  return {
    title: video.title,
    url: video.url,
    thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || null
  };
}
    
if (command === 'play') {
  await interaction.deferReply().catch(err => {
    console.log('NAO CONSEGUI RESPONDER A INTERACTION:', err);
    return null;
  });

  if (!interaction.deferred && !interaction.replied) return;

  const query = interaction.options.getString('musica');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply('Entre em uma call primeiro.');
  }

  try {
    const {
      joinVoiceChannel,
      createAudioPlayer,
      createAudioResource,
      AudioPlayerStatus,
      NoSubscriberBehavior,
      entersState,
      VoiceConnectionStatus,
      getVoiceConnection
    } = getVoiceTools();

    let oldConnection = getVoiceConnection(interaction.guild.id);
    if (oldConnection) oldConnection.destroy();

    const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
      return interaction.editReply('Eu preciso de permissão para Conectar e Falar nesse canal de voz.');
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`VOICE: ${oldState.status} -> ${newState.status}`);
    });

    connection.on('error', error => {
      console.log('VOICE ERRO:', error);
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 60000).catch(error => {
      console.log('VOICE NAO FICOU READY:', error);
      connection.destroy();
      throw new Error('Nao consegui conectar ao canal de voz. A hospedagem pode estar bloqueando a conexao de voz/UDP do Discord.');
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    player.on('stateChange', (oldState, newState) => {
      console.log(`PLAYER: ${oldState.status} -> ${newState.status}`);
    });

    player.on('error', error => {
      console.log('PLAYER ERRO:', error);
    });

    const video = await findYoutubeVideo(query);

    if (!video) {
      connection.destroy();
      return interaction.editReply('Nenhuma música encontrada.');
    }

const audio = await getPlayDl().stream(video.url);

const resource = createAudioResource(audio.stream, {
  inputType: audio.type,
  inlineVolume: true
});

audio.stream.on('error', error => {
  console.log('STREAM ERRO:', error);
  player.stop();
});

resource.volume.setVolume(1);

const subscription = connection.subscribe(player);

if (!subscription) {
  console.log('ERRO: connection.subscribe(player) falhou.');
  connection.destroy();
  return interaction.editReply('Conectei na call, mas não consegui enviar áudio.');
}

player.play(resource);

console.log('PLAYER STATUS AGORA:', player.state.status);


    musicPlayers.set(interaction.guild.id, {
      connection,
      player
    });

    const embed = new EmbedBuilder()
      .setColor('#111111')
      .setTitle('☾ Tocando agora')
      .setDescription(
        `✦ **${video.title}**\n\n` +
        `❖ Pedido por: ${interaction.user}\n` +
        `☾ Canal: ${voiceChannel}`
      )
      .setThumbnail(video.thumbnail)
      .setFooter({
        text: 'Noctra Music'
      });

    await interaction.editReply({
      embeds: [embed]
    });

player.on(AudioPlayerStatus.Idle, () => {
  console.log('PLAYER: entrou em Idle. A música terminou, o stream caiu ou nenhum áudio chegou ao Discord.');

  setTimeout(() => {
    const current = musicPlayers.get(interaction.guild.id);

    if (current?.player === player && player.state.status === AudioPlayerStatus.Idle) {
      console.log('PLAYER: destruindo conexão após Idle.');
      current.connection.destroy();
      musicPlayers.delete(interaction.guild.id);
    }
  }, 120000);
});

player.on('error', (error) => {
  console.log('PLAYER ERRO:', error);
});

  } catch (err) {
    console.log('ERRO PLAY:', err);
    console.log('ERRO PLAY STACK:', err?.stack || err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Erro ao tocar música: ${err.message}`).catch(() => {});
    }

    return;
  }

  return;
}

if (command === 'stop') {
  const musicData = musicPlayers.get(interaction.guild.id);

  if (!musicData) {
    return interaction.reply({
      content: 'Não há música tocando.',
      ephemeral: true
    });
  }

  musicData.player.stop();
  musicData.connection.destroy();

  musicPlayers.delete(interaction.guild.id);

  await interaction.reply('☾ Música parada.');
  return;
}

if (command === 'skip') {
  const musicData = musicPlayers.get(interaction.guild.id);

  if (!musicData) {
    return interaction.reply({
      content: 'Não há música tocando.',
      ephemeral: true
    });
  }

  musicData.player.stop();

  await interaction.reply('☾ Música pulada.');
  return;
}
if (command === 'atualizacao') {
  const config = await ensureConfig(interaction.guild.id);
  const channel = interaction.guild.channels.cache.get(config.updatesChannelId);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: 'Canal de atualizações não encontrado.',
      ephemeral: true
    });
  }

  const snapshot = await getFirestore()
    .collection('manhwas')
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
    .catch(async () => {
      return await getFirestore()
        .collection('manhwas')
        .limit(1)
        .get();
    });

  if (!snapshot || snapshot.empty) {
    return interaction.reply({
      content: 'Nenhuma obra encontrada no Firebase.',
      ephemeral: true
    });
  }

  const manhwaDoc = snapshot.docs[0];
  const manhwa = manhwaDoc.data();

  const obraTitulo = manhwa.titulo || manhwa.title || manhwa.nome || manhwaDoc.id;
  const capituloTitulo = `Capítulo ${manhwa.caps || manhwa.totalCaps || '?'}`;
  const capaUrl = manhwa.capa || manhwa.cover || manhwa.image || null;
const obraUrl = `${config.siteUrl.replace('index.html', 'obra.html')}?id=${manhwaDoc.id}`;

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel('Ler agora')
    .setStyle(ButtonStyle.Link)
    .setURL(obraUrl)
);
const embed = new EmbedBuilder()
  .setColor('#a855f7')
  .setTitle('☾ Capítulo atualizado na Noctra Core')
  .setDescription(
    `Uma nova atualização acaba de chegar à **Noctra**.\n\n` +
    `✦ **Obra:** ${obraTitulo}\n` +
    `✦ **Capítulo:** ${capituloTitulo}\n\n` +
    `As páginas foram atualizadas. Continue a leitura e acompanhe essa história diretamente pelo site.`
  )
  .setImage(capaUrl)
  .setFooter({
    text: `Noctra Core • Atualização automática`
  })
  .setTimestamp();

await channel.send({
  content: `<@&${config.memberRoleId}> ☾ **Nova atualização disponível na Noctra Core**`,
  embeds: [embed],
  components: [row],
  allowedMentions: {
    roles: [config.memberRoleId]
  }
});

await interaction.reply({
  content: 'Atualização enviada manualmente.',
  ephemeral: true
});

return;
}
    
  if (command === 'top') {
    const top = await XP.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).limit(10);
      let desc = '🏆 Top da Noctra\n\n';

      for (let i = 0; i < top.length; i++) {
        const user = await client.users.fetch(top[i].userId).catch(() => null);
        desc += `✦ ${i + 1}. ${user?.username || top[i].userId} - Nivel ${top[i].level} (${top[i].xp} XP)\n`;
      }

      if (!top.length) desc += 'Ninguem entrou no ranking ainda.';

      const embed = new EmbedBuilder()
        .setColor('#111111')
        .setDescription(desc);

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (command === 'leveladmin') {
      const sub = interaction.options.getSubcommand();
      const user = interaction.options.getUser('usuario');

      if (sub === 'setlevel') {
        const level = interaction.options.getInteger('nivel');
        await XP.findOneAndUpdate(
          { guildId: interaction.guild.id, userId: user.id },
          { guildId: interaction.guild.id, userId: user.id, level, xp: 0 },
          { upsert: true }
        );
        return interaction.reply({ content: `Nivel de ${user.tag} definido para ${level}.`, ephemeral: true });
      }

      await XP.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: user.id },
        { guildId: interaction.guild.id, userId: user.id, level: 1, xp: 0 },
        { upsert: true }
      );
      return interaction.reply({ content: `Nivel de ${user.tag} resetado.`, ephemeral: true });
    }

    if (command === 'daily') {
      const config = await ensureConfig(interaction.guild.id);
      const wallet = await getWallet(interaction.guild.id, interaction.user.id);
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      if (wallet.lastDailyAt && now - wallet.lastDailyAt.getTime() < day) {
        const remaining = day - (now - wallet.lastDailyAt.getTime());
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        return interaction.reply({ content: `Você já coletou hoje. Tente novamente em ${hours}h.`, ephemeral: true });
      }

      wallet.coins += config.economy.dailyAmount;
      wallet.lastDailyAt = new Date();
      await wallet.save();

      await interaction.reply(`Você coletou ${config.economy.dailyAmount} moedas. Saldo: ${wallet.coins}.`);
      return;
    }

    if (command === 'balance') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const wallet = await getWallet(interaction.guild.id, user.id);
      await interaction.reply(`${user} possui ${wallet.coins} moedas.`);
      return;
    }

    if (command === 'avatar') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`Avatar de ${user.username}`)
        .setImage(user.displayAvatarURL({ size: 1024 }));

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (command === 'userinfo') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(user.tag)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'Conta criada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Entrou no servidor', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconhecido', inline: true }
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (command === 'serverinfo') {
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(interaction.guild.name)
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          { name: 'ID', value: interaction.guild.id, inline: true },
          { name: 'Membros', value: String(interaction.guild.memberCount), inline: true },
          { name: 'Criado', value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (command === 'embed') {
      const title = interaction.options.getString('titulo');
      const description = interaction.options.getString('descricao');
      const channel = interaction.options.getChannel('canal');
      const color = interaction.options.getString('cor') || '#2b2d31';
      const image = interaction.options.getString('imagem');

      const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description);
      if (image) embed.setImage(image);

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: 'Embed enviado.', ephemeral: true });
      return;
    }

    if (command === 'ticket') {
      const channel = interaction.options.getChannel('canal');
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Suporte Noctra')
        .setDescription('Abra um ticket para falar com a staff.');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('Abrir ticket').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Painel de ticket enviado.', ephemeral: true });
      return;
    }
 if (command === 'comoajudar') {
  const channel = interaction.guild.channels.cache.get(COMO_AJUDAR_CHANNEL_ID);

  if (!channel) {
    return interaction.reply({
      content: 'Canal de como ajudar não encontrado.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#111111')
    .setTitle('📌 Como ajudar a Noctra Core')
    .setDescription(
      `A Noctra Core cresce com a ajuda de cada membro da comunidade.\n` +
      `Mesmo pequenas ações fazem diferença para manter o servidor ativo, organizado e cheio de novidades.\n\n` +

      `✦ **Formas de ajudar:**\n\n` +

      `❖ **Indique obras**\n` +
      `Conhece algum Yuri, Yaoi, GL ou BL que ainda não está no site?\n` +
      `Envie sua sugestão no canal de pedidos.\n\n` +

      `❖ **Reporte problemas**\n` +
      `Encontrou capítulo com erro, imagem quebrada, link errado ou página com problema?\n` +
      `Avise a staff para corrigirmos o quanto antes.\n\n` +

      `❖ **Envie sugestões**\n` +
      `Ideias para melhorar o site, o servidor, os canais ou os sistemas são sempre bem-vindas.\n\n` +

      `❖ **Divulgue a Noctra**\n` +
      `Convide amigos que gostam de leitura, manhwas, mangás e novels.\n` +
      `Quanto mais leitores, mais viva a comunidade fica.\n\n` +

      `❖ **Participe do servidor**\n` +
      `Comente, reaja às postagens, participe das conversas e ajude a manter o ambiente acolhedor.\n\n` +

      `❖ **Ajude a equipe**\n` +
      `Se você sabe traduzir, revisar, editar, limpar páginas ou organizar conteúdos, veja os canais de recrutamento.\n\n` +

      `────────────────────\n` +
      `Noctra Core • Toda ajuda fortalece a comunidade`
    )
    .setFooter({
      text: 'Noctra Core'
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Fazer pedido')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/1334696250070663231/1503133804477419530'),

    new ButtonBuilder()
      .setLabel('Enviar sugestão')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/1334696250070663231/1508246866909986947'),

    new ButtonBuilder()
      .setLabel('Candidatar-se')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/1334696250070663231/1502761123852849212')
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: `Painel de como ajudar enviado em ${channel}.`,
    ephemeral: true
  });

  return;
}   
if (command === 'pedidos') {

const channel = interaction.guild.channels.cache.get(pedidosChannelId);

if (!channel) {
  return interaction.reply({
    content: 'Canal de pedidos não encontrado.',
    ephemeral: true
  });
}

const embed = new EmbedBuilder()
.setColor('#111111')
.setTitle('☾ Pedidos de Obras • Noctra Core')
.setDescription(
`✦ Aqui você pode enviar pedidos de obras Yuri/Yaoi para adicionarmos futuramente ao site.\n\n` +

`❖ Antes de enviar, verifique se outra pessoa já não fez o mesmo pedido.\n\n` +

`✦ Caso a obra já tenha sido solicitada, apenas aguarde até que ela seja adicionada ao site.\n\n` +

`☾ Nossa equipe analisa todos os pedidos enviados.\n\n` +

`────────────────────\n` +
`Noctra Core • Sistema de Pedidos`
)
.setFooter({
  text: 'Noctra Core'
});

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId('abrir_pedido')
.setLabel('Enviar pedido')
.setStyle(ButtonStyle.Primary)
);

await channel.send({
embeds: [embed],
components: [row]
});

await interaction.reply({
content: 'Painel de pedidos enviado.',
ephemeral: true
});

return;
}
    if (command === 'denuncias') {
  const channel = interaction.guild.channels.cache.get(DENUNCIAS_CHANNEL_ID);

  if (!channel) {
    return interaction.reply({
      content: 'Canal de denúncias não encontrado.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle('⚠️ Denúncias • Noctra Core')
    .setDescription(
      `✦ Utilize este sistema para denunciar situações que prejudiquem a comunidade da Noctra Core.\n\n` +
      `❖ Você pode denunciar:\n` +
      `• assédio ou perseguição\n` +
      `• preconceito e discriminação\n` +
      `• spam ou divulgação indevida\n` +
      `• comportamento tóxico\n` +
      `• conteúdo inadequado\n` +
      `• descumprimento das regras\n\n` +
      `✦ Ao enviar uma denúncia, informe o máximo de detalhes possíveis.\n\n` +
      `❖ Caso tenha provas, como prints, links ou vídeos, envie junto.\n\n` +
      `☾ Todas as denúncias são analisadas pela staff com discrição.\n\n` +
      `────────────────────\n` +
      `Noctra Core • Sistema de Denúncias`
    )
    .setFooter({
      text: 'Noctra Core • Staff Oficial'
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_denuncia')
      .setLabel('Enviar denúncia')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️')
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: `Painel de denúncias enviado em ${channel}.`,
    ephemeral: true
  });

  return;
}
    if (command === 'sugestoes') {

  const channel = interaction.guild.channels.cache.get(SUGESTOES_CHANNEL_ID);

  if (!channel) {
    return interaction.reply({
      content: 'Canal de sugestões não encontrado.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#111111')
    .setTitle('💡 Sugestões • Noctra Core')
    .setDescription(
      `✦ Aqui você pode enviar sugestões para melhorar a Noctra Core.\n\n` +

      `❖ Pode sugerir melhorias para o site, servidor, canais, sistema de leitura, eventos ou qualquer ideia que ajude a comunidade.\n\n` +

      `✦ Antes de enviar, veja se alguém já sugeriu algo parecido.\n\n` +

      `☾ Nossa equipe irá analisar todas as sugestões com carinho.\n\n` +

      `────────────────────\n` +
      `Noctra Core • Sistema de Sugestões`
    )
    .setFooter({
      text: 'Noctra Core'
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('enviar_sugestao')
      .setLabel('Enviar sugestão')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💡')
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: 'Painel de sugestões enviado.',
    ephemeral: true
  });

  return;
}
    if (command === 'roles') {
      const channel = interaction.options.getChannel('canal');
      const roles = ['cargo1', 'cargo2', 'cargo3']
        .map(name => interaction.options.getRole(name))
        .filter(Boolean);

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`role_menu:${roles.map(role => role.id).join(',')}`)
        .setPlaceholder('Escolha seus cargos')
        .setMinValues(0)
        .setMaxValues(roles.length)
        .addOptions(roles.map(role => ({ label: role.name, value: role.id })));

      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Cargos')
        .setDescription('Selecione os cargos que deseja receber.');

      await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      await interaction.reply({ content: 'Painel de cargos enviado.', ephemeral: true });
      return;
    }

    if (command === 'config') {
      const sub = interaction.options.getSubcommand();
      await ensureConfig(interaction.guild.id);

      if (sub === 'canal') {
        const field = interaction.options.getString('tipo');
        const channel = interaction.options.getChannel('canal');
        await GuildConfig.updateOne({ guildId: interaction.guild.id }, { $set: { [field]: channel.id } });
        return interaction.reply({ content: `Configurado: ${field} = ${channel}.`, ephemeral: true });
      }

      if (sub === 'cargo') {
        const field = interaction.options.getString('tipo');
        const role = interaction.options.getRole('cargo');
        await GuildConfig.updateOne({ guildId: interaction.guild.id }, { $set: { [field]: role.id } });
        return interaction.reply({ content: `Configurado: ${field} = ${role}.`, ephemeral: true });
      }

      if (sub === 'regras') {
        const emoji = interaction.options.getString('emoji');
        await GuildConfig.updateOne({ guildId: interaction.guild.id }, { $set: { rulesEmoji: emoji } });
        return interaction.reply({ content: `Emoji das regras configurado para ${emoji}.`, ephemeral: true });
      }

      if (sub === 'levelrole') {
        const level = interaction.options.getInteger('nivel');
        const role = interaction.options.getRole('cargo');
        await GuildConfig.updateOne({ guildId: interaction.guild.id }, { $set: { [`levelRoles.${level}`]: role.id } });
        return interaction.reply({ content: `Nivel ${level} agora da o cargo ${role}.`, ephemeral: true });
      }
      const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
      return interaction.reply({
        content: [
          `Boas-vindas: ${config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'nao definido'}`,
          `Saida: ${config.exitChannelId ? `<#${config.exitChannelId}>` : 'nao definido'}`,
          `Logs: ${config.logChannelId ? `<#${config.logChannelId}>` : 'nao definido'}`,
          `Regras: ${config.rulesChannelId ? `<#${config.rulesChannelId}>` : 'nao definido'}`,
          `Visitante: ${config.visitorRoleId ? `<@&${config.visitorRoleId}>` : 'nao definido'}`,
          `Membro: ${config.memberRoleId ? `<@&${config.memberRoleId}>` : 'nao definido'}`,
          `Staff: ${config.staffRoleId ? `<@&${config.staffRoleId}>` : 'nao definido'}`
        ].join('\n'),
        ephemeral: true
      });
    }
  } catch (error) {
    console.log('Erro em interactionCreate:', error);
    const payload = { content: 'Algo deu errado ao executar isso.', ephemeral: true };
    if (interaction.replied || interaction.deferred) interaction.followUp(payload).catch(() => {});
    else interaction.reply(payload).catch(() => {});
  }
});

// ================= SERVIDOR WEB RENDER =================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Mimi online!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor web ativo na porta ${PORT}`);
});

// ================= ONLINE =================
startBot();


