'use strict';

const { waqar } = require('../waqar');
const { getJson, downloadMovieFile } = require('../lib/media-api');
const fs = require('node:fs/promises');

const MAX_MOVIE_BYTES = 64 * 1024 * 1024;
const searchByChat = new Map();

function cleanText(value, limit = 220) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit);
}

waqar({
  pattern: 'movie',
  alias: ['movies', 'film', 'searchmovie'],
  desc: 'Search public-domain and Creative Commons movies',
  category: 'download',
  react: '🎬',
  filename: __filename,
}, async (_conn, _mek, _m, { from, text, reply }) => {
  const query = String(text || '').trim();
  if (!query) return reply('Usage: .movie <title>\nChoose a result with .movieget <number>');

  try {
    const data = await getJson('/api/v1/movie2/search', { q: query, limit: 8 });
    const results = Array.isArray(data.results) ? data.results : Array.isArray(data.entries) ? data.entries : [];
    if (!results.length) return reply(`No public-domain/Creative Commons movies found for “${query}”. Try another title.`);

    searchByChat.set(from, results);
    const lines = results.map((item, index) => {
      const year = item.year ? ` (${item.year})` : '';
      return `${index + 1}. ${cleanText(item.title, 100)}${year}`;
    });
    return reply(`🎬 *Internet Archive search: ${cleanText(query, 100)}*\n\n${lines.join('\n')}\n\nUse .movieget <number> to inspect and get an eligible small MP4.\nOnly items with verified public-domain/Creative Commons rights are considered.`);
  } catch (error) {
    console.error('[Movie search] Error:', error.stack || error.message);
    return reply(`Movie search failed: ${error.message}`);
  }
});

waqar({
  pattern: 'movieget',
  alias: ['moviedl'],
  desc: 'Get a verified public-domain/Creative Commons movie',
  category: 'download',
  react: '📥',
  filename: __filename,
}, async (conn, mek, _m, { from, args, reply }) => {
  const results = searchByChat.get(from);
  const index = Number.parseInt(args?.[0], 10) - 1;
  if (!results) return reply('Search first with .movie <title>.');
  if (!Number.isInteger(index) || index < 0 || index >= results.length) return reply('Use .movieget <result number> from the latest movie search.');

  let localFile;
  try {
    const chosen = results[index];
    const data = await getJson(`/api/v1/movie2/qualities/${encodeURIComponent(chosen.id)}`);
    const rights = String(data.rights || data.license || '');
    const rightsVerified = data.rightsVerified === true || data.rights_verified === true;
    const isAllowedLicense = /publicdomain|creativecommons\.org/i.test(rights);
    const sourceUrl = chosen.detailsUrl || `https://archive.org/details/${encodeURIComponent(chosen.id)}`;

    if (!rightsVerified || !isAllowedLicense) {
      return reply(`This item did not return a verified public-domain/Creative Commons license, so I won't download it. Source: ${sourceUrl}`);
    }

    const formats = Array.isArray(data.qualities) ? data.qualities : Array.isArray(data.formats) ? data.formats : [];
    const candidate = formats
      .filter(item => item.downloadable !== false && /\.mp4$/i.test(String(item.name || item.format_id || item.formatId || '')))
      .filter(item => Number(item.sizeBytes || item.filesize || item.filesize_approx || 0) > 0 && Number(item.sizeBytes || item.filesize || item.filesize_approx || 0) <= MAX_MOVIE_BYTES)
      .sort((a, b) => Number(a.sizeBytes || a.filesize || 0) - Number(b.sizeBytes || b.filesize || 0))[0];

    if (!candidate?.downloadPath) {
      const sizes = formats.filter(item => /\.mp4$/i.test(String(item.name || item.format_id || ''))).map(item => item.size || '').filter(Boolean);
      return reply(`✅ *${cleanText(chosen.title, 150)}*\nVerified license: ${rights}\nNo MP4 under 64 MB was available for sending in chat${sizes.length ? ` (available sizes: ${sizes.join(', ')})` : ''}.\nOpen the source page: ${sourceUrl}`);
    }

    localFile = await downloadMovieFile(candidate.downloadPath, MAX_MOVIE_BYTES);
    const title = cleanText(chosen.title, 100).replace(/[\\/:*?"<>|]/g, '_') || 'public-domain-movie';
    await conn.sendMessage(from, {
      document: { url: localFile },
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption: `🎬 ${title}\nLicense: ${rights}\nSource: Internet Archive`,
    }, { quoted: mek });
  } catch (error) {
    console.error('[Movie download] Error:', error.stack || error.message);
    await reply(`Movie retrieval failed: ${error.message}`);
  } finally {
    if (localFile) await fs.unlink(localFile).catch(() => {});
  }
});
