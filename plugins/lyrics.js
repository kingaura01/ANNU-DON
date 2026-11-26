// ============================================
// 🌸 LYRICS - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 👑 Developer: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 💖 BOYS Power Mode: ON
// 📌 Category: Music
// ============================================

const axios = require('axios');
const { waqar } = require('../waqar');
const { fakevCard } = require('../lib/fakevCard');

// API Base URL
const API_BASE = 'https://discardapi.dpdns.org/api/music/lyrics';

async function fetchLyrics(song) {
    try {
        const { data } = await axios.get('https://lrclib.net/api/search', {
            params: { q: song },
            timeout: 20000,
            headers: { 'User-Agent': 'ANNU-DON WhatsApp Bot/1.0' }
        });
        const match = (Array.isArray(data) ? data : []).find(item => item?.plainLyrics && !item?.instrumental);
        if (match) {
            return {
                title: match.trackName || match.name || song,
                artist: match.artistName || 'Unknown Artist',
                lyrics: match.plainLyrics,
                image: null,
                url: `https://lrclib.net/track/${match.id}`
            };
        }
    } catch (error) {
        console.log('LRCLIB lyrics provider failed, trying secondary provider');
    }

    const { data } = await axios.get(API_BASE, {
        params: { apikey: 'qasim', song },
        timeout: 20000
    });
    const message = data?.result?.message;
    if (!message?.lyrics) throw new Error('Lyrics not found');
    return message;
}

waqar({
    pattern: "lyrics",
    alias: ["lyric", "songlyrics", "getlyrics", "lirik", "songtext"],
    desc: "🌸 Get lyrics of a song with artist and image",
    category: "music",
    react: "🌸",
    filename: __filename
},
async (conn, mek, m, { from, reply, text }) => {
    try {
        // Check if song name provided
        if (!text) {
            const helpMsg = `
╭═══✿══════════════╗
│  ✿ 𝗟𝗬𝗥𝗜𝗖𝗦 𝗙𝗜𝗡𝗗𝗘𝗥 ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 🎵 Find song lyrics
│  ✿ 👤 Artist & Image included
│  ✿ 💖 Fast & Accurate
╰═══✿══════════════╝

🌸 *Usage:*
• \`.lyrics song name\`

🎀 *Example:*
• \`.lyrics Blinding Lights\`
• \`.lyrics Pasoori\`

💖 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 🌸
            `;
            return reply(helpMsg);
        }

        // Send processing reaction
        await conn.sendMessage(from, {
            react: { text: "🎵", key: mek.key }
        });

        // ✅ STEP 1: Fetch lyrics from API
        const { artist, lyrics, image, title, url } = await fetchLyrics(text);

        // ✅ STEP 2: Clean and format lyrics
        const maxChars = 4000;
        const lyricsOutput = lyrics.length > maxChars 
            ? `${lyrics.slice(0, maxChars - 3)}...` 
            : lyrics;

        // ✅ STEP 3: Create GIRL STYLE caption with details
        const caption = `
╭═══✿══════════════╗
│  ✿ ${title || 'Unknown Song'} ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 👩‍🎤 *Artist:* ${artist || 'Unknown Artist'}
│  ✿ 🔗 *URL:* ${url || 'N/A'}
│  ✿ ━━━━━━━━━━━━━━━✿
│  ✿ ${lyricsOutput}
╰═══✿══════════════╝

🌸 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 💖
        `.trim();

        // ✅ STEP 4: Send with image if available
        if (image) {
            await conn.sendMessage(from, {
                image: { url: image },
                caption: caption,
                contextInfo: {
                    mentionedJid: [],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363433260974040@newsletter',
                        newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                        serverMessageId: 143
                    }
                }
            }, { quoted: fakevCard });
        } else {
            // ✅ Send as text if no image
            await conn.sendMessage(from, {
                text: caption,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363433260974040@newsletter',
                        newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                        serverMessageId: 143
                    }
                }
            }, { quoted: fakevCard });
        }

        // Success reaction
        await conn.sendMessage(from, {
            react: { text: "💖", key: mek.key }
        });

    } catch (err) {
        console.error('🌸 Lyrics Command Error:', err);
        
        let errorMsg = `🌸 An error occurred while fetching lyrics for "${text}". 💕`;
        
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            errorMsg = "⏳ API timeout. Please try again in a few seconds. 💕";
        } else if (err.response?.status === 404) {
            errorMsg = `🌸 Song "${text}" not found. Please check the spelling. 💕`;
        }
        
        reply(errorMsg);
        await conn.sendMessage(from, {
            react: { text: "❌", key: mek.key }
        });
    }
});

