const ytSearch = require('yt-search');
const { waqar } = require('../waqar');

const OFFICIAL_CHANNELS = [
    { name: 'ARY Digital', path: '/@arydigitalasia', url: 'https://www.youtube.com/@ARYDigitalasia' },
    { name: 'HUM TV', path: '/@humtv', url: 'https://www.youtube.com/@HUMTV' },
    { name: 'Green TV Entertainment', path: '/@greenentertainmenttv', url: 'https://www.youtube.com/@GreenEntertainmentTV' },
    { name: 'Har Pal Geo', path: '/@harpalgeoofficial', url: 'https://www.youtube.com/@HarPalGeoOfficial' }
];
const MAX_RESULTS = 5;
const SEARCH_TIMEOUT_MS = 18000;
const MONTHS = new Map([
    ['jan', 1], ['feb', 2], ['mar', 3], ['apr', 4], ['may', 5], ['jun', 6],
    ['jul', 7], ['aug', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]
]);
const MONTH_TOKEN_SOURCE = String.raw`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;
const DATE_TOKEN_SOURCE = String.raw`(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+${MONTH_TOKEN_SOURCE}\s+\d{4})`;
const DATE_IN_QUERY = new RegExp(String.raw`\b(?:date\s*[:=]?\s*)?(${DATE_TOKEN_SOURCE})\b`, 'i');
const DATE_IN_TITLE = new RegExp(String.raw`\b(${DATE_TOKEN_SOURCE})\b`, 'gi');

function normalizeText(value) {
    return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function normalizeDate(value) {
    const input = String(value || '').trim();
    let year;
    let month;
    let day;
    let match;

    if ((match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(input))) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
    } else if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(input))) {
        day = Number(match[1]);
        month = Number(match[2]);
        year = Number(match[3]);
    } else if ((match = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})$/i.exec(input))) {
        day = Number(match[1]);
        month = MONTHS.get(match[2].slice(0, 3).toLowerCase());
        year = Number(match[3]);
    } else {
        return null;
    }

    if (!year || !month || !day) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDramaQuery(input) {
    let remaining = String(input || '').trim().replace(/\s+/g, ' ');
    let episodeNumber = null;
    let date = null;

    const dateMatch = DATE_IN_QUERY.exec(remaining);
    if (dateMatch) {
        date = normalizeDate(dateMatch[1]);
        if (!date) return { error: 'invalid-date' };
        remaining = remaining.replace(dateMatch[0], ' ');
    } else if (/\bdate\b/i.test(remaining)) {
        return { error: 'invalid-date' };
    }

    const episodeMatch = /\b(?:episode|ep)\.?\s*#?\s*(\d{1,3})\b/i.exec(remaining);
    if (episodeMatch) {
        episodeNumber = Number(episodeMatch[1]);
        if (episodeNumber < 1) return { error: 'invalid-episode' };
        remaining = remaining.replace(episodeMatch[0], ' ');
    }

    const title = remaining.replace(/\s+/g, ' ').trim();
    if (!title) return { error: 'missing-title' };
    return { title: title.slice(0, 80), episodeNumber, date };
}

function getOfficialChannel(channelUrl) {
    try {
        const parsed = new URL(channelUrl);
        if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) return null;
        const path = parsed.pathname.replace(/\/$/, '').toLowerCase();
        return OFFICIAL_CHANNELS.find(channel => channel.path === path) || null;
    } catch {
        return null;
    }
}

function hasFullEpisodeTitle(title) {
    const normalized = String(title || '');
    if (/\b(teaser|promo|trailer|ost|shorts?|clip|preview|review)\b/i.test(normalized)) return false;
    return /\b(?:episode|ep)\.?\s*#?\s*\d{1,3}\b/i.test(normalized);
}

function videoMatchesEpisode(title, episodeNumber) {
    if (!episodeNumber) return true;
    const expression = new RegExp(`\\b(?:episode|ep)\\.?\\s*#?\\s*0*${Number(episodeNumber)}\\b`, 'i');
    return expression.test(String(title || ''));
}

function dateMatchesTitle(title, date) {
    if (!date) return true;
    const dates = [...String(title || '').matchAll(DATE_IN_TITLE)]
        .map(match => normalizeDate(match[1]))
        .filter(Boolean);
    return dates.includes(date);
}

function durationSeconds(video) {
    const seconds = Number(video?.duration?.seconds);
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
    const timestamp = String(video?.duration?.timestamp || '');
    if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(timestamp)) return 0;
    return timestamp.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
}

function isOfficialFullEpisode(video, dramaTitle, filters = {}) {
    const source = getOfficialChannel(video?.author?.url);
    if (!source || !hasFullEpisodeTitle(video?.title)) return false;
    if (!normalizeText(video?.title).includes(normalizeText(dramaTitle))) return false;
    if (!videoMatchesEpisode(video?.title, filters.episodeNumber)) return false;
    if (!dateMatchesTitle(video?.title, filters.date)) return false;
    const seconds = durationSeconds(video);
    return !seconds || seconds >= 15 * 60;
}

function searchWithTimeout(query) {
    let timer;
    return Promise.race([
        ytSearch(query),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Drama search timed out')), SEARCH_TIMEOUT_MS);
        })
    ]).finally(() => clearTimeout(timer));
}

