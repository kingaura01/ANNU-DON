// ============================================
// Save replied non-view-once media to the requester’s private chat
// ============================================

const { waqar } = require('../waqar');
const config = require('../settings');

const MAX_MEDIA_BYTES = 64 * 1024 * 1024;
const MEDIA_KEYS = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];

function inspectQuotedMedia(input) {
    let current = input?.msg || input;

    for (let depth = 0; current && depth < 8; depth++) {
        const viewOnceWrapper = current.viewOnceMessage ||
            current.viewOnceMessageV2 ||
            current.viewOnceMessageV2Extension;
        if (viewOnceWrapper?.message) return { blocked: 'view-once' };

        for (const key of MEDIA_KEYS) {
            if (current[key]?.viewOnce) return { blocked: 'view-once' };
        }

        if (current.ephemeralMessage?.message) return { blocked: 'disappearing' };
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        break;
    }

    for (const key of MEDIA_KEYS) {
        if (current?.[key]) {
            const media = current[key];
            return {
                type: key.replace('Message', ''),
                media,
                mimetype: media.mimetype || defaultMime(key),
                fileName: media.fileName || media.file_name || '',
                fileLength: Number(media.fileLength || media.size || 0),
                ptt: Boolean(media.ptt)
            };
        }
    }
    return null;
}

function defaultMime(key) {
    return {
        imageMessage: 'image/jpeg',
        videoMessage: 'video/mp4',
        audioMessage: 'audio/mpeg',
        documentMessage: 'application/octet-stream',
        stickerMessage: 'image/webp'
    }[key] || 'application/octet-stream';
}

function safeFileName(name, fallback) {
    const cleaned = String(name || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
    return cleaned.slice(0, 120) || fallback;
}

waqar({
    pattern: 'save',
    alias: ['savemedia', 'savefile'],
    desc: '💾 DM yourself a copy of replied normal media (not view-once)',
    category: 'media',
    react: '💾',
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, isReply, quoted, args, isOwner }) => {
    try {
        const action = String(args?.[0] || '').toLowerCase();
        if (action === 'on' || action === 'off') {
            if (!isOwner) return reply('🔒 Sirf bot owner `.save on/off` use kar sakta hai.');
            config.AUTO_STATUS_SAVE = action === 'on' ? 'true' : 'false';
            if (action === 'on') config.AUTO_STATUS_SEEN = 'true';
            return reply(action === 'on'
                ? '✅ Status auto-save ON. Aane wale statuses pehle visibly viewed honge, phir supported copy bot account ke apne chat mein bheji jayegi.'
                : '✅ Status auto-save OFF. `.ss`/`.autostatus view` ki auto-view setting alag se control hoti hai.');
        }

        if (!isReply || !quoted) {
            const status = config.AUTO_STATUS_SAVE === 'true' ? 'ON' : 'OFF';
            return reply(`💾 Status auto-save: *${status}*\n`.concat(
                'Statuses ke liye `.save on/off` (sirf bot owner). Is mode mein status visible/read mark hota hai aur copy bot account ke apne chat mein aati hai.\n',
                'Normal photo/video/audio/document ki copy ke liye us par reply karke `.save` bhejein.'
            ));
        }

        const item = inspectQuotedMedia(quoted);
        if (item?.blocked === 'view-once') {
            return reply('🔒 `.save` view-once media save nahi karta. Sender se normal copy resend karne ko kahein.');
        }
        if (item?.blocked === 'disappearing') {
            return reply('🔒 `.save` disappearing media save nahi karta. Sender se normal copy resend karne ko kahein.');
        }
        if (!item) {
            return reply('❌ Reply ki hui message supported media nahi hai. Photo, video, audio ya document par reply karein.');
        }
        if (!sender) return reply('❌ Aapka WhatsApp sender ID nahi mila, is liye private copy bhej nahi sakta.');
        if (item.fileLength > MAX_MEDIA_BYTES) {
            return reply('❌ File 64 MB se bari hai; is command se process nahi ho sakti.');
        }
        if (typeof quoted.download !== 'function') {
            return reply('❌ Is media ko download nahi kar saka. Normal media par dobara reply karke try karein.');
        }

        const buffer = await quoted.download();
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return reply('❌ Media download nahi ho saki. Normal media par dobara reply karke try karein.');
        }
        if (buffer.length > MAX_MEDIA_BYTES) {
            return reply('❌ File 64 MB se bari hai; is command se process nahi ho sakti.');
        }

        const caption = '💾 Aapki requested media copy. Isay apne device par download/save kar lein.';
        let payload;
        if (item.type === 'image') {
            payload = { image: buffer, mimetype: item.mimetype, caption };
        } else if (item.type === 'video') {
            payload = { video: buffer, mimetype: item.mimetype, caption };
        } else if (item.type === 'audio') {
            payload = { audio: buffer, mimetype: item.mimetype, ptt: item.ptt };
        } else if (item.type === 'sticker') {
            payload = { sticker: buffer };
        } else {
            payload = {
                document: buffer,
                mimetype: item.mimetype,
                fileName: safeFileName(item.fileName, 'saved-media'),
                caption
            };
        }

        // Send the copy only to the person who invoked the command, never to the group.
        await conn.sendMessage(sender, payload);
        await reply('✅ Media ki copy aapke private WhatsApp chat mein bhej di hai.');
    } catch (error) {
        console.error('[SaveMedia] Error:', error.message);
        await reply(`❌ Save nahi ho saka: ${error.message || 'Unknown error'}`);
    }
});

module.exports = { inspectQuotedMedia, safeFileName, MAX_MEDIA_BYTES };
