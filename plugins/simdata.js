// ============================================
// 📱 SIM DATA LOOKUP - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// Usage: .simdata 03001234567
// ============================================

const axios = require('axios');
const { waqar } = require('../waqar');

const SIM_API = 'https://ftgm-simdb-api.vercel.app/api/sim';
const MAX_DEPTH = 4;
const MAX_ITEMS = 40;
const MAX_TEXT_LENGTH = 3500;

function normalizeNumber(value) {
    return String(value || '').replace(/[\s+()-]/g, '');
}

function formatValue(value, depth = 0) {
    if (depth > MAX_DEPTH) return '[nested data]';
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value !== 'object') return String(value);

    const entries = Array.isArray(value)
        ? value.slice(0, MAX_ITEMS).map((item, index) => [index + 1, item])
        : Object.entries(value).slice(0, MAX_ITEMS);

    return entries.map(([key, item]) => {
        const label = String(key)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
        const rendered = typeof item === 'object'
            ? `\n${formatValue(item, depth + 1)}`
            : String(item ?? 'N/A');
        return `┃ ${label}: ${rendered}`;
    }).join('\n');
}

function trimText(text) {
    if (text.length <= MAX_TEXT_LENGTH) return text;
    return `${text.slice(0, MAX_TEXT_LENGTH - 30)}\n┃ ...response truncated`;
}

waqar({
    pattern: 'simdata',
    alias: ['sim', 'siminfo', 'numberinfo'],
    desc: '📱 Get SIM data for a phone number',
    category: 'utility',
    react: '📱',
    use: '.simdata 03001234567',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const number = normalizeNumber(q);

        if (!number) {
            return reply('📱 *SIM DATA*\n\nUse: `.simdata 03001234567`');
        }

        if (!/^\d{10,15}$/.test(number)) {
            return reply('❌ Please provide a valid phone number with 10–15 digits.\nExample: `.simdata 03001234567`');
        }

        await conn.sendMessage(from, { react: { text: '🔎', key: mek.key } }).catch(() => {});

        const { data } = await axios.get(SIM_API, {
            params: { num: number },
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 500
        });

        if (!data || (typeof data === 'object' && data.success === false)) {
            return reply('❌ No SIM data was found for this number.');
        }

        const result = typeof data === 'object'
            ? (data.data ?? data.result ?? data.response ?? data)
            : data;
        const details = typeof result === 'object' ? formatValue(result) : String(result);
        const text = trimText(`╭━━━〔 📱 *𝐒𝐈𝐌 𝐃𝐀𝐓𝐀* 〕━━━╮\n┃ Number: ${number}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${details}\n\n> Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`);

        return reply(text);
    } catch (error) {
        console.error('[simdata] API error:', error.message);
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return reply('⏱️ SIM API is taking too long. Please try again in a few seconds.');
        }
        return reply('❌ SIM data service is temporarily unavailable. Please try again later.');
    }
});
