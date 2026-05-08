require('dotenv').config();

const {
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
  Routes
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const mongoose = require('mongoose');

// ================= ENV =================
const token = process.env.TOKEN;
const mongoUrl = process.env.MONGO_URL;
const clientId = process.env.CLIENT_ID || '1499822762590736586';
const guildId = process.env.GUILD_ID || '1334696250070663231';

if (!token || !mongoUrl || !clientId) {
  console.log('Preencha TOKEN, MONGO_URL e CLIENT_ID no arquivo .env');
  process.exit(1);
}

// ================= CONFIG PADRAO =================
const DEFAULT_CONFIG = {
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '1499879825006002216',
  exitChannelId: process.env.EXIT_CHANNEL_ID || '1499886649234948106',
  logChannelId: process.env.LOG_CHANNEL_ID || '1500255471410479154',
  rulesChannelId: process.env.RULES_CHANNEL_ID || '1361360073774989604',
  rulesEmoji: process.env.RULES_EMOJI || '✅',
  howItWorksChannelId: process.env.HOW_IT_WORKS_CHANNEL_ID || '1500264326802702557',
  visitorRoleId: process.env.VISITOR_ROLE_ID || '1500224581145858090',
  memberRoleId: process.env.MEMBER_ROLE_ID || '1334697264668741662',
  staffRoleId: process.env.STAFF_ROLE_ID || null,
 ticketCategoryId: process.env.TICKET_CATEGORY_ID || '1502083203408855050',
  levelRoles: {
    5: process.env.LEVEL_ROLE_5 || '1500290223366733976',
    10: process.env.LEVEL_ROLE_10 || '1500290952018001981',
    20: process.env.LEVEL_ROLE_20 || '1500291699518341330'
  },
  xpBlockedChannels: [],
  automod: {
    enabled: true,
    capsMinLength: 10,
    maxLength: 400,
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
mongoose.connect(mongoUrl)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => {
    console.log('ERRO MONGO:', err);
    process.exit(1);
  });

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannelId: String,
  exitChannelId: String,
  logChannelId: String,
  rulesChannelId: String,
  rulesEmoji: String,
  howItWorksChannelId: String,
  const HOW_IT_WORKS_MESSAGE_TITLE = '☾ Como funciona o sistema de nível';

function buildHowItWorksEmbed() {
  return new EmbedBuilder()
    .setColor('#111111')
    .setTitle(HOW_IT_WORKS_MESSAGE_TITLE)
    .setDescription(
      `Na Noctra, sua atividade dentro do servidor gera experiência automaticamente.\n\n` +
      `Ao conversar, participar da comunidade e interagir nos canais liberados, você acumula XP e aumenta seu nível com o tempo.\n\n` +
      `**Como funciona:**\n` +
      `✦ Envie mensagens e participe naturalmente.\n` +
      `✦ Cada interação pode conceder experiência.\n` +
      `✦ Ao subir de nível, você pode desbloquear cargos exclusivos.\n` +
      `✦ Quanto mais presente você for, maior será sua evolução na comunidade.\n\n` +
      `Evite spam ou mensagens repetidas. O sistema valoriza participação real, não flood.`
    )
    .setFooter({ text: 'Noctra Core • Evolua participando da comunidade' });
}

async function ensureHowItWorksMessage(guild) {
  const config = await ensureConfig(guild.id);
  if (!config.howItWorksChannelId) return;

  const channel = guild.channels.cache.get(config.howItWorksChannelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = buildHowItWorksEmbed();
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);

  const existingMessage = messages?.find(message =>
    message.author.id === client.user.id &&
    message.embeds?.[0]?.title === HOW_IT_WORKS_MESSAGE_TITLE
  );

  if (existingMessage) {
    await existingMessage.edit({ embeds: [embed] }).catch(() => {});
    await existingMessage.pin().catch(() => {});
    return;
  }

  const sentMessage = await channel.send({ embeds: [embed] });
  await sentMessage.pin().catch(() => {});
}

  visitorRoleId: String,
  memberRoleId: String,
  staffRoleId: String,
  ticketCategoryId: String,
  levelRoles: { type: Map, of: String, default: {} },
  xpBlockedChannels: { type: [String], default: [] },
  automod: {
    enabled: { type: Boolean, default: true },
    capsMinLength: { type: Number, default: 10 },
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

const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);
const XP = mongoose.model('XP', xpSchema);
const Warning = mongoose.model('Warning', warningSchema);
const Economy = mongoose.model('Economy', economySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const xpCooldown = new Map();
const spamMap = new Map();
const raidMap = new Map();

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
    { upsert: true, new: true }
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

const RULES_MESSAGE_TITLE = '☾ Regras da Noctra';

function buildRulesEmbed(config) {
  return new EmbedBuilder()
    .setColor('#111111')
    .setTitle(RULES_MESSAGE_TITLE)
    .setDescription(
      `Bem-vindo(a) à **Noctra**.\n\n` +
      `A Noctra é uma comunidade ligada ao nosso site de manhwa, criada para reunir leitores, acompanhar novidades, conversar sobre obras, receber avisos importantes e manter um espaço organizado para todos.\n\n` +
      `Antes de acessar o servidor completo, leia as regras abaixo com atenção. Ao reagir com ${config.rulesEmoji}, você confirma que entendeu e aceita seguir as diretrizes da comunidade.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**1. Respeito em primeiro lugar**\n` +
      `Trate todos os membros com educação. Ofensas, ataques pessoais, perseguição, preconceito, ameaças, assédio ou qualquer comportamento feito para constranger outra pessoa não serão tolerados.\n\n` +
      `**2. Use os canais corretamente**\n` +
      `Cada canal tem uma função. Conversas gerais, dúvidas, sugestões, avisos, suporte e conteúdos sobre manhwa devem ser enviados nos lugares adequados para manter o servidor limpo e fácil de navegar.\n\n` +
      `**3. Nada de spam, flood ou divulgação indevida**\n` +
      `Evite mensagens repetidas, excesso de emojis, menções desnecessárias, correntes, links suspeitos ou qualquer tipo de divulgação sem autorização da staff.\n\n` +
      `**4. Proibido conteúdo impróprio ou ilegal**\n` +
      `Não envie conteúdo NSFW, gore, links maliciosos, golpes, doxxing, ameaças, discurso de ódio ou qualquer material que viole as diretrizes do Discord.\n\n` +
      `**5. Spoilers devem ser sinalizados**\n` +
      `Ao comentar capítulos, finais, reviravoltas ou acontecimentos importantes de uma obra, use marcação de spoiler e avise de qual obra/capítulo está falando. Nem todos leem no mesmo ritmo.\n\n` +
      `**6. Sobre o site da Noctra**\n` +
      `Dúvidas, problemas de leitura, erros em capítulos, bugs no site ou sugestões devem ser enviados nos canais corretos ou em ticket. Descreva o problema com clareza para que a equipe consiga analisar melhor.\n\n` +
      `**7. Respeite a staff**\n` +
      `A equipe existe para organizar o servidor, ajudar membros e manter o ambiente seguro. Caso discorde de uma decisão, fale com calma pelo canal adequado ou abra um ticket.\n\n` +
      `**8. Proteja sua conta e sua privacidade**\n` +
      `Não compartilhe dados pessoais seus ou de outras pessoas. A staff nunca vai pedir senha, token, código de autenticação ou informações sensíveis.\n\n` +
      `**9. Siga os Termos do Discord**\n` +
      `Além das regras da Noctra, todos devem seguir os Termos de Serviço e as Diretrizes da Comunidade do Discord.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Acesso ao servidor**\n\n` +
      `Para liberar seu acesso completo, reaja abaixo com:\n\n` +
      `${config.rulesEmoji}\n\n` +
      `Após reagir, você receberá acesso aos canais da Noctra.\n\n` +
      `O descumprimento das regras pode resultar em aviso, mute, remoção de mensagens, expulsão ou banimento, dependendo da gravidade.`
    )
    .setFooter({ text: 'Noctra Core • Comunidade oficial de leitores' });
}

async function ensureRulesMessage(guild) {
  const config = await ensureConfig(guild.id);
  if (!config.rulesChannelId) return;

  const channel = guild.channels.cache.get(config.rulesChannelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = buildRulesEmbed(config);
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);

  const existingMessage = messages?.find(message =>
    message.author.id === client.user.id &&
    message.embeds?.[0]?.title === RULES_MESSAGE_TITLE
  );

  if (existingMessage) {
    await existingMessage.edit({ embeds: [embed] }).catch(() => {});
    if (!existingMessage.reactions.cache.has(config.rulesEmoji)) {
      await existingMessage.react(config.rulesEmoji).catch(() => {});
    }
    await existingMessage.pin().catch(() => {});
    return;
  }

  const sentMessage = await channel.send({ embeds: [embed] });
  await sentMessage.react(config.rulesEmoji).catch(() => {});
  await sentMessage.pin().catch(() => {});
}

function canModerate(interaction, targetMember, permission) {
  const moderator = interaction.member;
  const botMember = interaction.guild.members.me;

  if (!targetMember) return 'Usuário não encontrado no servidor.';
  if (targetMember.id === interaction.guild.ownerId) return 'Não posso punir o dono do servidor.';
  if (targetMember.id === interaction.user.id) return 'Você não pode punir a sí mesmo.';
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
    { upsert: true, new: true }
  );
}

async function addCoins(serverId, userId, amount) {
  return Economy.findOneAndUpdate(
    { guildId: serverId, userId },
    { $inc: { coins: amount }, $setOnInsert: { guildId: serverId, userId } },
    { upsert: true, new: true }
  );
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
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
        { name: 'regras', value: 'rulesChannelId' },
        { name: 'categoria-ticket', value: 'ticketCategoryId' }
      ))
      .addChannelOption(o => o.setName('canal').setDescription('Canal ou categoria.').setRequired(true)))
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
client.once('ready', async () => {
  console.log(`${client.user.tag} online!`);

  for (const guild of client.guilds.cache.values()) {
    await ensureConfig(guild.id);
    await ensureRulesMessage(guild);
    await ensureHowItWorksMessage(guild);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Comandos registrados no servidor.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Comandos globais registrados.');
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
      `✦ ${member}, foi marcado(a) pela escuridão da **Noctra Core**.\n☾ Não há luz.\n❖ Não há saída.`,
      `✧ ${member}, despertou no vazio...\n☾ Não há volta agora.`,
      `❖ ${member}, entrou na **Noctra Core**.\n☾ Tem certeza disso...?\n❖ Não há saída.`,
      `✦ ${member}, atravessou os portões da **Noctra Core**.\n☾ O vazio agora conhece seu nome.`,
      `☾ ${member}, foi consumido pela névoa da **Noctra Core**.\n❖ Não existe retorno para quem entra aqui.`,
      `✦ ${member}, despertou no coração da escuridão.\n☾ O silêncio daqui nunca dorme.`,
      `❖ ${member}, caiu nas profundezas da **Noctra Core**.\n☾ Agora você pertence ao desconhecido.`,
      `✦ ${member}, entrou na **Noctra Core**.\n☾ A escuridão observa cada passo seu.`,
      `☾ ${member}, foi marcado pelas sombras.\n❖ Não há luz no fim deste caminho.`,
      `✦ ${member}, abriu as portas do vazio.\n☾ A Noctra jamais esquece seus visitantes.`,
      `❖ ${member}, chegou à **Noctra Core**.\n☾ Onde almas curiosas desaparecem lentamente.`,
      `✦ ${member}, atravessou o limite entre realidade e caos.\n☾ Agora não existe mais volta.`,
       `☾ ${member}, entrou na **Noctra Core**.\n❖ O eco das sombras agora o acompanha.`
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

    if (msg.content.length > config.automod.capsMinLength && msg.content === msg.content.toUpperCase()) {
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
 if (interaction.customId === 'ticket_open') {
  await interaction.deferReply({ ephemeral: true });

  const config = await ensureConfig(interaction.guild.id);

  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.editReply('Eu preciso da permissão **Gerenciar canais** para abrir tickets.');
  }

  const existing = await Ticket.findOne({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    status: 'open'
  });

  if (existing) {
    return interaction.editReply(`Você já tem um ticket aberto: <#${existing.channelId}>`);
  }

const configuredTicketChannel = config.ticketCategoryId
  ? interaction.guild.channels.cache.get(config.ticketCategoryId)
  : null;

const category = configuredTicketChannel?.type === ChannelType.GuildCategory
  ? configuredTicketChannel
  : configuredTicketChannel?.parent || null;

if (config.ticketCategoryId && !category) {
  return interaction.editReply(
    'Não encontrei uma categoria para criar tickets. Configure uma categoria ou um canal que esteja dentro de uma categoria.'
  );
}

  const overwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: interaction.guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    }
  ];

  if (config.staffRoleId) {
    overwrites.push({
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  const safeName = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20) || interaction.user.id;

  const channel = await interaction.guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: category ? category.id : undefined,
    permissionOverwrites: overwrites,
    reason: `Ticket aberto por ${interaction.user.tag}`
  });

  await Ticket.create({
    guildId: interaction.guild.id,
    channelId: channel.id,
    userId: interaction.user.id
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Fechar ticket')
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor('#111111')
    .setTitle('☾ Ticket aberto')
    .setDescription(
      `${interaction.user}, descreva com calma o que você precisa.\n\n` +
      `A staff da Noctra vai responder assim que possível.`
    );

  await channel.send({ embeds: [embed], components: [closeRow] });
  await interaction.editReply(`Ticket criado: ${channel}`);
  await sendLog(interaction.guild, 'Ticket aberto', `${interaction.user} abriu ${channel}.`, '#5865f2');
  return;
}

      if (interaction.customId === 'ticket_close') {
        const ticket = await Ticket.findOne({ guildId: interaction.guild.id, channelId: interaction.channel.id, status: 'open' });
        if (!ticket) return interaction.reply({ content: 'Esse canal nao parece ser um ticket aberto.', ephemeral: true });

        const config = await ensureConfig(interaction.guild.id);
        const isOwner = ticket.userId === interaction.user.id;
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || (config.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId));
        if (!isOwner && !isStaff) return interaction.reply({ content: 'Voce nao pode fechar esse ticket.', ephemeral: true });

        await interaction.reply({ content: 'Fechando ticket e salvando transcript...', ephemeral: true });
        const transcript = await buildTranscript(interaction.channel).catch(() => '');

        ticket.status = 'closed';
        ticket.closedBy = interaction.user.id;
        ticket.closedAt = new Date();
        ticket.transcript = transcript.slice(0, 15000);
        await ticket.save();

        await sendLog(interaction.guild, 'Ticket fechado', `${interaction.user} fechou ${interaction.channel}.\nTranscript salvo no MongoDB.`, '#ed4245');
        await interaction.channel.delete('Ticket fechado').catch(() => {});
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
        { new: true }
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

let value = channel.id;

if (field === 'ticketCategoryId') {
  if (channel.type === ChannelType.GuildCategory) {
    value = channel.id;
  } else if (channel.parentId) {
    value = channel.parentId;
  } else {
    return interaction.reply({
      content: 'Para categoria-ticket, escolha uma categoria ou um canal que esteja dentro de uma categoria.',
      ephemeral: true
    });
  }
}

await GuildConfig.updateOne({ guildId: interaction.guild.id }, { $set: { [field]: value } });
return interaction.reply({ content: `Configurado: ${field} = <#${value}>.`, ephemeral: true });
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

// ================= ONLINE =================
client.login(token);
