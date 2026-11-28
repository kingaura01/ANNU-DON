// ============================================
// 🌸 VIEW ONCE PLUGIN - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// Reliable image/video/audio retrieval + optional auto trigger
// ============================================

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { fakevCard } = require('../lib/fakevCard');
const { waqar } = require('../waqar');
const config = require('../settings');

const positiveKeywords = [
  '🌸', '💖', '✨', '🎀', '💕', '💝', '🌺', '🦋', '🫅', '💗',
  'nice', 'good', 'cute', 'beautiful', 'gorgeous', 'lovely', 'wow',
  'super', 'amazing', '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍', '😍', '🥰', '🌝', '🥵', '💋', '👍', '🌚', '😩'
];

function unwrapViewOnce(input) {
    let current = input?.message || input;
    let isViewOnce = false;
    for (let i = 0; i < 8 && current; i++) {
        const viewOnce = current.viewOnceMessage || current.viewOnceMessageV2 ||
            current.viewOnceMessageV2Extension;
        const nested = viewOnce?.message || current.ephemeralMessage?.message ||
            current.documentWithCaptionMessage?.message || current.message;
        if (!nested || nested === current) break;
        if (viewOnce?.message) isViewOnce = true;
        current = nested;
    }
    const media = current || {};
    if (media.imageMessage?.viewOnce || media.videoMessage?.viewOnce ||
        media.audioMessage?.viewOnce || media.documentMessage?.viewOnce) isViewOnce = true;
    return { content: current, isViewOnce };
}

function getMedia(content) {
    if (!content) return null;
    if (content.imageMessage) return { type: 'image', message: content.imageMessage };
    if (content.videoMessage) return { type: 'video', message: content.videoMessage };
    if (content.audioMessage) return { type: 'audio', message: content.audioMessage };
    if (content.documentMessage) return { type: 'document', message: content.documentMessage };
    if (content.mimetype) {
        const type = String(content.mimetype).split('/')[0];
        if (['image', 'video', 'audio', 'document'].includes(type)) return { type, message: content };
    }
    return null;
}

async function downloadMedia(media, quoted) {
    try {
        const stream = await downloadContentFromMessage(media.message, media.type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        if (buffer.length) return buffer;
    } catch (error) {
        console.error('[ViewOnce] Direct download error:', error.message);
    }
    if (typeof quoted?.download === 'function') {
        try { return await quoted.download(); } catch (error) {
            console.error('[ViewOnce] Quoted download error:', error.message);
        }
    }
    return null;
}

function getQuotedSender(mek, quoted) {
    const message = mek?.message || {};
    const contextInfo = message.extendedTextMessage?.contextInfo ||
        message.imageMessage?.contextInfo ||
        message.videoMessage?.contextInfo ||
        message.audioMessage?.contextInfo ||
        message.documentMessage?.contextInfo;
    const quotedMessage = quoted?.msg || quoted;
    return contextInfo?.participant || quotedMessage?.key?.participant ||
        quotedMessage?.participant || quotedMessage?.sender || '';
}

function normalizeJid(jid) {
    return String(jid || '').trim().toLowerCase().replace(/:\d+(?=@)/, '');
}

function isOwnMediaReply(mek, quoted, sender) {
    const quotedSender = normalizeJid(getQuotedSender(mek, quoted));
    const currentSender = normalizeJid(sender);
    return Boolean(quotedSender && currentSender && quotedSender === currentSender);
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function handleViewOnce(conn, mek, m, context) {
    const { from, reply, quoted, sender } = context;
    try {
        const quotedMsg = quoted?.msg || quoted || mek?.quoted || mek?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) return reply('🌸 View-once message par reply karke `.vv` bhejein.');
        if (!isOwnMediaReply(mek, quoted, sender)) {
            return reply('🔒 `.vv` sirf aapke apne bheje hue view-once media ke liye available hai.');
        }
        const { content, isViewOnce } = unwrapViewOnce(quotedMsg);
        if (!isViewOnce) return reply('🌸 Please reply to a view-once image, video or audio message.\n\nUse: .vv');

        const media = getMedia(content);
        if (!media || !['image', 'video', 'audio', 'document'].includes(media.type)) {
            return reply('🌸 Unsupported view-once media type. Image, video, audio or document required.');
        }

        const buffer = await downloadMedia(media, quoted);
        if (!buffer || !buffer.length) return reply('❌ Media download nahi ho saki. View-once message ko dobara receive karke try karein.');

        const originalCaption = media.message.caption || '';
        const caption = `🌸 *View Once Retrieved*\n\n${originalCaption ? `📝 *Caption:* ${originalCaption}\n` : ''}📁 *Type:* ${media.type}\n📦 *Size:* ${formatBytes(buffer.length)}\n\n> *Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍*`;
        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: config.CHANNEL_JID || '120363433260974040@newsletter',
                newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                serverMessageId: 143
            }
        };
        let outgoing;
        if (media.type === 'image') outgoing = { image: buffer, caption, mimetype: media.message.mimetype || 'image/jpeg', contextInfo };
        else if (media.type === 'video') outgoing = { video: buffer, caption, mimetype: media.message.mimetype || 'video/mp4', contextInfo };
        else if (media.type === 'audio') outgoing = { audio: buffer, mimetype: media.message.mimetype || 'audio/mpeg', ptt: Boolean(media.message.ptt) };
        else outgoing = { document: buffer, fileName: media.message.fileName || 'view-once-file', mimetype: media.message.mimetype || 'application/octet-stream', caption, contextInfo };

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } }).catch(() => {});
        await conn.sendMessage(sender || m?.sender || from, outgoing, { quoted: fakevCard });
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } }).catch(() => {});
    } catch (error) {
        console.error('[ViewOnce] Error:', error);
        return reply(`❌ View-once error: ${error.message}`);
    }
}

