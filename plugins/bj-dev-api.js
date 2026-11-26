// ============================================
// 🔌 BJ-DEV WORKING APIs - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// Set BJ_DEV_API_KEY in Railway Variables before use.
// SIM lookup remains in plugins/simdata.js.
// ============================================

const axios = require('axios');
const { waqar } = require('../waqar');

const BASE_URL = 'https://apis-bj-dev.vercel.app';
const API_KEY = process.env.BJ_DEV_API_KEY || process.env.BJ_API_KEY || '';
const TIMEOUT = 45000;
const MAX_TEXT = 3500;

const definitions = [
    { pattern: 'bjstats', path: '/system/stats', category: 'utility', usage: '.bjstats', params: () => ({}) },
    { pattern: 'bjcloud', path: '/ai/cloudflare', category: 'ai', usage: '.bjcloud hello', params: q => ({ prompt: q, list_models: 'false', model: '@cf/zai-org/glm-4.7-flash' }) },
    { pattern: 'bjcopilot', path: '/ai/copilot', category: 'ai', usage: '.bjcopilot hello', params: q => ({ prompt: q, mode: 'search' }) },
    { pattern: 'bjmanus', path: '/ai/manus', category: 'ai', usage: '.bjmanus hello', params: q => ({ msg: q }) },
    { pattern: 'bjassistant', path: '/ai/bj-assistant', category: 'ai', usage: '.bjassistant hello', params: q => ({ text: q }) },
    { pattern: 'bjgeno', path: '/ai/geno-chatgpt', category: 'ai', usage: '.bjgeno hello', params: q => ({ prompt: q }) },
    { pattern: 'bjgemini', path: '/ai/gemini-flash', category: 'ai', usage: '.bjgemini hello', params: q => ({ message: q }) },
    { pattern: 'bjytsearch', path: '/search/youtube', category: 'search', usage: '.bjytsearch song name', params: q => ({ q }) },
    { pattern: 'bjimgsearch', path: '/search/bing-image', category: 'search', usage: '.bjimgsearch cats', params: q => ({ search: q }) },
    { pattern: 'bjpinsearch', path: '/search/pinterest', category: 'search', usage: '.bjpinsearch cats [limit]', params: q => ({ search: q.replace(/\s+\d+$/, ''), limit: (q.match(/\s(\d+)$/) || [])[1] || '5' }) },
    { pattern: 'bjytmp3', path: '/downloaders/ytmp3', category: 'download', usage: '.bjytmp3 youtube link or search', params: q => ({ query: q, limit: '1' }) },
    { pattern: 'bjapk1', path: '/tools/apk-dl-v1', category: 'download', usage: '.bjapk1 app name', params: q => ({ query: q, limit: '1' }) },
    { pattern: 'bjapk2', path: '/tools/apk-dl-v2', category: 'download', usage: '.bjapk2 app name', params: q => ({ query: q }) },
    { pattern: 'bjzip', path: '/tools/website-to-zip', category: 'tools', usage: '.bjzip https://example.com', params: q => ({ url: q }) },
    { pattern: 'bjtts', path: '/media/tts-pro', category: 'media', usage: '.bjtts hello | voice', params: q => { const [text, voice] = q.split('|').map(v => v.trim()); return { text, voice: voice || 'ChristopherMultilingual' }; } },
    { pattern: 'bjtempgmail', path: '/tools/temp-gmail', category: 'tools', usage: '.bjtempgmail', params: () => ({ action: 'create' }) },
    { pattern: 'bjtempmail', path: '/tools/emailnator', category: 'tools', usage: '.bjtempmail', params: () => ({ action: 'create' }) },
    { pattern: 'bjscreenshot', path: '/tools/screenshot', category: 'media', usage: '.bjscreenshot https://example.com', params: q => ({ url: q }) },
    { pattern: 'fancytext', path: '/tools/fancy-text', category: 'tools', usage: '.fancytext hello', params: q => ({ text: q }) },
    { pattern: 'emojimix', path: '/tools/emojimix', category: 'fun', usage: '.emojimix 😀😂', params: q => ({ emoji: q }) },
    { pattern: 'bjqr', path: '/tools/dynamic-qr', category: 'tools', usage: '.bjqr hello', params: q => ({ message: q }) },
    { pattern: 'bjimage', path: '/media/image-generator', category: 'ai', usage: '.bjimage a sunset over mountains', params: q => ({ prompt: q, model: 'flux' }) },
    { pattern: 'bjcurrency', path: '/tools/currency-converter', category: 'tools', usage: '.bjcurrency USD PKR 1', params: q => { const [From = 'USD', To = 'PKR', Amount = '1'] = q.split(/\s+/); return { From, To, Amount }; } },
    { pattern: 'bjtranslate', path: '/tools/translator', category: 'tools', usage: '.bjtranslate en ur hello world', params: q => { const [from = 'en', to = 'ur', ...words] = q.split(/\s+/); return { text: words.join(' '), to, from }; } }
];

