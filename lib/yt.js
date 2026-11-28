const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { randomUUID } = require('crypto');
const axios = require('axios');
const NodeID3 = require('node-id3');
const chalk = require('chalk');
const ytSearch = require('yt-search');

const BASE_DIR = __dirname;
const BIN_PATH = process.env.YT_DLP_PATH || path.join(__dirname, '..', 'bin', 'yt-dlp');
const DIRS = {
  audio: path.join(BASE_DIR, 'ErrorMedia', 'audio'),
  video: path.join(BASE_DIR, 'ErrorMedia', 'video'),
  trash: path.join(BASE_DIR, 'ErrorMedia', 'trash'),
};
const CLEANUP_AGE_MS = 30 * 60 * 1000;
const YT_DLP_TIMEOUT_MS = 5 * 60 * 1000;

for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });

function ytDlpAuthArgs() {
  const cookiesFile = String(process.env.YT_DLP_COOKIES_FILE || '').trim();
  return cookiesFile && fs.existsSync(cookiesFile) ? ['--cookies', cookiesFile] : [];
}

function ytDlp(args, { onProgress, timeout = YT_DLP_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const executable = fs.existsSync(BIN_PATH) ? BIN_PATH : 'yt-dlp';
    let child;
    try {
      child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      return reject(new Error(`Could not start yt-dlp: ${error.message}`));
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error('yt-dlp timed out after five minutes.'));
    }, timeout);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };
    const handleData = (stream, chunk) => {
      const text = chunk.toString();
      if (stream === 'stdout') stdout += text;
      else stderr += text;
      const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (match && onProgress) onProgress(`${match[1]}%`);
    };
    child.stdout.on('data', chunk => handleData('stdout', chunk));
    child.stderr.on('data', chunk => handleData('stderr', chunk));
    child.once('error', error => finish(new Error(`yt-dlp is unavailable: ${error.message}`)));
    child.once('close', code => {
      if (code === 0) return finish(null, { stdout, stderr });
      finish(new Error(`yt-dlp exited with code ${code}: ${(stderr || stdout).slice(-1200)}`));
    });
  });
}

async function checkYtDlp() {
  try {
    await ytDlp(['--version'], { timeout: 15000 });
  } catch (error) {
    throw new Error(`YouTube downloader is not ready. Check the deployment's yt-dlp setup. ${error.message}`);
  }
}

