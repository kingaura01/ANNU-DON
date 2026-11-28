'use strict';

const {
  downloadContentFromMessage,
  normalizeMessageContent,
} = require('@whiskeysockets/baileys');
const { waqar } = require('../waqar');

function unwrapMessage(input) {
  let current = input?.msg || input?.message || input;
  for (let i = 0; i < 10 && current; i++) {
    const normalized = normalizeMessageContent(current) || current;
    if (normalized === current) break;
    current = normalized;
  }
  return current || {};
}

function getQuotedMessage(mek, context) {
  return context?.quoted?.msg || context?.quoted?.message || context?.quoted ||
    mek?.quoted?.msg || mek?.quoted?.message || mek?.quoted ||
    mek?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    mek?.message?.conversation?.contextInfo?.quotedMessage;
}

function findMedia(message) {
  const content = unwrapMessage(message);
  const types = [
    ['imageMessage', 'image'],
    ['videoMessage', 'video'],
    ['audioMessage', 'audio'],
    ['documentMessage', 'document'],
  ];
  for (const [key, type] of types) {
    if (content[key]) return { content, key, type, media: content[key] };
  }
  return null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadMedia(mediaInfo, quoted) {
  try {
    const buffer = await streamToBuffer(
      await downloadContentFromMessage(mediaInfo.media, mediaInfo.type)
    );
    if (buffer.length) return buffer;
  } catch (error) {
    console.error('[VV] Direct download error:', error.message);
  }

  if (typeof quoted?.download === 'function') {
    try {
      const buffer = await quoted.download();
      if (buffer?.length) return buffer;
    } catch (error) {
      console.error('[VV] Quoted download error:', error.message);
    }
  }
  return null;
}

waqar({
  pattern: 'vv',
  alias: ['viewonce'],
  desc: 'Download view-once image, video, audio or document',
  category: 'download',
  react: '👁️',
  filename: __filename,
}, async (conn, mek, _m, context) => {
  const { from, reply } = context;
  const quoted = getQuotedMessage(mek, context);
  if (!quoted) return reply('❌ View-Once message par reply karke `.vv` bhejein.');

  const mediaInfo = findMedia(quoted);
  if (!mediaInfo) {
    return reply('❌ View-Once image, video, audio ya document par reply karein.');
  }

  try {
    const buffer = await downloadMedia(mediaInfo, context.quoted);
    if (!buffer?.length) throw new Error('Downloaded media is empty.');

    const media = mediaInfo.media;
    if (mediaInfo.type === 'image') {
      await conn.sendMessage(from, {
        image: buffer,
        caption: '✅ View-Once Image Downloaded',
        mimetype: media.mimetype || 'image/jpeg',
      }, { quoted: mek });
    } else if (mediaInfo.type === 'video') {
      await conn.sendMessage(from, {
        video: buffer,
        caption: '✅ View-Once Video Downloaded',
        mimetype: media.mimetype || 'video/mp4',
      }, { quoted: mek });
    } else if (mediaInfo.type === 'audio') {
      await conn.sendMessage(from, {
        audio: buffer,
        mimetype: media.mimetype || 'audio/mp4',
        ptt: Boolean(media.ptt),
      }, { quoted: mek });
    } else {
      await conn.sendMessage(from, {
        document: buffer,
        fileName: media.fileName || 'view-once-file',
        mimetype: media.mimetype || 'application/octet-stream',
        caption: '✅ View-Once Document Downloaded',
      }, { quoted: mek });
    }
  } catch (error) {
    console.error('[VV] View-once download error:', error.stack || error.message);
    await reply('❌ View-Once media download nahi ho saki. Dobara reply karke try karein.');
  }
});

module.exports = { unwrapMessage, findMedia };
