'use strict';

const { waqar } = require('../waqar');
const { postJson } = require('../lib/media-api');

function box(title, rows) {
  const body = rows.map(([emoji, label, value]) => `│  ✿ ${emoji} ${label}: ${value || ''}`).join('\n');
  return `╭────────────────────◇\n│  ✿ ${title} ✿\n│  ✌︎㋡━━━━━━━━━✌︎㋡\n${body}\n╰────────────────────○\n\n> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;
}

const stylizedChars = {
  a: '🅰', b: '🅱', c: '🅲', d: '🅳', e: '🅴', f: '🅵', g: '🅶', h: '🅷', i: '🅸',
  j: '🅹', k: '🅺', l: '🅻', m: '🅼', n: '🅽', o: '🅾', p: '🅿', q: '🆀', r: '🆁',
  s: '🆂', t: '🆃', u: '🆄', v: '🆅', w: '🆆', x: '🆇', y: '🆈', z: '🆉',
  '0': '⓿', '1': '❶', '2': '❷', '3': '❸', '4': '❹', '5': '❺', '6': '❻', '7': '❼', '8': '❽', '9': '❾',
};

waqar({
  pattern: 'chreact',
  alias: ['channelreact'],
  desc: 'Send one reaction to a WhatsApp Channel post',
  category: 'channel',
  react: '🌸',
  filename: __filename,
}, async (_conn, _mek, _m, { text, isOwner, isCreator, reply }) => {
  if (!isOwner && !isCreator) return reply('Only the bot owner can use this command.');
  const input = String(text || '').trim();
  const match = input.match(/https?:\/\/whatsapp\.com\/channel\/[^\s]+/i);
  if (!match) return reply('Usage: .chreact <WhatsApp channel post link> [emoji]\nExample: .chreact https://whatsapp.com/channel/CODE/POST ❤️');
  const url = match[0].replace(/[),.]+$/, '');
  const emoji = input.slice(input.indexOf(match[0]) + match[0].length).trim().split(/\s+/)[0] || '❤️';

  try {
    const result = await postJson('/api/v1/chreact/single', { url, count: 1, emojis: emoji });
    return reply(`✅ Reaction request completed.\nPost: ${url}\nEmoji: ${emoji}\n${result.message || result.statusMessage || ''}`.trim());
  } catch (error) {
    console.error('[Channel react] Error:', error.stack || error.message);
    return reply(`Channel reaction failed: ${error.message}`);
  }
});

waqar({
  pattern: 'chr',
  alias: ['channeltextreact'],
  desc: 'Send a stylized text reaction to a channel post',
  category: 'owner',
  react: '🌸',
  filename: __filename,
}, async (conn, _mek, _m, { q, isOwner, isCreator, reply }) => {
  if (!isOwner && !isCreator) return reply('Only the bot owner can use this command.');
  const input = String(q || '').trim();
  const match = input.match(/https?:\/\/whatsapp\.com\/channel\/([\w-]+)\/([\w-]+)/i);
  if (!match) return reply('Usage: .chr <channel post link> <text>');
  const text = input.slice(match.index + match[0].length).trim();
  if (!text) return reply('Please provide the text to convert into stylized characters.');
  const reaction = text.toLowerCase().split('').map(char => char === ' ' ? '—' : stylizedChars[char] || char).join('');

  try {
    const metadata = await conn.newsletterMetadata('invite', match[1]);
    if (!metadata?.id) return reply('Channel not found.');
    await conn.newsletterReactMessage(metadata.id, match[2], reaction);
    return reply(box('CHANNEL TEXT REACTION', [
      ['✅', 'Status', 'Reaction sent'],
      ['📢', 'Channel', metadata.name],
      ['🔤', 'Reaction', reaction],
    ]));
  } catch (error) {
    console.error('[Channel text reaction] Error:', error.stack || error.message);
    return reply(`Channel reaction failed: ${error.message}`);
  }
});

waqar({
  pattern: 'chreactweekly',
  alias: ['weeklychreact'],
  desc: 'Enable one automatic reaction per new channel post for seven days',
  category: 'owner',
  react: '📅',
  filename: __filename,
}, async (_conn, _mek, _m, { text, isOwner, isCreator, reply }) => {
  if (!isOwner && !isCreator) return reply('Only the bot owner can use this command.');
  const input = String(text || '').trim();
  const match = input.match(/https?:\/\/whatsapp\.com\/channel\/[\w-]+/i);
  if (!match) return reply('Usage: .chreactweekly <WhatsApp channel link> [emoji]');
  const url = match[0].replace(/[),.]+$/, '');
  const emoji = input.slice(input.indexOf(match[0]) + match[0].length).trim().split(/\s+/)[0] || '❤️';
  try {
    const result = await postJson('/api/v1/chreact/weekly', { url, count: 1, emojis: emoji });
    return reply(`✅ Seven-day channel reaction request accepted.\nChannel: ${url}\nOne reaction per new post: ${emoji}\n${result.message || result.statusMessage || ''}`.trim());
  } catch (error) {
    console.error('[Weekly channel react] Error:', error.stack || error.message);
    return reply(`Weekly channel reaction setup failed: ${error.message}`);
  }
});

waqar({
  pattern: 'cid',
  alias: ['channelid', 'cinfo'],
  desc: 'Get channel info from link',
  category: 'utility',
  react: '🌸',
  filename: __filename,
}, async (conn, _mek, _m, { q, reply }) => {
  const match = String(q || '').match(/whatsapp\.com\/channel\/([\w-]+)/i);
  if (!match) return reply('Provide a valid WhatsApp channel invite link.');
  try {
    const metadata = await conn.newsletterMetadata('invite', match[1]);
    if (!metadata?.id) return reply('Channel not found.');
    return reply(box('CHANNEL INFO', [
      ['🆔', 'ID', metadata.id],
      ['📌', 'Name', metadata.name],
      ['👥', 'Followers', metadata.subscribers?.toLocaleString() || 'N/A'],
      ['📅', 'Created', metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString() : 'Unknown'],
    ]));
  } catch (error) {
    console.error('[Channel info] Error:', error.stack || error.message);
    return reply(`Channel lookup failed: ${error.message}`);
  }
});

console.log('ANNU-DON channel plugins loaded.');
