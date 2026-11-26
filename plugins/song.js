const { waqar } = require('../waqar');
const { runYt } = require('../lib/yt');

waqar({
  pattern: 'audio',
  alias: ['mp3', 'song', 'gana', 'play', 'ytmp3', 'ytaudio', 'playaudio', 'music', 'melody'],
  desc: 'Download YouTube audio as MP3',
  category: 'download',
  react: '🎵',
  filename: __filename,
}, async (conn, mek, _m, { text, reply }) => {
  const query = String(text || '').trim();
  if (!query) return reply('Usage: .audio <YouTube link or song name>');
  return runYt(conn, mek, query, 'mp3');
});