function flatten(value, prefix = '', rows = [], depth = 0) {
    if (rows.length >= 60 || depth > 5) return rows;
    if (value === null || value === undefined || value === '') {
        rows.push(`${prefix || 'Result'}: N/A`);
        return rows;
    }
    if (typeof value !== 'object') {
        rows.push(`${prefix || 'Result'}: ${String(value)}`);
        return rows;
    }
    for (const [key, item] of Object.entries(value)) {
        const label = prefix ? `${prefix}.${key}` : key;
        if (typeof item === 'object' && item !== null) flatten(item, label, rows, depth + 1);
        else rows.push(`${label}: ${String(item ?? 'N/A')}`);
        if (rows.length >= 60) break;
    }
    return rows;
}

function findMediaUrl(value) {
    if (!value || typeof value !== 'object') return null;
    for (const key of ['url', 'image', 'imageUrl', 'downloadUrl', 'download_url', 'audio', 'audioUrl', 'result']) {
        const candidate = value[key];
        if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate;
        if (candidate && typeof candidate === 'object') {
            const nested = findMediaUrl(candidate);
            if (nested) return nested;
        }
    }
    for (const item of Object.values(value)) {
        const nested = findMediaUrl(item);
        if (nested) return nested;
    }
    return null;
}

function prettyResponse(data) {
    if (typeof data === 'string') return data;
    const result = data?.result ?? data?.data ?? data?.response ?? data;
    return flatten(result).join('\n');
}

async function callApi(definition, q) {
    const params = definition.params(q);
    const headers = API_KEY ? { 'x-apikey': API_KEY } : {};
    const query = API_KEY ? { ...params, apikey: API_KEY } : params;
    return axios.get(`${BASE_URL}${definition.path}`, {
        params: query,
        headers,
        timeout: TIMEOUT,
        validateStatus: status => status >= 200 && status < 500
    });
}

for (const definition of definitions) {
    waqar({
        pattern: definition.pattern,
        alias: [],
        desc: `BJ-Dev: ${definition.usage}`,
        category: definition.category,
        react: '🔌',
        use: definition.usage,
        filename: __filename
    }, async (conn, mek, m, { from, q, reply }) => {
        try {
            if (definition.pattern !== 'bjstats' && !API_KEY) {
                return reply('🔑 BJ-Dev API key is not configured. Add `BJ_DEV_API_KEY` in Railway Variables, then restart the bot.');
            }
            if (definition.pattern !== 'bjstats' && !q) {
                return reply(`📌 Usage: \`${definition.usage}\``);
            }
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
            const response = await callApi(definition, String(q || '').trim());
            if (response.status === 401 || response.status === 403) return reply('❌ BJ-Dev API key is invalid or rejected. Check `BJ_DEV_API_KEY`.');
            if (response.status >= 400) return reply(`❌ BJ-Dev API returned HTTP ${response.status}. Please try again later.`);
            const data = response.data;
            const mediaUrl = findMediaUrl(data);
            const lowerPath = definition.path.toLowerCase();
            if (mediaUrl && (lowerPath.includes('screenshot') || lowerPath.includes('image-generator') || lowerPath.includes('dynamic-qr') || lowerPath.includes('emojimix'))) {
                return conn.sendMessage(from, { image: { url: mediaUrl }, caption: `🔌 *${definition.pattern}*\n\nPowered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍` }, { quoted: mek });
            }
            const text = prettyResponse(data).slice(0, MAX_TEXT);
            return reply(`╭━━━〔 🔌 *${definition.pattern.toUpperCase()}* 〕━━━╮\n${text || 'No result returned.'}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n> Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`);
        } catch (error) {
            console.error(`[${definition.pattern}]`, error.message);
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return reply('⏱️ BJ-Dev API timed out. Please try again.');
            return reply('❌ BJ-Dev API is temporarily unavailable. Please try again later.');
        }
    });
}

waqar({
    pattern: 'bjhelp',
    alias: ['bjapis'],
    desc: 'List BJ-Dev API commands',
    category: 'utility',
    react: '🔌',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const lines = definitions.map(item => `• .${item.pattern} — ${item.usage.replace(`.${item.pattern}`, '').trim()}`);
    reply(`╭━━━〔 🔌 *BJ-DEV APIs* 〕━━━╮\n${lines.join('\n')}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
});
