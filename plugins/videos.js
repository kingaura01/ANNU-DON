const { waqar } = require('../waqar');
const { runYt, YT } = require('../lib/yt');

waqar({
  pattern: 'video',
  alias: ['yt', 'ytv', 'video3', 'video2', 'video4'],
  desc: 'Download a YouTube video by link or search phrase',
  category: 'download',
  react: '🌸',
  filename: __filename,
}, async (conn, mek, _m, { args, reply }) => {
  const query = Array.isArray(args) ? args.join(' ').trim() : '';
  if (!query) return reply('Usage: .video <YouTube link or search phrase>');
  return runYt(conn, mek, query, 'mp4');
});

waqar({
  pattern: 'videodoc',
  alias: ['vdoc', 'docvideo'],
  desc: 'Download a YouTube video as a document',
  category: 'download',
  react: '🌸',
  filename: __filename,
}, async (conn, mek, _m, { from, args, reply }) => {
  const query = Array.isArray(args) ? args.join(' ').trim() : '';
  if (!query) return reply('Usage: .videodoc <YouTube link or search phrase>');
  try {
    const result = await YT.mp4(query);
    const safeTitle = String(result.meta.title || 'youtube-video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
    await conn.sendMessage(from, {
      document: { url: result.path },
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`,
      caption: result.meta.title,
    }, { quoted: mek });
  } catch (error) {
    console.error('[YT document] Error:', error.stack || error.message);
    return reply(`YouTube download failed: ${error.message}`);
  }
});
