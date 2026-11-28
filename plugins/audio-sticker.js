'use strict';

const { prepareWAMessageMedia, proto, downloadMediaMessage, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { randomBytes } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { waqar } = require('../waqar');

const execFileAsync = promisify(execFile)
const FFMPEG_PATH = ffmpegInstaller.path
const runFfmpeg = (args) => execFileAsync(FFMPEG_PATH, args)

const pluginConfig = {
    name: 'caudiostiker',
    alias: ['caudiosticker', 'audiostiker', 'cstiker', 'audiosticker', 'stikeraudio', 'stickeraudio', 'figurinhasom', 'saudio'],
    category: 'sticker',
    description: 'Photo/video se audio sticker (audio max 5 minute)',
    usage: 'photo/video par {prefix}caudiostiker reply karein',
    example: '.caudiostiker Pack|Author',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 10,
    isEnabled: true
}

// === CONFIG DURASI ===
const MAX_AUDIO_DURATION = 300 // 5 minutes
const MAX_VIDEO_DURATION = 25 // keep animated sticker payloads bounded
const SESSION_SECONDS = 300 // 5 minutes
const SESSION_LABEL = '5 minute'

if (!globalThis.__audioStickerSessions) globalThis.__audioStickerSessions = new Map()
const sessions = globalThis.__audioStickerSessions

// === TYPING ALA SHEENA TOTSUKI ===
const TYPING_LINES = [
    'hmm... thori dair~',
    'zara process kar raha hoon...',
    'bas thori dair, tayyar kar raha hoon~',
    'theek hai, abhi ho jayega~',
    'process shuru hai, yahin rahiye~'
]
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
async function typingPresence(sock, chat, text = '') {
    try {
        // Typing presence simulation
        const bursts = Math.random() < 0.5 ? 2 : 3
        for (let i = 0; i < bursts; i++) {
            await sock.sendPresenceUpdate('composing', chat)
            await new Promise(res => setTimeout(res, 600 + Math.random() * 900))
            await sock.sendPresenceUpdate('paused', chat)
            await new Promise(res => setTimeout(res, 200 + Math.random() * 400))
        }
        // Terakhir ngetik agak lama sesuai panjang teks
        await sock.sendPresenceUpdate('composing', chat)
        await new Promise(res => setTimeout(res, Math.min(800 + text.length * 12, 2500)))
        await sock.sendPresenceUpdate('paused', chat)
    } catch {}
}
async function thinkingPresence(sock, chat) {
    // Show composing presence during media processing
    try {
        await sock.sendPresenceUpdate('composing', chat)
        await new Promise(res => setTimeout(res, 1200 + Math.random() * 800))
    } catch {}
}

// === PATCH PROTO BIAR AUDIO NEMPEL DI STIKER ===
function patchProtoInstance(p) {
    const M = p?.Message
    if (!M || M.__audioStickerPatchedV3) return
    if (M.StickerMessage) {
        const prevStickerEncode = M.StickerMessage.encode
        M.StickerMessage.encode = function (message, writer) {
            const audio = message?.audioMessage
            if (audio && Object.prototype.hasOwnProperty.call(message, 'audioMessage')) delete message.audioMessage
            const w = prevStickerEncode.call(this, message, writer)
            if (audio && M.AudioMessage) {
                message.audioMessage = audio
                M.AudioMessage.encode(audio, w.uint32(210).fork()).ldelim()
            }
            return w
        }
        if (typeof M.StickerMessage.fromObject === 'function') {
            const prev = M.StickerMessage.fromObject
            M.StickerMessage.fromObject = function (object) {
                const msg = prev.call(this, object)
                if (object?.audioMessage) msg.audioMessage = M.AudioMessage?.fromObject ? M.AudioMessage.fromObject(object.audioMessage) : object.audioMessage
                return msg
            }
        }
    }
    const prevMsgEncode = M.encode
    M.encode = function (message, writer) {
        const asm = message?.audioStickerMessage
        if (asm) {
            if (Object.prototype.hasOwnProperty.call(message, 'stickerMessage')) delete message.stickerMessage
            if (Object.prototype.hasOwnProperty.call(message, 'audioStickerMessage')) delete message.audioStickerMessage
        }
        const w = prevMsgEncode.call(this, message, writer)
        if (asm && M.FutureProofMessage) {
            message.audioStickerMessage = asm
            M.FutureProofMessage.encode(asm, w.uint32(1074).fork()).ldelim()
        }
        return w
    }
    if (typeof M.fromObject === 'function') {
        const prev = M.fromObject
        M.fromObject = function (object) {
            const msg = prev.call(this, object)
            if (object?.audioStickerMessage) {
                const inner = object.audioStickerMessage.message || object.audioStickerMessage
                if (inner?.stickerMessage && object.audioStickerMessage.message?.stickerMessage?.audioMessage) {
                    inner.stickerMessage.audioMessage = object.audioStickerMessage.message.stickerMessage.audioMessage
                }
                msg.audioStickerMessage = { message: inner }
                delete msg.stickerMessage
                if (inner) Object.setPrototypeOf(msg, inner)
            }
            return msg
        }
    }
    M.__audioStickerPatchedV3 = true
}

async function ensurePatched() {
    patchProtoInstance(proto)
}

function getSessionKey(m) { return `${m.chat}:${m.sender}` }
function clearUserSession(key) {
    const ex = sessions.get(key)
    if (ex?.timer) clearTimeout(ex.timer)
    sessions.delete(key)
}
function unwrapMessageContainer(raw) {
    let cur = raw
    for (let i = 0; i < 6 && cur; i++) {
        const next = cur.ephemeralMessage?.message || cur.viewOnceMessageV2?.message || cur.viewOnceMessageV2Extension?.message || cur.viewOnceMessage?.message || cur.documentWithCaptionMessage?.message || cur.editedMessage?.message
        if (!next) break
        cur = next
    }
    return cur || {}
}
function detectMediaInfo(node) {
    if (!node) return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null }
    const container = unwrapMessageContainer(node.message || node.fakeObj?.message || {})
    const mtype = node.mtype || node.type || Object.keys(container).find(k => /imageMessage|videoMessage|stickerMessage|audioMessage|documentMessage/i.test(k)) || ''
    const directMsg = node.msg && typeof node.msg === 'object' && (node.msg.mediaKey || node.msg.url || node.msg.directPath || node.msg.mimetype) ? node.msg : null
    const dataMsg = node.data && typeof node.data === 'object' ? node.data : null
    const mediaObj = directMsg || dataMsg || container[mtype] || container.videoMessage || container.imageMessage || container.stickerMessage || container.audioMessage || container.documentMessage || (node.mediaKey || node.url || node.directPath ? node : null)
    const mime = String(node.mimetype || mediaObj?.mimetype || '').toLowerCase()
    const seconds = Number(mediaObj?.seconds || node.seconds || node.msg?.seconds || node.msg?.audioMessage?.seconds || node.msg?.videoMessage?.seconds || 0)
    if (/video/i.test(mime) || /videoMessage/i.test(mtype)) return { kind: 'video', mime: mime || 'video/mp4', seconds, mediaObj, dlType: /documentMessage/i.test(mtype) ? 'document' : 'video' }
    if (/webp/i.test(mime) || /stickerMessage/i.test(mtype)) return { kind: 'webp', mime: 'image/webp', seconds, isAnimated: Boolean(mediaObj?.isAnimated), mediaObj, dlType: 'sticker' }
    if (/image/i.test(mime) || /imageMessage/i.test(mtype)) return { kind: 'image', mime: mime || 'image/jpeg', seconds: 0, mediaObj, dlType: /documentMessage/i.test(mtype) ? 'document' : 'image' }
    if (/audio|ogg|opus|mpeg|mp3|wav|m4a|aac/i.test(mime) || /audioMessage/i.test(mtype)) return { kind: 'audio', mime: mime || 'audio/mpeg', seconds, mediaObj, dlType: /documentMessage/i.test(mtype) ? 'document' : 'audio' }
    return { kind: null, mime: '', seconds: 0, mediaObj: null, dlType: null }
}
async function downloadBuffer(node, info, client) {
    if (!node) return null
    if (info?.mediaObj && info?.dlType && (info.mediaObj.mediaKey || info.mediaObj.directPath || info.mediaObj.url)) {
        try {
            const stream = await downloadContentFromMessage(info.mediaObj, info.dlType)
            const chunks = []
            for await (const chunk of stream) chunks.push(chunk)
            const buf = Buffer.concat(chunks)
            if (buf.length) return buf
        } catch {}
    }
    if (node.fakeObj?.message || node.message) {
        try {
            const msgObj = node.fakeObj?.message ? node.fakeObj : node
            const buf = await downloadMediaMessage(msgObj, 'buffer', {}, { logger: { info: () => {}, error: () => {}, warn: () => {} }, reuploadRequest: client?.updateMediaMessage })
            if (buf?.length) return buf
        } catch {}
    }
    if (typeof node.download === 'function') {
        try { const buf = await node.download(); if (buf?.length) return buf } catch {}
    }
    return null
}
function buildExifPayload(packname, author) {
    const json = { 'sticker-pack-id': 'com.annudon.audiosticker', 'sticker-pack-name': String(packname ?? ''), 'sticker-pack-publisher': String(author ?? ''), emojis: ['🔊'] }
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
    const exif = Buffer.concat([exifAttr, jsonBuff])
    exif.writeUIntLE(jsonBuff.length, 14, 4)
    return exif
}
function injectExifRiffFallback(webpBuffer, exifData) {
    if (!Buffer.isBuffer(webpBuffer) || webpBuffer.length < 16 || webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') return webpBuffer
    const chunks = []
    let offset = 12, hasVp8x = false, isAnim = false
    while (offset + 8 <= webpBuffer.length) {
        const id = webpBuffer.toString('ascii', offset, offset + 4)
        const size = webpBuffer.readUInt32LE(offset + 4)
        const padded = size + (size % 2)
        const end = Math.min(webpBuffer.length, offset + 8 + padded)
        const rawChunk = Buffer.from(webpBuffer.subarray(offset, end))
        if (id === 'VP8X') hasVp8x = true
        if (id === 'ANIM' || id === 'ANMF') isAnim = true
        if (id !== 'EXIF') chunks.push({ id, rawChunk })
        offset = end
    }
    if (!hasVp8x) {
        const vp8x = Buffer.alloc(18)
        vp8x.write('VP8X', 0, 4, 'ascii'); vp8x.writeUInt32LE(10, 4); vp8x[8] = 0x18
        vp8x.writeUIntLE(511, 12, 3); vp8x.writeUIntLE(511, 15, 3)
        chunks.unshift({ id: 'VP8X', rawChunk: vp8x })
    } else {
        const e = chunks.find(c => c.id === 'VP8X')
        if (e && e.rawChunk.length >= 18) { e.rawChunk[8] |= 0x08; if (isAnim) e.rawChunk[8] |= 0x02 }
    }
    const padByte = exifData.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
    const exifHeader = Buffer.alloc(8); exifHeader.write('EXIF', 0, 4, 'ascii'); exifHeader.writeUInt32LE(exifData.length, 4)
    chunks.push({ id: 'EXIF', rawChunk: Buffer.concat([exifHeader, exifData, padByte]) })
    const body = Buffer.concat(chunks.map(c => c.rawChunk))
    const header = Buffer.alloc(12); header.write('RIFF', 0, 4, 'ascii'); header.writeUInt32LE(body.length + 4, 4); header.write('WEBP', 8, 4, 'ascii')
    return Buffer.concat([header, body])
}
async function addStickerExif(webpBuffer, packname, author) {
    const exifData = buildExifPayload(packname, author)
    try {
        const webpMod = await import('node-webpmux')
        const WebpImage = webpMod.default?.Image || webpMod.Image || webpMod.default
        if (WebpImage) { const img = new WebpImage(); await img.load(webpBuffer); img.exif = exifData; return await img.save(null) }
    } catch {}
    return injectExifRiffFallback(webpBuffer, exifData)
}
function isWebpAnimated(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 22) return false
    if (buf.toString('ascii', 12, 16) === 'VP8X' && (buf[20] & 0x02) !== 0) return true
    return buf.includes(Buffer.from('ANIM'))
}
async function videoBufferToAnimatedWebp(buffer) {
    const tmpId = randomBytes(6).toString('hex')
    const inPath = path.join(os.tmpdir(), `as_vid_${tmpId}.mp4`)
    const outPath = path.join(os.tmpdir(), `as_out_${tmpId}.webp`)
    const encodeAttempt = async (fps, qv) => {
        await runFfmpeg(['-y', '-i', inPath, '-t', String(MAX_VIDEO_DURATION), '-vf', `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1`, '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '6', '-q:v', String(qv), '-loop', '0', '-preset', 'picture', '-an', '-vsync', '0', outPath])
        return await fs.readFile(outPath)
    }
    try {
        await fs.writeFile(inPath, buffer)
        let webp = null
        for (const [fps, qv] of [[10, 50], [8, 36], [6, 24], [5, 16]]) {
            webp = await encodeAttempt(fps, qv)
            if (webp.length <= 880 * 1024) break
        }
        return webp
    } finally { await fs.unlink(inPath).catch(() => {}); await fs.unlink(outPath).catch(() => {}) }
}
async function imageBufferToWebp(buffer) {
    try {
        const sharp = (await import('sharp')).default
        return await sharp(buffer, { animated: true }).rotate().resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer()
    } catch {
        const tmpId = randomBytes(6).toString('hex')
        const inPath = path.join(os.tmpdir(), `as_img_${tmpId}.jpg`)
        const outPath = path.join(os.tmpdir(), `as_img_out_${tmpId}.webp`)
        try {
            await fs.writeFile(inPath, buffer)
            await runFfmpeg(['-y', '-i', inPath, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1', '-c:v', 'libwebp', '-lossless', '0', '-q:v', '80', '-an', outPath])
            return await fs.readFile(outPath)
        } finally { await fs.unlink(inPath).catch(() => {}); await fs.unlink(outPath).catch(() => {}) }
    }
}
async function buildStickerWithExif(buffer, kind, packname, author) {
    let rawWebp = buffer
    if (kind === 'video') rawWebp = await videoBufferToAnimatedWebp(buffer)
    else if (kind === 'image') rawWebp = await imageBufferToWebp(buffer)
    return await addStickerExif(rawWebp, packname, author)
}
function parseFfmpegDuration(stderrText) {
    const matches = [...String(stderrText || '').matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
    if (!matches.length) return 0
    const last = matches[matches.length - 1]
    return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3])
}
function generateWaveform(seedBuf, length = 64) {
    const wf = Buffer.alloc(length)
    for (let i = 0; i < length; i++) { const b = seedBuf?.length ? seedBuf[(i * 19 + 7) % seedBuf.length] : i * 11; wf[i] = 18 + (b % 76) }
    return wf
}
async function convertToOggOpus(buffer, ext = 'mp3') {
    const tmpId = randomBytes(6).toString('hex')
    const inPath = path.join(os.tmpdir(), `ptt_in_${tmpId}.${ext}`)
    const outPath = path.join(os.tmpdir(), `ptt_out_${tmpId}.ogg`)
    try {
        await fs.writeFile(inPath, buffer)
        // 5 menit pake 24k biar gak jebol size, tetep jernih buat voice/lagu
        const { stderr } = await runFfmpeg(['-y', '-i', inPath, '-vn', '-map', '0:a:0', '-t', String(MAX_AUDIO_DURATION), '-af', 'aresample=48000:async=1:first_pts=0', '-c:a', 'libopus', '-b:a', '24k', '-vbr', 'on', '-compression_level', '10', '-ac', '1', '-ar', '48000', '-application', 'audio', '-avoid_negative_ts', 'make_zero', '-f', 'ogg', outPath])
        const oggBuffer = await fs.readFile(outPath)
        if (!oggBuffer || oggBuffer.length < 200) throw new Error('Audio file khali hai ya bohat chhota hai.')
        return { oggBuffer, realSeconds: parseFfmpegDuration(stderr) }
    } finally { await fs.unlink(inPath).catch(() => {}); await fs.unlink(outPath).catch(() => {}) }
}
async function buildAudioMessageFromBuffer(client, buffer, ext, fallbackSeconds = 0) {
    const { oggBuffer, realSeconds } = await convertToOggOpus(buffer, ext)
    const { audioMessage } = await prepareWAMessageMedia({ audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { upload: client.waUploadToServer })
    const chosenSec = realSeconds > 0 ? realSeconds : fallbackSeconds > 0 ? fallbackSeconds : 5
    audioMessage.seconds = Math.max(1, Math.min(MAX_AUDIO_DURATION, Math.round(chosenSec)))
    audioMessage.ptt = true
    audioMessage.mimetype = 'audio/ogg; codecs=opus'
    if (!audioMessage.waveform?.length) audioMessage.waveform = generateWaveform(oggBuffer)
    return audioMessage
}
async function sendCombinedAudioSticker(client, chat, stickerBuffer, isAnimated, audioMsg) {
    await ensurePatched()
    const prepared = await prepareWAMessageMedia({ sticker: stickerBuffer, isAnimated }, { upload: client.waUploadToServer })
    prepared.stickerMessage.isAnimated = Boolean(isAnimated)
    prepared.stickerMessage.audioMessage = audioMsg
    const payload = { __proto__: prepared, audioStickerMessage: { message: prepared }, messageContextInfo: { messageSecret: randomBytes(32) } }
    await client.relayMessage(chat, payload, {})
}

async function startStickerSession({ m, sock, stickerBuffer, isAnimated, packname, author, prefix, command }) {
    const key = getSessionKey(m)
    clearUserSession(key)
    const timer = setTimeout(() => {
        if (sessions.has(key)) {
            sessions.delete(key)
            sock.sendMessage(m.chat, { text: `⏰ *AUDIO STICKER SESSION KHATAM*\n> ${SESSION_LABEL} ka wait time khatam ho gaya. Nayi session ke liye photo dobara command ke sath bhejein.` }, { quoted: m }).catch(() => {})
        }
    }, SESSION_SECONDS * 1000)
    sessions.set(key, { stickerBuffer, isAnimated, packname, author, expiresAt: Date.now() + SESSION_SECONDS * 1000, processing: false, timer })
    await typingPresence(sock, m.chat, 'Audio sticker session active')
    return m.reply(
        `✦ *AUDIO STICKER SESSION SHURU* ✦\n` +
        `> _Tasveer save ho gayi hai; ab audio bhejein._\n\n` +
        `╭─「 *SESSION KI DETAIL* 」\n` +
        `│ ◦ *Pack* : *${packname}*\n` +
        `│ ◦ *Author* : *${author}*\n` +
        `│ ◦ *Type* : \`${isAnimated ? 'Animated GIF' : 'Static image'}\`\n` +
        `│ ◦ *Audio ki had* : \`${MAX_AUDIO_DURATION} seconds / 5 minute\`\n` +
        `│ ◦ *Session time* : \`${SESSION_LABEL}\`\n` +
        `╰───────────────\n\n` +
        `╭─「 *AGLA QADAM* 」\n` +
        `│ 1. Isi session ke liye audio/voice note (max 5 minute) isi chat mein bhejein.\n` +
        `│ 2. Ya audio/voice note par \`${prefix}${command}\` reply karein.\n` +
        `│ 3. Cancel karne ke liye \`${prefix}${command} batal\` likhein.\n` +
        `╰───────────────`
    )
}

async function consumeSessionWithAudio(m, sock, session, audioNode, audioInfo) {
    const key = getSessionKey(m)
    if (audioInfo.kind === 'audio' && audioInfo.seconds > MAX_AUDIO_DURATION) {
        await m.reply(`Audio 5 minute se zyada hai. Barah-e-karam 5 minute ya is se chhota audio bhejein.`)
        return
    }
    if (audioInfo.kind === 'video' && audioInfo.seconds > MAX_VIDEO_DURATION) {
        await m.reply(`Video ${MAX_VIDEO_DURATION} seconds se zyada hai. Chhoti video bhejein.`)
        return
    }
    session.processing = true
    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
    await thinkingPresence(sock, m.chat)
    try {
        const audioBuf = await downloadBuffer(audioNode, audioInfo, sock)
        if (!audioBuf?.length) throw new Error('Audio/video download nahi ho saka.')
        const ext = audioInfo.kind === 'video' ? 'mp4' : /ogg|opus/i.test(audioInfo.mime) ? 'ogg' : /mp4|m4a|aac/i.test(audioInfo.mime) ? 'm4a' : 'mp3'
        const audioMsg = await buildAudioMessageFromBuffer(sock, audioBuf, ext, audioInfo.seconds)
        await sendCombinedAudioSticker(sock, m.chat, session.stickerBuffer, session.isAnimated, audioMsg)
        clearUserSession(key)
        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
    } catch (err) {
        session.processing = false
        console.error('[AUDIOSTICKER SESSION ERROR]', err)
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
        await m.reply(`❌ Audio ko sticker ke sath merge nahi kar saka: ${err?.message || String(err)}`)
    }
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const command = m.command || 'caudiostiker'
    const inputText = String(m.text || m.body || '').trim()
    const commandLead = `${prefix}${command}`
    const text = inputText.toLowerCase().startsWith(commandLead.toLowerCase())
        ? inputText.slice(commandLead.length).trim()
        : inputText.replace(/^[./!#]?\S+\s?/, '').trim()
    const key = getSessionKey(m)
    const activeSession = sessions.get(key)
    const rawText = String(text || '').trim()

    if (/^(batal|cancel|stop)$/i.test(rawText)) {
        if (!activeSession) return m.reply('⚠️ Koi Audio Sticker session active nahi hai.')
        clearUserSession(key)
        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
        return m.reply('✅ Audio Sticker session cancel kar di gayi.')
    }

    const ownInfo = detectMediaInfo(m)
    const quoted = m.quoted
    const quotedInfo = detectMediaInfo(quoted)
    const hasOwnVisual = ['video', 'image', 'webp'].includes(ownInfo.kind)
    const hasQuotedVisual = ['video', 'image', 'webp'].includes(quotedInfo.kind)
    const hasOwnAudio = ownInfo.kind === 'audio'
    const hasQuotedAudio = quotedInfo.kind === 'audio'

    if (activeSession && !activeSession.processing && (hasOwnAudio || hasQuotedAudio) && !hasOwnVisual) {
        return await consumeSessionWithAudio(m, sock, activeSession, hasOwnAudio ? m : quoted, hasOwnAudio ? ownInfo : quotedInfo)
    }

    if (!hasOwnVisual && !hasQuotedVisual && !hasOwnAudio && !hasQuotedAudio) {
        if (activeSession) {
            const remSec = Math.max(1, Math.ceil((activeSession.expiresAt - Date.now()) / 1000))
            const remMin = (remSec / 60).toFixed(1)
            await typingPresence(sock, m.chat, 'Session abhi active hai')
            return m.reply(`⏳ *SESSION ABHI ACTIVE HAI (${remMin} minute baqi)*\n\nAudio/voice note bhejein, ya audio par \`${prefix}${command}\` reply karein.\nCancel ke liye \`${prefix}${command} batal\` likhein.`)
        }
        await typingPresence(sock, m.chat, 'Command ka tareeqa')
        return m.reply(
            `✦ *AUDIO STICKER GENERATOR* ✦\n` +
            `> _Audio wala sticker banana hai? Command ke sath photo ya video bhejein._\n\n` +
            `╭─「 *PHOTO KA TAREEQA* 」\n` +
            `│ 1. Photo bhejein ya us par \`${prefix}${command}\` reply karein.\n` +
            `│ 2. Bot ${SESSION_LABEL} ke liye session kholega.\n` +
            `│ 3. 5 minute tak audio/voice note bhejein ya command ke sath reply karein.\n` +
            `╰───────────────\n\n` +
            `╭─「 *VIDEO KA TAREEQA* 」\n` +
            `│ ◦ ${MAX_VIDEO_DURATION} seconds tak video bhejein ya \`${prefix}${command}\` reply karein.\n` +
            `│   _(Video animated audio sticker ban jayegi.)_\n` +
            `│ ◦ Custom pack/author: \`${prefix}${command} PackName|Author\`\n` +
            `╰───────────────`
        )
    }

    if (!hasOwnVisual && !hasQuotedVisual && (hasOwnAudio || hasQuotedAudio)) {
        await typingPresence(sock, m.chat, 'Photo select nahi hui')
        return m.reply(`⚠️ Pehle photo ya sticker ko \`${prefix}${command}\` ke sath bhejein/reply karein. Phir ${SESSION_LABEL} ke andar audio bhejein.`)
    }

    if (hasOwnVisual && hasQuotedAudio && quotedInfo.seconds > MAX_AUDIO_DURATION) {
        return m.reply('Audio 5 minute se zyada hai. Barah-e-karam 5 minute ya is se chhota audio bhejein.')
    }

    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
    try {
        await ensurePatched()
        const [customPack, customAuth] = rawText.includes('|') ? rawText.split('|').map(s => s.trim()) : [rawText, '']
        const packname = customPack || global.packname || global.stickpack || global.namaBot || 'ANNU-DON'
        const author = customAuth || global.author || global.stickauth || global.namaOwner || m.pushName || 'ANNU-DON'
        const visualNode = hasOwnVisual ? m : quoted
        const visualInfo = hasOwnVisual ? ownInfo : quotedInfo
        const isVideo = visualInfo.kind === 'video'
        if (isVideo && (visualInfo.seconds || 0) > MAX_VIDEO_DURATION) {
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
            return m.reply(`⚠️ Video zyada lambi hai. Audio Sticker ke liye max *${MAX_VIDEO_DURATION} seconds* bhejein.`)
        }
        await typingPresence(sock, m.chat, 'Sticker process ho raha hai...')
        const visualData = await downloadBuffer(visualNode, visualInfo, sock)
        if (!visualData?.length) throw new Error('Photo/video download nahi ho saka.')
        const stickerBuffer = await buildStickerWithExif(visualData, visualInfo.kind, packname, author)
        const isAnimated = isVideo || isWebpAnimated(stickerBuffer)

        if (hasOwnVisual && hasQuotedAudio) {
            const audioBuf = await downloadBuffer(quoted, quotedInfo, sock)
            if (!audioBuf?.length) throw new Error('Reply wala audio download nahi ho saka.')
            const ext = /ogg|opus/i.test(quotedInfo.mime) ? 'ogg' : /mp4|m4a|aac/i.test(quotedInfo.mime) ? 'm4a' : 'mp3'
            const audioMsg = await buildAudioMessageFromBuffer(sock, audioBuf, ext, quotedInfo.seconds)
            await sendCombinedAudioSticker(sock, m.chat, stickerBuffer, isAnimated, audioMsg)
            clearUserSession(key)
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
            return
        }
        if (isVideo) {
            try {
                const audioMsg = await buildAudioMessageFromBuffer(sock, visualData, 'mp4', visualInfo.seconds)
                await sendCombinedAudioSticker(sock, m.chat, stickerBuffer, true, audioMsg)
                clearUserSession(key)
                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
                return
            } catch {
                return await startStickerSession({ m, sock, stickerBuffer, isAnimated: true, packname, author, prefix, command })
            }
        }
        return await startStickerSession({ m, sock, stickerBuffer, isAnimated, packname, author, prefix, command })
    } catch (e) {
        console.error('[AUDIOSTICKER ERROR]', e)
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
        await m.reply(`❌ Audio Sticker nahi ban saka: ${e?.message || String(e)}`)
    }
}

handler.before = async (m, { sock }) => {
    if (!m || m.fromMe) return false
    const key = getSessionKey(m)
    const session = sessions.get(key)
    if (!session || session.processing) return false
    if (Date.now() > session.expiresAt) { clearUserSession(key); return false }
    const bodyText = String(m.text || m.body || '').trim()
    if (/^[./!#]?(audiosticker|stikeraudio|stickeraudio|figurinhasom|saudio|caudiostiker|caudiosticker)\b/i.test(bodyText)) return false
    const ownInfo = detectMediaInfo(m)
    const quotedInfo = detectMediaInfo(m.quoted)
    const isDirectAudio = ownInfo.kind === 'audio'
    const isReplyToAudio = !bodyText && quotedInfo.kind === 'audio'
    if (!isDirectAudio && !isReplyToAudio) return false
    await consumeSessionWithAudio(m, sock, session, isDirectAudio ? m : m.quoted, isDirectAudio ? ownInfo : quotedInfo)
    return true
}

const registered = waqar({
    pattern: pluginConfig.name,
    alias: pluginConfig.alias,
    desc: 'Tasveer/audio/video se audio sticker banayein (audio max 5 minute, video max 25 seconds)',
    category: 'sticker',
    react: '🔊',
    filename: __filename
}, async (conn, mek, m, context) => {
    const message = Object.assign(Object.create(m || null), {
        chat: context.from,
        sender: m?.sender || context.sender,
        fromMe: context.isMe,
        prefix: context.prefix || '.',
        command: context.command || pluginConfig.name,
        body: context.body || '',
        text: context.body || '',
        pushName: context.pushname || mek.pushName || 'User'
    });
    return handler(message, { sock: conn });
});
registered.function.before = handler.before;

module.exports = { config: pluginConfig, handler, patchProtoInstance };