function makeSearchQuery(dramaTitle, filters = {}) {
    const parts = [dramaTitle, 'Pakistani drama full episode'];
    if (filters.episodeNumber) parts.push(`episode ${filters.episodeNumber}`);
    if (filters.date) parts.push(filters.date);
    return parts.join(' ');
}

async function findOfficialEpisodes(dramaTitle, filters = {}) {
    const result = await searchWithTimeout(makeSearchQuery(dramaTitle, filters));
    const seen = new Set();
    return (result?.videos || [])
        .filter(video => isOfficialFullEpisode(video, dramaTitle, filters))
        .filter(video => {
            try {
                const url = new URL(video.url);
                if (!/(^|\.)youtube\.com$/i.test(url.hostname) || !url.pathname.startsWith('/watch')) return false;
                if (seen.has(url.href)) return false;
                seen.add(url.href);
                return true;
            } catch {
                return false;
            }
        })
        .slice(0, MAX_RESULTS)
        .map(video => ({
            title: String(video.title).slice(0, 180),
            url: video.url,
            channel: getOfficialChannel(video.author.url).name
        }));
}

function officialChannelSearches(dramaTitle, filters = {}) {
    const query = encodeURIComponent([
        dramaTitle,
        filters.episodeNumber ? `episode ${filters.episodeNumber}` : '',
        filters.date || ''
    ].filter(Boolean).join(' '));
    return OFFICIAL_CHANNELS.map(channel => ({
        name: channel.name,
        url: `${channel.url}/search?query=${query}`
    }));
}

function describeFilters(filters = {}) {
    const parts = [];
    if (filters.episodeNumber) parts.push(`Episode ${filters.episodeNumber}`);
    if (filters.date) parts.push(`Date ${filters.date}`);
    return parts.length ? `\nFilter: ${parts.join(' | ')}` : '';
}

waqar({
    pattern: 'drama',
    alias: ['pakdrama', 'dramas'],
    desc: '📺 Find official Pakistani drama full episodes by title, episode or date',
    category: 'media',
    react: '📺',
    use: '.drama <name> [ep <number> | date <YYYY-MM-DD>]',
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    const parsed = parseDramaQuery(text);
    if (parsed.error === 'invalid-date') {
        return reply('❌ Date format samajh nahi aaya. `.drama Hurmat date 2026-11-25` ya `.drama Hurmat date 25-11-2026` use karein.');
    }
    if (parsed.error === 'invalid-episode') {
        return reply('❌ Episode number 1 ya us se bara dein. Example: `.drama Hurmat ep 17`');
    }
    if (parsed.error === 'missing-title') {
        return reply('📺 *Pakistani Drama Finder*\n`.drama <naam>` — drama search\n`.drama <naam> ep <number>` — episode number se search\n`.drama <naam> date <YYYY-MM-DD>` — date se search\n\nExample: `.drama Hurmat ep 17`\nExample: `.drama Hurmat date 2026-11-25`\n\nSirf official broadcaster ke YouTube links aate hain; bot episode files download/forward nahi karta.');
    }

    const { title: dramaTitle, episodeNumber, date } = parsed;
    const filters = { episodeNumber, date };
    await conn.sendMessage(from, { react: { text: '🔎', key: mek.key } }).catch(() => {});

    try {
        const episodes = await findOfficialEpisodes(dramaTitle, filters);
        if (episodes.length) {
            const entries = episodes.map((episode, index) =>
                `${index + 1}. *${episode.title}*\n📺 ${episode.channel}\n${episode.url}`
            ).join('\n\n');
            return reply(`╭━━━〔 📺 *PAKISTANI DRAMA* 〕━━━╮\nDrama: *${dramaTitle}*${describeFilters(filters)}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n✅ Official full-episode links:\n\n${entries}\n\nLinks YouTube ke official broadcaster channels par khulte hain. Region availability mukhtalif ho sakti hai.\n\n> Powered by ANNU-DON`);
        }

        const searches = officialChannelSearches(dramaTitle, filters)
            .map(source => `• ${source.name}: ${source.url}`)
            .join('\n');
        return reply(`Official channels par *${dramaTitle}*${describeFilters(filters)} ka matching full episode nahi mila. In official channels mein isi filter ke saath search karein:\n\n${searches}\n\n> Powered by ANNU-DON`);
    } catch (error) {
        console.error('[Drama] Search error:', error.message);
        const searches = officialChannelSearches(dramaTitle, filters)
            .map(source => `• ${source.name}: ${source.url}`)
            .join('\n');
        return reply(`Drama search abhi kaam nahi kar rahi. Official channels par isi filter ke saath try karein:\n\n${searches}\n\n> Powered by ANNU-DON`);
    }
});

module.exports = {
    OFFICIAL_CHANNELS,
    normalizeDate,
    parseDramaQuery,
    getOfficialChannel,
    hasFullEpisodeTitle,
    videoMatchesEpisode,
    dateMatchesTitle,
    isOfficialFullEpisode,
    makeSearchQuery,
    officialChannelSearches,
    findOfficialEpisodes
};
