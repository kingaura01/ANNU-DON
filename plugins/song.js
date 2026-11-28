'use strict';

const { waqar } = require('../waqar');
const { runYt, YT } = require('../lib/yt');
const { getJson, downloadJob } = require('../lib/media-api');
const fs = require('node:fs/promises');

waqar({
  pattern: 'play',
  alias: ['song', 'audio', 'mp3', 'gana', 'ytmp3', 'ytaudio', 'playaudio', 'music', 'melody'],
  desc: 'Play or download YouTube audio',
  category: 'download',
  react: '🎵',
  filename: __filename,
}, async (conn, mek, _m, { text, reply }) => {
  const query = String(text || '').trim();
  if (!query) return reply('Usage: .play <YouTube link or song name>');

  let localFile;
  try {
    const candidates = /^https?:\/\//i.test(query)
      ? [{ url: query }]
      : await YT.searchCandidates(query, 5);
    if (!candidates.length) throw new Error('No YouTube result found for that search.');

    let lastApiError;
    for (const candidate of candidates) {
      try {
        const result = await getJson('/api/v1/play', { query: candidate.url });
        localFile = await downloadJob(result.job_id, 'mp3');
        const title = String(result.title || candidate.title || query)
          .replace(/[\\/:*?"<>|]/g, '_')
          .slice(0, 120);
        await conn.sendMessage(mek.key.remoteJid, {
          audio: { url: localFile },
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
        }, { quoted: mek });
        return;
      } catch (apiError) {
        lastApiError = apiError;
        console.warn(`[Play] Candidate failed (${candidate.url}): ${apiError.message}`);
        if (localFile) await fs.unlink(localFile).catch(() => {});
        localFile = null;
      }
    }

    console.warn(`[Play] Media API unavailable; trying yt-dlp: ${lastApiError?.message || 'unknown error'}`);
    let lastYtError = lastApiError;
    for (const candidate of candidates) {
      try {
        await runYt(conn, mek, candidate.url || query, 'mp3', { silent: true, throwOnError: true });
        return;
      } catch (ytError) {
        lastYtError = ytError;
        console.warn(`[Play] yt-dlp candidate failed (${candidate.url}): ${ytError.message}`);
      }
    }
    throw lastYtError || new Error('All YouTube download candidates failed.');
  } catch (error) {
    console.error('[Play] Error:', error.stack || error.message);
    const message = /sign in to confirm your age|age-restricted|confirm your age/i.test(error.message)
      ? 'This YouTube video is age-restricted. Try another result or configure YT_DLP_COOKIES_FILE for restricted videos.'
      : `Audio download failed: ${error.message}`;
    await reply(message);
  } finally {
    if (localFile) await fs.unlink(localFile).catch(() => {});
  }
});
