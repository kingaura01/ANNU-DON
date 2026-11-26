const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const MAX_STATUS_BYTES = 64 * 1024 * 1024;
const forwardedStatusIds = new Set();

function shouldMarkStatusVisible(autoSeen, autoSave) {
  return autoSeen === 'true' || autoSave === 'true';
}

function unwrapStatusMessage(input) {
  let current = input?.message || input;
  for (let depth = 0; current && depth < 8; depth++) {
    const viewOnce = current.viewOnceMessage || current.viewOnceMessageV2 || current.viewOnceMessageV2Extension;
    if (viewOnce?.message) return { content: null, blocked: 'view-once' };
    const nested = current.ephemeralMessage?.message || current.documentWithCaptionMessage?.message || current.message;
    if (!nested || nested === current) break;
    current = nested;
  }
  return { content: current || null, blocked: null };
}

function extractStatusContent(input) {
  const { content, blocked } = unwrapStatusMessage(input);
  if (blocked) return { blocked };
  if (!content) return null;

  for (const [key, type] of [['imageMessage', 'image'], ['videoMessage', 'video'], ['audioMessage', 'audio']]) {
    const media = content[key];
    if (media) {
      if (media.viewOnce) return { blocked: 'view-once' };
      return {
        type,
        media,
        text: media.caption || '',
        mimetype: media.mimetype || (type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mpeg'),
        ptt: Boolean(media.ptt),
        fileLength: Number(media.fileLength || media.size || 0),
      };
    }
  }

  const text = content.conversation || content.extendedTextMessage?.text || '';
  return text ? { type: 'text', text } : null;
}

async function readMediaLimited(media, type, maxBytes = MAX_STATUS_BYTES) {
  const stream = await downloadContentFromMessage(media, type);
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > maxBytes) {
      stream.destroy?.();
      throw new RangeError('Status media exceeds the 64 MB save limit.');
    }
    chunks.push(chunk);
  }
  if (!total) throw new Error('No status media data was returned.');
  return Buffer.concat(chunks, total);
}

function normalizeJid(jid) {
  return String(jid || '').trim().toLowerCase().replace(/:\d+(?=@)/, '');
}

async function sendVisibleStatusCopy(conn, statusMessage, recipientJid) {
  const statusKey = statusMessage?.key || {};
  const id = String(statusKey.id || '');
  const key = `${normalizeJid(recipientJid)}:${id}`;
  if (id && forwardedStatusIds.has(key)) return { skipped: 'duplicate' };

  const item = extractStatusContent(statusMessage?.message);
  if (!item) return { skipped: 'unsupported' };
  if (item.blocked) return { skipped: item.blocked };
  if (item.fileLength > MAX_STATUS_BYTES) throw new RangeError('Status media exceeds the 64 MB save limit.');

  let payload;
  if (item.type === 'text') {
    payload = { text: `💾 Status copy (status view is visible to its owner):\n\n${item.text}` };
  } else {
    const buffer = await readMediaLimited(item.media, item.type);
    const caption = `💾 Status copy (status view is visible to its owner).${item.text ? `\n\n${item.text}` : ''}`;
    if (item.type === 'image') payload = { image: buffer, mimetype: item.mimetype, caption };
    else if (item.type === 'video') payload = { video: buffer, mimetype: item.mimetype, caption };
    else payload = { audio: buffer, mimetype: item.mimetype, ptt: item.ptt };
  }

  await conn.sendMessage(recipientJid, payload);
  if (id) {
    forwardedStatusIds.add(key);
    if (forwardedStatusIds.size > 1000) forwardedStatusIds.delete(forwardedStatusIds.values().next().value);
  }
  return { sent: true, type: item.type };
}

module.exports = { extractStatusContent, sendVisibleStatusCopy, shouldMarkStatusVisible, MAX_STATUS_BYTES };
