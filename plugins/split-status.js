const { waqar } = require('../waqar');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_INPUT_BYTES = 24 * 1024 * 1024;
const MAX_PART_BYTES = 20 * 1024 * 1024;
const PART_SECONDS = 30;
const MAX_PARTS = 4;
const FFMPEG_TIMEOUT_MS = 45_000;

function getFfmpegPath() {
    for (const candidate of [process.env.FFMPEG_PATH]) {
        if (candidate && fs.existsSync(candidate)) return candidate;
    }
    for (const moduleName of ['ffmpeg-static', '@ffmpeg-installer/ffmpeg']) {
        try {
            const resolved = require(moduleName);
            const candidate = typeof resolved === 'string' ? resolved : resolved.path;
            if (candidate && fs.existsSync(candidate)) return candidate;
        } catch (_) {}
    }
    return 'ffmpeg';
}

async function readMediaLimited(media, maxBytes = MAX_INPUT_BYTES) {
    const stream = await downloadContentFromMessage(media, 'video');
    const chunks = [];
    let total = 0;
    for await (const chunk of stream) {
        total += chunk.length;
        if (total > maxBytes) {
            stream.destroy?.();
            throw new RangeError('Video exceeds the 24 MB processing limit.');
        }
        chunks.push(chunk);
    }
    if (!total) throw new Error('The replied video could not be downloaded.');
    return Buffer.concat(chunks, total);
}

function runFfmpeg(args, timeoutMs = FFMPEG_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const child = spawn(getFfmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(new Error('FFmpeg processing timed out.'));
        }, timeoutMs);

        child.stderr.on('data', (chunk) => {
            if (stderr.length < 4000) stderr += chunk.toString().slice(0, 4000 - stderr.length);
        });
        child.on('error', (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (code === 0) return resolve();
            reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-600)}`));
        });
    });
}

function ffmpegArgs(inputPath, outputPath, startSeconds) {
    return [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', inputPath,
        '-ss', String(startSeconds),
        '-t', String(PART_SECONDS),
        '-map', '0:v:0', '-map', '0:a:0?',
        '-vf', "scale='min(720,iw)':-2",
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '96k',
        '-threads', '2', '-movflags', '+faststart',
        outputPath
    ];
}

async function splitVideoBuffer(buffer, outputDir, run = runFfmpeg) {
    const inputPath = path.join(outputDir, 'input-video');
    await fsp.writeFile(inputPath, buffer, { flag: 'wx' });
    const parts = [];

    for (let index = 0; index < MAX_PARTS; index++) {
        const outputPath = path.join(outputDir, `status-${index + 1}.mp4`);
        try {
            await run(ffmpegArgs(inputPath, outputPath, index * PART_SECONDS));
        } catch (error) {
            let outputExists = false;
            try {
                const stat = await fsp.stat(outputPath);
                outputExists = stat.size >= 1024;
            } catch (_) {}
            if (index > 0 && !outputExists) break;
            throw error;
        }

        let stat;
        try {
            stat = await fsp.stat(outputPath);
        } catch (_) {
            if (index > 0) break;
            throw new Error('FFmpeg did not create a video segment.');
        }
        if (stat.size < 1024) {
            await fsp.rm(outputPath, { force: true });
            if (index === 0) throw new Error('The replied file does not contain a readable video.');
            break;
        }
        if (stat.size > MAX_PART_BYTES) {
            throw new RangeError('A split segment exceeds the 20 MB send limit.');
        }
        parts.push({ path: outputPath, buffer: await fsp.readFile(outputPath), seconds: index * PART_SECONDS });
    }

    return parts;
}

waqar({
    pattern: 'splitstatus',
    alias: ['splitvideo', 'statussplit'],
    desc: 'Split a replied video into 30-second status clips',
    category: 'media',
    react: '✂️',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (m.quoted?.type !== 'video' || !m.quoted?.data) {
        return reply('Reply to a video with `.splitstatus`. The command processes up to 2 minutes and sends 30-second clips.');
    }

    let tempDir;
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const input = await readMediaLimited(m.quoted.data);
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'annu-don-status-'));
        const parts = await splitVideoBuffer(input, tempDir);
        if (!parts.length) return reply('No video segments were produced. Please try a shorter or standard MP4 video.');

        for (let index = 0; index < parts.length; index++) {
            await conn.sendMessage(from, {
                video: parts[index].buffer,
                mimetype: 'video/mp4',
                caption: `Status clip ${index + 1}/${parts.length} · ${PART_SECONDS}s max`
            }, { quoted: mek });
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (error) {
        console.error('[splitstatus]', error.message);
        const message = error instanceof RangeError
            ? error.message
            : error.code === 'ENOENT'
                ? 'FFmpeg was not found on the server. Install FFmpeg or set FFMPEG_PATH.'
                : 'Could not split this video. Please use a shorter, standard MP4 clip and try again.';
        await reply(message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    } finally {
        if (tempDir) await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
});

module.exports = { MAX_INPUT_BYTES, MAX_PART_BYTES, PART_SECONDS, MAX_PARTS, ffmpegArgs, readMediaLimited, splitVideoBuffer };