// Automatic trigger without emoji: owner replying to a view-once message is enough.
waqar({ on: 'body' }, async (conn, mek, m, context) => {
    try {
        if ((context.isOwner !== true && context.isCreator !== true) || !context.isReply) return;
        if (config.AUTO_VIEW_ONCE !== 'true') return;
        const body = String(context.body || '').trim();
        if (!body || body.startsWith(config.PREFIX || '.')) return;
        if (!unwrapViewOnce(context.quoted?.msg || context.quoted).isViewOnce) return;
        await handleViewOnce(conn, mek, m, context);
    } catch (error) {
        console.error('[ViewOnce] Auto trigger error:', error.message);
    }
});

waqar({
    pattern: 'vv2', alias: ['sendvv', 'dmvv', 'saveto'],
    react: '💕', desc: 'Send view-once media to DM', category: 'owner', filename: __filename
}, async (conn, mek, m, context) => {
    if (context.isOwner !== true && context.isCreator !== true) return context.reply('🌸 Sirf 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 yeh command use kar sakta hai.');
    if (!context.isReply) return context.reply('🌸 View-once message par reply karke `.vv2` bhejein.');
    return handleViewOnce(conn, mek, m, context);
});

waqar({
    pattern: 'vvset', alias: ['autovv'], react: '👻', desc: 'Toggle automatic view-once retrieval', category: 'owner', filename: __filename
}, async (conn, mek, m, { reply, text, isOwner, isCreator }) => {
    if (isOwner !== true && isCreator !== true) return reply('🌸 Sirf 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 yeh setting change kar sakta hai.');
    const action = String(text || 'status').trim().toLowerCase();
    if (['on', 'enable', 'true'].includes(action)) config.AUTO_VIEW_ONCE = 'true';
    else if (['off', 'disable', 'false'].includes(action)) config.AUTO_VIEW_ONCE = 'false';
    else return reply(`👻 Auto View Once: ${config.AUTO_VIEW_ONCE === 'true' ? 'ON' : 'OFF'}\nUse: .vvset on / .vvset off`);
    return reply(`✅ Auto View Once ${config.AUTO_VIEW_ONCE === 'true' ? 'ON' : 'OFF'}\nView-once par reply karke koi bhi normal text bhejein; emoji ki zaroorat nahi.`);
});

waqar({
    pattern: 'vvkeywords', alias: ['vvlist', 'viewkeywords'], react: '📋', desc: 'Show view-once keywords', category: 'owner', filename: __filename
}, async (conn, mek, m, { reply, isOwner, isCreator }) => {
    if (isOwner !== true && isCreator !== true) return reply('🌸 Owner only command.');
    return reply(`📋 View-once keywords (${positiveKeywords.length}):\n${positiveKeywords.join(', ')}\n\nAuto mode: ${config.AUTO_VIEW_ONCE === 'true' ? 'ON' : 'OFF'}\nUse .vvset on/off`);
});

module.exports = { handleViewOnce, unwrapViewOnce, isOwnMediaReply };