class YTDownloader {
  cleanUrl(url) {
    const value = String(url || '').trim();
    const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/i);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    if (/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(value)) return value;
    throw new Error('Please provide a YouTube link or a search phrase.');
  }

  async fetchBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(response.data);
  }

  async downloadViaDavidCyril(url, outputPath) {
    const apiUrl = `https://apis.davidcyril.name.ng/youtube/mp444?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, {
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    const videoUrl = data?.status === true && data?.result?.url;
    if (!videoUrl) throw new Error('YouTube API did not return a video URL.');

    const response = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 120000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
      response.data.on('error', reject);
    });
    return {
      title: data.result.title || 'YouTube video',
      thumbnail: data.result.thumbnail,
    };
  }

  async getVideoInfo(url) {
    await checkYtDlp();
    const clean = this.cleanUrl(url);
    const { stdout } = await ytDlp([...ytDlpAuthArgs(), '--no-warnings', '--no-playlist', '-j', clean]);
    try {
      const json = JSON.parse(stdout.trim().split('\n').filter(Boolean).at(-1));
      return {
        id: json.id,
        title: json.title || 'YouTube video',
        artist: json.uploader || 'Unknown Artist',
        thumbnail: json.thumbnail || `https://i.ytimg.com/vi/${json.id}/hqdefault.jpg`,
        duration: json.duration,
      };
    } catch (error) {
      throw new Error(`Could not read YouTube video information: ${error.message}`);
    }
  }

  async search(query) {
    const candidates = await this.searchCandidates(query, 1);
    const first = candidates[0];
    if (!first?.url) throw new Error('No YouTube search result found.');
    return first.url;
  }

  async searchCandidates(query, limit = 5) {
    const result = await ytSearch(String(query).trim());
    return (result?.videos || []).filter(video => video?.url).slice(0, limit);
  }

  download(url, outputPath, isAudio = true, onProgress = null) {
    const clean = this.cleanUrl(url);
    const args = isAudio
      ? [...ytDlpAuthArgs(), '--no-playlist', '-x', '--audio-format', 'mp3', '--audio-quality', '0', '--newline', '-o', outputPath, clean]
      : [...ytDlpAuthArgs(), '--no-playlist', '-f', 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best', '--merge-output-format', 'mp4', '--newline', '-o', outputPath, clean];
    return ytDlp(args, { onProgress }).then(() => outputPath);
  }

  async writeTags(filePath, metadata) {
    try {
      await new Promise((resolve, reject) => {
        NodeID3.write({ title: metadata.title, artist: metadata.artist, album: 'YouTube' }, filePath, error => error ? reject(error) : resolve());
      });
    } catch (error) {
      console.warn(chalk.yellow(`[YT] ID3 tagging skipped: ${error.message}`));
    }
  }

  async mp3(query, onProgress = null) {
    const url = /^https?:\/\//i.test(query) ? this.cleanUrl(query) : await this.search(query);
    const meta = await this.getVideoInfo(url);
    const fileName = `${meta.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)}_${randomUUID()}.mp3`;
    const output = path.join(DIRS.audio, fileName);
    await this.download(url, output, true, onProgress);
    await this.writeTags(output, meta);
    return { path: output, meta };
  }

  async mp4(query, onProgress = null) {
    const directUrl = /^https?:\/\//i.test(query);
    const url = directUrl ? this.cleanUrl(query) : await this.search(query);

    if (url) {
      const apiFileName = `youtube_${randomUUID()}.mp4`;
      const apiOutput = path.join(DIRS.video, apiFileName);
      try {
        const apiMeta = await this.downloadViaDavidCyril(url, apiOutput);
        return { path: apiOutput, meta: { title: apiMeta.title, thumbnail: apiMeta.thumbnail } };
      } catch (error) {
        await fsp.unlink(apiOutput).catch(() => {});
        if (process.env.YT_DLP_VIDEO_FALLBACK === 'true') {
          console.warn(chalk.yellow(`[YT] API download failed, falling back to yt-dlp: ${error.message}`));
        } else {
          throw new Error(`YouTube video API unavailable: ${error.message}`);
        }
      }
    }

    const meta = await this.getVideoInfo(url);
    const fileName = `${meta.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)}_${randomUUID()}.mp4`;
    const output = path.join(DIRS.video, fileName);
    await this.download(url, output, false, onProgress);
    return { path: output, meta };
  }
}

const YT = new YTDownloader();

async function runYt(sock, msg, query, type = 'mp4', { silent = false, throwOnError = false } = {}) {
  const jid = msg?.key?.remoteJid;
  if (!jid) throw new Error('Could not determine the chat for this request.');
  const search = String(query || '').trim();
  if (!search) return sock.sendMessage(jid, { text: 'Please send a YouTube video link or search phrase.' }, { quoted: msg });
  const status = silent ? null : await sock.sendMessage(jid, { text: `Searching YouTube for: ${search}` }, { quoted: msg });
  try {
    const onProgress = percent => {
      if (status?.key) sock.sendMessage(jid, { text: `Downloading… ${percent}`, edit: status.key }).catch(() => {});
    };
    if (type === 'mp3') {
      const result = await YT.mp3(search, onProgress);
      await sock.sendMessage(jid, { audio: { url: result.path }, mimetype: 'audio/mpeg', fileName: `${result.meta.title}.mp3` }, { quoted: msg });
    } else {
      const result = await YT.mp4(search, onProgress);
      await sock.sendMessage(jid, { video: { url: result.path }, mimetype: 'video/mp4', fileName: `${result.meta.title}.mp4`, caption: result.meta.title }, { quoted: msg });
    }
  } catch (error) {
    console.error(chalk.red(`[YT] ${error.stack || error.message}`));
    if (throwOnError) throw error;
    await sock.sendMessage(jid, { text: `YouTube download failed: ${error.message}` }, { quoted: msg });
  }
}

async function cleanOldFiles() {
  const now = Date.now();
  for (const folder of Object.values(DIRS)) {
    try {
      for (const file of await fsp.readdir(folder)) {
        const target = path.join(folder, file);
        const info = await fsp.stat(target);
        if (info.isFile() && now - info.mtimeMs > CLEANUP_AGE_MS) await fsp.unlink(target);
      }
    } catch (error) {
      console.warn(`[YT] Cleanup skipped for ${folder}: ${error.message}`);
    }
  }
}

const cleanupTimer = setInterval(() => cleanOldFiles().catch(() => {}), 60 * 60 * 1000);
cleanupTimer.unref?.();
cleanOldFiles().catch(() => {});

module.exports = { runYt, cleanOldFiles, YT };
