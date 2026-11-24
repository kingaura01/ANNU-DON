// ANNU DON - Quick Tools
// 12 dependable commands with no external API dependency.
const { waqar, commands } = require('../waqar');
const config = require('../settings');

const box = (title, lines) => [
  `╭────────── ${title} ──────────╮`,
  ...lines.map(line => `│ ${line}`),
  '╰──────────────────────────────╯',
  '> ANNU DON'
].join('\n');

waqar({ pattern: 'health', alias: ['checkbot', 'statusbot'], desc: 'Show bot health and connection status', category: 'utility', react: '✅', filename: __filename }, async (conn, mek, m, { reply }) => {
  const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
  await reply(box('BOT HEALTH', [`✅ Status: Online`, `⏱️ Uptime: ${Math.floor(process.uptime())} seconds`, `💾 Memory: ${mem} MB`, `📦 Commands: ${commands.length}`]));
});

waqar({ pattern: 'runtimeinfo', alias: ['up', 'uptime2'], desc: 'Show detailed uptime', category: 'utility', react: '⏱️', filename: __filename }, async (conn, mek, m, { reply }) => {
  const total = Math.floor(process.uptime());
  const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), min = Math.floor((total % 3600) / 60), sec = total % 60;
  await reply(box('RUNTIME', [`📅 ${d} days`, `⏰ ${h} hours`, `⏱️ ${min} minutes`, `⚡ ${sec} seconds`]));
});

waqar({ pattern: 'myid', alias: ['senderid', 'number'], desc: 'Show your WhatsApp number', category: 'utility', react: '🆔', filename: __filename }, async (conn, mek, m, { sender, reply }) => {
  await reply(box('YOUR ID', [`📱 ${sender || m.sender || 'Unknown'}`]));
});

waqar({ pattern: 'chatid', alias: ['cid2', 'remoteid'], desc: 'Show current chat ID', category: 'utility', react: '🆔', filename: __filename }, async (conn, mek, m, { from, reply }) => {
  await reply(box('CHAT ID', [`💬 ${from}`]));
});

waqar({ pattern: 'ownerinfo', alias: ['owner2', 'contactowner'], desc: 'Show owner contact details', category: 'owner', react: '👑', filename: __filename }, async (conn, mek, m, { reply }) => {
  const number = Array.isArray(config.OWNER_NUMBER) ? config.OWNER_NUMBER[0] : String(config.OWNER_NUMBER || '923235605702');
  await reply(box('OWNER', [`👑 ${config.OWNER_NAME || 'ANNU DON'}`, `📱 wa.me/${number}`, `📢 ${config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbEHpir6mYPSxtiCRs2q'}`]));
});

waqar({ pattern: 'mychannel', alias: ['channelinfo', 'channeljid2'], desc: 'Resolve and follow the configured channel', category: 'owner', react: '📢', filename: __filename }, async (conn, mek, m, { reply }) => {
  try {
    const link = String(config.CHANNEL_LINK || '').trim();
    const match = link.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
    if (!match) return reply('❌ CHANNEL_LINK invalid hai.');
    const meta = await conn.newsletterMetadata('invite', match[1]);
    if (!meta || !meta.id) return reply('❌ Channel metadata/JID resolve nahi ho saki.');
    try { if (typeof conn.newsletterFollow === 'function') await conn.newsletterFollow(meta.id); } catch (_) {}
    await reply(box('MY CHANNEL', [`📢 Name: ${meta.name || 'ANNU DON'}`, `🆔 JID: ${meta.id}`, `🔗 Link: ${link}`, `✅ Bot: Follow request sent`]));
  } catch (error) {
    await reply(`❌ Channel error: ${error.message}`);
  }
});

waqar({ pattern: 'groupinfo2', alias: ['ginfo2', 'chatinfo'], desc: 'Show current group details', category: 'group', react: '👥', filename: __filename }, async (conn, mek, m, { isGroup, groupName, participants, reply }) => {
  if (!isGroup) return reply('❌ Yeh command sirf group mein use hoti hai.');
  const list = Array.isArray(participants) ? participants : [];
  const admins = list.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length;
  await reply(box('GROUP INFO', [`📌 Name: ${groupName || 'Unknown'}`, `👥 Members: ${list.length}`, `🛡️ Admins: ${admins}`]));
});

waqar({ pattern: 'now', alias: ['time2', 'date2'], desc: 'Show Pakistan date and time', category: 'utility', react: '🕐', filename: __filename }, async (conn, mek, m, { reply }) => {
  const now = new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
  await reply(box('PAKISTAN TIME', [`🕐 ${now}`]));
});

waqar({ pattern: 'say', alias: ['echo'], desc: 'Repeat supplied text', category: 'fun', react: '💬', filename: __filename }, async (conn, mek, m, { text, reply }) => {
  if (!text) return reply('Usage: .say your text');
  await reply(`💬 ${text}\n\n> ANNU DON`);
});

waqar({ pattern: 'choose', alias: ['pick'], desc: 'Choose one option randomly', category: 'fun', react: '🎯', filename: __filename }, async (conn, mek, m, { text, reply }) => {
  const options = String(text || '').split('|').map(x => x.trim()).filter(Boolean);
  if (options.length < 2) return reply('Usage: .choose option 1 | option 2 | option 3');
  await reply(`🎯 Choice: *${options[Math.floor(Math.random() * options.length)]}*\n\n> ANNU DON`);
});

waqar({ pattern: 'coin', alias: ['flipcoin'], desc: 'Flip a coin', category: 'fun', react: '🪙', filename: __filename }, async (conn, mek, m, { reply }) => {
  await reply(`🪙 Coin: *${Math.random() < 0.5 ? 'Heads' : 'Tails'}*\n\n> ANNU DON`);
});

waqar({ pattern: 'roll', alias: ['dice2'], desc: 'Roll a six-sided dice', category: 'fun', react: '🎲', filename: __filename }, async (conn, mek, m, { reply }) => {
  await reply(`🎲 Dice: *${Math.floor(Math.random() * 6) + 1}*\n\n> ANNU DON`);
});

waqar({ pattern: 'allcmds', alias: ['allcommands', 'commandlist'], desc: 'Show all available commands', category: 'main', react: '📚', filename: __filename }, async (conn, mek, m, { reply }) => {
  const unique = [...new Set(commands.filter(c => !c.dontAddCommandList && c.pattern).map(c => c.pattern))].sort();
  const prefix = config.PREFIX || '.';
  const lines = [];
  for (let i = 0; i < unique.length; i += 3) lines.push(unique.slice(i, i + 3).map(c => `${prefix}${c}`).join('  '));
  await reply(box(`ALL COMMANDS (${unique.length})`, lines));
});

waqar({ pattern: 'menu_pdf', alias: ['pdfmenu'], desc: 'Show PDF tools', category: 'menu', react: '📚', filename: __filename }, async (conn, mek, m, { reply }) => {
  await reply(box('PDF TOOLS', ['📚 .pdflist', '🔗 .pdfurl <url>', '⚙️ .pdfsettings', '📖 .lyricsdoc <song>', '', 'Use .allcmds for every command']));
});

console.log('[ANNU DON] Quick tools loaded: 12 commands');
