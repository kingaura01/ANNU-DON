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

function normalizeText(value) {
    return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
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
    return /\b(?:episode|ep)\s*\d{1,3}\b/i.test(normalized);
}

function durationSeconds(video) {
    const seconds = Number(video?.duration?.seconds);
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
    const timestamp = String(video?.duration?.timestamp || '');
    if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(timestamp)) return 0;
    return timestamp.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
}

function isOfficialFullEpisode(video, dramaTitle) {
    const source = getOfficialChannel(video?.author?.url);
    if (!source || !hasFullEpisodeTitle(video?.title)) return false;
    if (!normalizeText(video?.title).includes(normalizeText(dramaTitle))) return false;
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

async function findOfficialEpisodes(dramaTitle) {
    const result = await searchWithTimeout(`${dramaTitle} Pakistani drama full episode`);
    const seen = new Set();
    return (result?.videos || [])
        .filter(video => isOfficialFullEpisode(video, dramaTitle))
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

function officialChannelSearches(dramaTitle) {
    const query = encodeURIComponent(dramaTitle);
    return OFFICIAL_CHANNELS.map(channel => ({
        name: channel.name,
        url: `${channel.url}/search?query=${query}`
    }));
}

waqar({
    pattern: 'drama',
    alias: ['pakdrama', 'dramas'],
    desc: '📺 Find official Pakistani drama full episodes',
    category: 'media',
    react: '📺',
    use: '.drama <drama name>',
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    const dramaTitle = String(text || '').trim().slice(0, 80);
    if (!dramaTitle) {
        return reply('📺 *Pakistani Drama Finder*\nUse: `.drama <drama name>`\nExample: `.drama Hurmat`\n\nSirf official broadcaster ke YouTube full-episode links dikhaye jate hain; bot episode files download/forward nahi karta.');
    }

    await conn.sendMessage(from, { react: { text: '🔎', key: mek.key } }).catch(() => {});

    try {
        const episodes = await findOfficialEpisodes(dramaTitle);
        if (episodes.length) {
            const entries = episodes.map((episode, index) =>
                `${index + 1}. *${episode.title}*\n📺 ${episode.channel}\n${episode.url}`
            ).join('\n\n');
            return reply(`╭━━━〔 📺 *PAKISTANI DRAMA* 〕━━━╮\nDrama: *${dramaTitle}*\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n✅ Official full-episode links:\n\n${entries}\n\nLinks YouTube ke official broadcaster channels par khulte hain. Region availability mukhtalif ho sakti hai.\n\n> Powered by ANNU-DON`);
        }

        const searches = officialChannelSearches(dramaTitle)
            .map(source => `• ${source.name}: ${source.url}`)
            .join('\n');
        return reply(`Official channel par “${dramaTitle}” ka matching full episode nahi mila. In official channels mein search karein:\n\n${searches}\n\n> Powered by ANNU-DON`);
    } catch (error) {
        console.error('[Drama] Search error:', error.message);
        const searches = officialChannelSearches(dramaTitle)
            .map(source => `• ${source.name}: ${source.url}`)
            .join('\n');
        return reply(`Drama search abhi kaam nahi kar rahi. Official channels se try karein:\n\n${searches}\n\n> Powered by ANNU-DON`);
    }
});

module.exports = {
    OFFICIAL_CHANNELS,
    getOfficialChannel,
    hasFullEpisodeTitle,
    isOfficialFullEpisode,
    officialChannelSearches,
    findOfficialEpisodes
};