// ============================================
// 🎀 LYRICS WITH QUICK REPLY
// ============================================
waqar({
    pattern: "lyricsshort",
    alias: ["lshort", "quicklyrics"],
    desc: "🌸 Get quick lyrics (short format)",
    category: "music",
    react: "🎀",
    filename: __filename
},
async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply(`🌸 Please provide a song name!\nExample: .lyricsshort Pasoori 💕`);
        }

        await conn.sendMessage(from, {
            react: { text: "🎵", key: mek.key }
        });

        const { artist, lyrics, image, title } = await fetchLyrics(text);

        const maxChars = 2000;
        const lyricsOutput = lyrics.length > maxChars 
            ? `${lyrics.slice(0, maxChars - 3)}...` 
            : lyrics;

        const caption = `
🌸 *${title || 'Unknown Song'}*
👩‍🎤 ${artist || 'Unknown Artist'}

📝 ${lyricsOutput}

💖 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
        `.trim();

        if (image) {
            await conn.sendMessage(from, {
                image: { url: image },
                caption: caption
            }, { quoted: fakevCard });
        } else {
            await conn.sendMessage(from, {
                text: caption
            }, { quoted: fakevCard });
        }

        await conn.sendMessage(from, {
            react: { text: "💖", key: mek.key }
        });

    } catch (err) {
        console.error('🌸 Quick Lyrics Error:', err);
        reply(`🌸 Error: ${err.message || 'Unknown'} 💕`);
    }
});

// ============================================
// 👑 SAVE LYRICS AS DOCUMENT
// ============================================
waqar({
    pattern: "lyricsdoc",
    alias: ["lyrdoc", "savelyrics"],
    desc: "🌸 Save lyrics as text file",
    category: "music",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply(`🌸 Please provide a song name!\nExample: .lyricsdoc Pasoori 💕`);
        }

        await conn.sendMessage(from, {
            react: { text: "📄", key: mek.key }
        });

        const { artist, lyrics, title } = await fetchLyrics(text);

        const docContent = `
🌸 LYRICS - ${title || 'Unknown Song'}
👩‍🎤 Artist: ${artist || 'Unknown Artist'}
📅 Date: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━

${lyrics}

━━━━━━━━━━━━━━━━━━━━━━━━━━

💖 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
👑 Developer: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
        `.trim();

        const caption = `
╭═══✿══════════════╗
│  ✿ 𝗟𝗬𝗥𝗜𝗖𝗦 𝗦𝗔𝗩𝗘𝗗 ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 🎵 ${title || 'Unknown Song'}
│  ✿ 👩‍🎤 ${artist || 'Unknown Artist'}
│  ✿ 📄 Saved as document
│  ✿ 👑 By 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
╰═══✿══════════════╝

🌸 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 💖
        `;

        await conn.sendMessage(from, {
            document: Buffer.from(docContent, 'utf-8'),
            mimetype: 'text/plain',
            fileName: `Lyrics_${title || 'song'}_${Date.now()}.txt`,
            caption: caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363433260974040@newsletter',
                    newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                    serverMessageId: 143
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, {
            react: { text: "💖", key: mek.key }
        });

    } catch (err) {
        console.error('🌸 Lyrics Doc Error:', err);
        reply(`🌸 Error: ${err.message || 'Unknown'} 💕`);
    }
});
