'use strict';

const axios = require('axios');
const { waqar } = require('../waqar');

const TTS_URL = 'https://translate.google.com/translate_tts';
const MAX_TEXT_LENGTH = 200;
const TIMEOUT = 45000;

function detectLanguage(text) {
  return /[\u0600-\u06ff]/.test(text) ? 'ur' : 'en';
}

function parseInput(value) {
  const parts = String(value || '').split('|').map(part => part.trim());
  const text = parts.shift() || '';
  const requestedLanguage = String(parts.join('|') || '').toLowerCase();
  const language = /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(requestedLanguage)
    ? requestedLanguage.split('-')[0]
    : detectLanguage(text);
  return { text, language };
}

waqar({
  pattern: 'tts',
  alias: ['sayv', 'voicenote'],
  desc: 'Convert text to a voice note without an API key',
  category: 'media',
  react: '🎙️',
  use: '.tts hello | en/ur',
  filename: __filename
}, async (conn, mek, _m, { from, q, reply }) => {
  const { text, language } = parseInput(q);
  if (!text) return reply('Usage: .tts your text | en/ur');
  if (text.length > MAX_TEXT_LENGTH) {
    return reply(`❌ Text بہت لمبا ہے۔ فی voice note زیادہ سے زیادہ ${MAX_TEXT_LENGTH} characters لکھیں۔`);
  }

  try {
    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
    const response = await axios.get(TTS_URL, {
      params: { ie: 'UTF-8', client: 'tw-ob', tl: language, q: text },
      responseType: 'arraybuffer',
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'audio/mpeg' }
    });
    const audio = Buffer.from(response.data || []);
    if (!audio.length) throw new Error('TTS service returned empty audio');

    await conn.sendMessage(from, {
      audio,
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
  } catch (error) {
    console.error('[TTS] Error:', error.response?.status || error.message);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
    return reply('❌ Voice generate نہیں ہو سکی۔ دوبارہ try کریں۔');
  }
});

console.log('[ANNU-DON] Direct no-key TTS loaded (.tts / .sayv)');
