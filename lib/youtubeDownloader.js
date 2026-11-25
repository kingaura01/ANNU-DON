'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static');
const ffprobePath = process.env.FFPROBE_PATH || require('ffprobe-static').path;

const tempDir = path.join(__dirname, '..', 'temp');
const binaryPath = process.env.YTDLP_BINARY || path.join(os.tmpdir(), 'annudon-yt-dlp');
const maxFileSize = 64 * 1024 * 1024;
let downloader;
let downloaderPromise;
let ffmpegToolsDir;

function getFfmpegToolsDir() {
    if (ffmpegToolsDir) return ffmpegToolsDir;
    ffmpegToolsDir = path.join(os.tmpdir(), 'annudon-ffmpeg-tools');
    fs.mkdirSync(ffmpegToolsDir, { recursive: true });
    for (const [source, name] of [[ffmpegPath, 'ffmpeg'], [ffprobePath, 'ffprobe']]) {
        if (!source || !fs.existsSync(source)) throw new Error(`Missing ${name} executable.`);
        const destination = path.join(ffmpegToolsDir, name);
        if (fs.existsSync(destination)) continue;
        try {
            fs.symlinkSync(source, destination);
        } catch (_) {
            fs.copyFileSync(source, destination);
            fs.chmodSync(destination, 0o755);
        }
    }
    return ffmpegToolsDir;
}

function isYouTubeUrl(value) {
    try {
        const url = new URL(value);
        return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname.toLowerCase());
    } catch (_) {
        return false;
    }
}

async function getDownloader() {
    if (downloader) return downloader;
    if (!downloaderPromise) {
        downloaderPromise = (async () => {
            if (!fs.existsSync(binaryPath)) {
                await YTDlpWrap.downloadFromGithub(binaryPath);
            }
            downloader = new YTDlpWrap(binaryPath);
            return downloader;
        })().catch((error) => {
            downloaderPromise = null;
            try {
                if (fs.existsSync(binaryPath)) fs.unlinkSync(binaryPath);
            } catch (_) {}
            throw error;
        });
    }
    return downloaderPromise;
}

function removeTempFiles(id) {
    try {
        for (const name of fs.readdirSync(tempDir)) {
            if (name.startsWith(`${id}.`)) {
                try { fs.unlinkSync(path.join(tempDir, name)); } catch (_) {}
            }
        }
    } catch (_) {}
}

async function downloadYouTubeMedia(url, type) {
    if (!isYouTubeUrl(url)) throw new Error('Please provide a valid YouTube link.');
    if (!['audio', 'video'].includes(type)) throw new Error('Unsupported media type.');

    fs.mkdirSync(tempDir, { recursive: true });
    const id = `yt-${crypto.randomUUID()}`;
    const outputTemplate = path.join(tempDir, `${id}.%(ext)s`);
    const args = [
        url,
        '--no-playlist',
        '--no-warnings',
        '--no-progress',
        '--socket-timeout', '20',
        '--retries', '2',
        '--extractor-retries', '2',
        '--output', outputTemplate,
        '--ffmpeg-location', getFfmpegToolsDir()
    ];

    if (type === 'audio') {
        args.push(
            '--format', 'bestaudio[ext=m4a]/bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '5'
        );
    } else {
        args.push(
            '--format', 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4'
        );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
        const client = await getDownloader();
        await client.execPromise(args, {}, controller.signal);

        const expectedExtension = type === 'audio' ? '.mp3' : '.mp4';
        const outputPath = path.join(tempDir, `${id}${expectedExtension}`);
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
            throw new Error('The downloader completed without producing a media file.');
        }
        const size = fs.statSync(outputPath).size;
        if (size > maxFileSize) {
            throw new Error('The downloaded file is larger than the 64 MB upload limit.');
        }
        return outputPath;
    } catch (error) {
        removeTempFiles(id);
        if (controller.signal.aborted) {
            throw new Error('The YouTube download timed out. Please try again.');
        }
        const detail = error?.stderr || error?.message || 'Unknown downloader error';
        console.error('[yt-dlp] Download failed:', String(detail).slice(-500));
        if (/sign in to confirm|not a bot|cookies/i.test(String(detail))) {
            throw new Error('YouTube blocked this request with a verification check. Please try another video or configure a YouTube cookies file.');
        }
        throw new Error('Could not download this YouTube media. Please try another link.');
    } finally {
        clearTimeout(timeout);
    }
}

function cleanupDownloadedMedia(filePath) {
    if (!filePath) return;
    try {
        if (path.dirname(path.resolve(filePath)) === path.resolve(tempDir) && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (_) {}
}

module.exports = {
    isYouTubeUrl,
    downloadYouTubeMedia,
    cleanupDownloadedMedia
};
