'use strict';

const { waqar } = require('../waqar');
const { runYt } = require('../lib/yt');
const { getJson, downloadJob } = require('../lib/media-api');
const fs = require('node:fs/promises');

waqar({
  pattern: 'play',
  alias: ['audio', 'mp3', 'gana', 'ytmp3', 'ytaudio', 'playaudio', 'music', 'melody'],
  desc: 'Play or download YouTube audio',
  category: 'download',
  react: '🎵',
  filename: __filename,
}, async (conn, mek, _m, { text, reply }) => {
  const query = String(text || '').trim();
  if (!query) return reply('Usage: .play <YouTube link or song name>');

  let localFile;
  try {
    const status = await conn.sendMessage(mek.key.remoteJid, { text: `Searching for: ${query}` }, { quoted: mek });
    try {
      const result = await getJson('/api/v1/play', { query });
      localFile = await downloadJob(result.job_id, 'mp3');
      const title = String(result.title || query).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
      await conn.sendMessage(mek.key.remoteJid, {
        audio: { url: localFile },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
      }, { quoted: mek });
    } catch (apiError) {
      console.warn(`[Play] API unavailable; trying existing downloader: ${apiError.message}`);
      if (status?.key) await conn.sendMessage(mek.key.remoteJid, { text: 'Audio service failed; trying the built-in downloader…', edit: status.key }).catch(() => {});
      await runYt(conn, mek, query, 'mp3');
    }
  } catch (error) {
    console.error('[Play] Error:', error.stack || error.message);
    await reply(`Audio download failed: ${error.message}`);
  } finally {
    if (localFile) await fs.unlink(localFile).catch(() => {});
  }
});
