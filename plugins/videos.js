'use strict';

const { waqar } = require('../waqar');
const { runYt, YT } = require('../lib/yt');
const { getJson, downloadJob } = require('../lib/media-api');
const fs = require('node:fs/promises');

async function sendVideo(conn, mek, query, asDocument) {
  let localFile;
  try {
    const jid = mek.key.remoteJid;
    const status = await conn.sendMessage(jid, { text: `Searching for video: ${query}` }, { quoted: mek });
    try {
      const result = await getJson('/api/v1/video', { query });
      localFile = await downloadJob(result.job_id, 'mp4');
      const title = String(result.title || 'YouTube video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
      const media = asDocument
        ? { document: { url: localFile }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: title }
        : { video: { url: localFile }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: title };
      await conn.sendMessage(jid, media, { quoted: mek });
    } catch (apiError) {
      console.warn(`[Video] API unavailable; trying existing downloader: ${apiError.message}`);
      if (status?.key) await conn.sendMessage(jid, { text: 'Video service failed; trying the built-in downloader…', edit: status.key }).catch(() => {});
      if (asDocument) {
        const result = await YT.mp4(query);
        await conn.sendMessage(jid, {
          document: { url: result.path },
          mimetype: 'video/mp4',
          fileName: `${String(result.meta?.title || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120)}.mp4`,
          caption: result.meta?.title || 'YouTube video',
        }, { quoted: mek });
      } else await runYt(conn, mek, query, 'mp4');
    }
  } finally {
    if (localFile) await fs.unlink(localFile).catch(() => {});
  }
}

waqar({
  pattern: 'video',
  alias: ['yt', 'ytv', 'ytdl', 'video3', 'video2', 'video4'],
  desc: 'Download a YouTube video by link or search phrase',
  category: 'download',
  react: '🌸',
  filename: __filename,
}, async (conn, mek, _m, { args, reply }) => {
  const query = Array.isArray(args) ? args.join(' ').trim() : '';
  if (!query) return reply('Usage: .video <YouTube link or search phrase>');
  try {
    await sendVideo(conn, mek, query, false);
  } catch (error) {
    console.error('[Video] Error:', error.stack || error.message);
    return reply(`Video download failed: ${error.message}`);
  }
});

waqar({
  pattern: 'videodoc',
  alias: ['vdoc', 'docvideo'],
  desc: 'Download a YouTube video as a document',
  category: 'download',
  react: '🌸',
  filename: __filename,
}, async (conn, mek, _m, { args, reply }) => {
  const query = Array.isArray(args) ? args.join(' ').trim() : '';
  if (!query) return reply('Usage: .videodoc <YouTube link or search phrase>');
  try {
    await sendVideo(conn, mek, query, true);
  } catch (error) {
    console.error('[Video document] Error:', error.stack || error.message);
    return reply(`Video download failed: ${error.message}`);
  }
});
