'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { waqar } = require('../waqar');

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 8 && current; i++) {
    current = current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message ||
      current.documentWithCaptionMessage?.message ||
      current.message || current;
  }
  return current;
}

function getQuotedMessage(mek, context) {
  return context?.quoted?.msg || context?.quoted ||
    mek?.quoted?.msg || mek?.quoted ||
    mek?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

waqar({
  pattern: 'vv',
  alias: ['viewonce'],
  desc: 'Download view-once image, video or audio',
  category: 'download',
  react: '👁️',
  filename: __filename,
}, async (conn, mek, _m, context) => {
  const { from, reply } = context;
  const quoted = getQuotedMessage(mek, context);
  if (!quoted) return reply('❌ Please reply to a View-Once message.');

  const message = unwrapMessage(quoted);
  const mediaType = ['imageMessage', 'videoMessage', 'audioMessage']
    .find(type => message?.[type]);
  if (!mediaType) return reply('❌ Not a View-Once image, video or audio message.');

  try {
    const media = message[mediaType];
    const stream = await downloadContentFromMessage(media, mediaType.replace('Message', ''));
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (!buffer.length) throw new Error('Downloaded media is empty.');

    if (mediaType === 'imageMessage') {
      await conn.sendMessage(from, {
        image: buffer,
        caption: '✅ View-Once Image Downloaded',
        mimetype: media.mimetype || 'image/jpeg',
      }, { quoted: mek });
    } else if (mediaType === 'videoMessage') {
      await conn.sendMessage(from, {
        video: buffer,
        caption: '✅ View-Once Video Downloaded',
        mimetype: media.mimetype || 'video/mp4',
      }, { quoted: mek });
    } else {
      await conn.sendMessage(from, {
        audio: buffer,
        mimetype: media.mimetype || 'audio/mp4',
        ptt: Boolean(media.ptt),
      }, { quoted: mek });
    }
  } catch (error) {
    console.error('[VV] View-once download error:', error.stack || error.message);
    await reply('❌ Failed to download View-Once media.');
  }
});

module.exports = { unwrapMessage };
