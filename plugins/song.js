const axios = require('axios');
const yts = require('yt-search');
const { waqar } = require('../waqar');
const { fakevCard } = require('../lib/fakevCard');

// API Base URL
const BASE = 'https://apis.davidcyriltech.my.id';

waqar({
    pattern: "audio",
    alias: ["mp3", "song", "gana", "play", "ytmp3", "ytaudio", "playaudio", "music", "melody"],
    desc: "🌸 Download YouTube Audio as MP3",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, reply, text, pushname }) => {
    try {
        if (!text) {
            return reply("🌸 Example:\n.audio pasoori\n.audio https://youtu.be/xxx");
        }

        let videoUrl, title, artist, duration, thumbnail, views;

        // Check if input is a YouTube URL
        const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(text);

        if (isUrl) {
            videoUrl = text;
            
            try {
                const infoApi = `${BASE}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
                const { data } = await axios.get(infoApi, { timeout: 15000 });
                
                title = data?.result?.metadata?.title || '🎵 Audio';
                artist = data?.result?.metadata?.channel || '🌸 Unknown Artist';
                duration = data?.result?.metadata?.duration || '';
                thumbnail = data?.result?.metadata?.thumbnail || 'https://i.ytimg.com/vi/default/hqdefault.jpg';
                views = data?.result?.metadata?.views || '';
            } catch (err) {
                const search = await yts(text);
                if (search?.videos?.length) {
                    const vid = search.videos[0];
                    title = vid.title;
                    artist = vid.author?.name || '🌸 Unknown Artist';
                    duration = vid.timestamp || '';
                    thumbnail = vid.thumbnail;
                    views = vid.views || '';
                }
            }
        } else {
            const search = await yts(text);
            if (!search.videos.length) {
                return reply("🌸 No audio found. Please try another song! 💕");
            }

            const vid = search.videos[0];
            videoUrl = vid.url;
            title = vid.title;
            artist = vid.author?.name || '🌸 Unknown Artist';
            duration = vid.timestamp || '';
            thumbnail = vid.thumbnail;
            views = vid.views || '';
        }

        // ✨ STEP 1: Send ONLY Thumbnail with Details (NO extra message)
        const caption = `
╭────────────────────◇
│ 💕⃝🕊️𝐀𝐍𝐍𝐔 𝐃𝐎𝐍💕⃝🕊️
│  ✿━━━━━━━━━━━━━━━✿
│ ♡⪼ 🎵 ${title.slice(0, 30)}${title.length > 30 ? '...' : ''}
│ ♡⪼ 👩‍🎤 ${artist}
│ ♡⪼ ⏱️ ${duration || 'Unknown'}
│ ♡⪼ 👁️ ${views || 'N/A'} views
│ ♡⪼ 📥 Processing...
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
        `;

        // Send ONLY the thumbnail with caption - NO buttons, NO extra messages
        await conn.sendMessage(from, {
            image: { url: thumbnail || 'https://files.catbox.moe/2hpi1r.jpg' },
            caption: caption
        }, { quoted: fakevCard });

        // ✅ STEP 2: Download Audio via API
        let downloadUrl;
        try {
            const apiUrl = `${BASE}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const { data } = await axios.get(apiUrl, { timeout: 60000 });
            downloadUrl = data?.result?.download_url ||
                data?.result?.downloadUrl || data?.result?.url || data?.url ||
                data?.link || data?.result?.download?.url;
        } catch (primaryError) {
            console.log('Primary MP3 API failed, trying BJ-Dev fallback');
        }

        if (!downloadUrl && process.env.BJ_DEV_API_KEY) {
            const { data } = await axios.get('https://apis-bj-dev.vercel.app/downloaders/ytmp3', {
                params: { apikey: process.env.BJ_DEV_API_KEY, query: videoUrl, limit: '1' },
                headers: { 'x-apikey': process.env.BJ_DEV_API_KEY },
                timeout: 60000
            });
            const findUrl = value => {
                if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
                if (value && typeof value === 'object') {
                    for (const item of Object.values(value)) {
                        const found = findUrl(item);
                        if (found) return found;
                    }
                }
                return null;
            };
            downloadUrl = findUrl(data?.result || data?.data || data);
        }

        if (!downloadUrl) {
            throw new Error('🌸 Could not retrieve download link. Please try again! 💕');
        }

        // ✅ STEP 3: Send ONLY Audio (NO caption, NO extra message)
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: fakevCard });

        // ❌ NO reply(), NO sendButtons(), NO extra messages!

    } catch (err) {
        console.error('🌸 Audio Error:', err);
        
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            return reply("⏳ API timeout. Please try again later. 💕");
        }

        // Only send error if something goes wrong
        reply(`🌸 Audio download failed: ${err.message || 'Unknown error'} 💕`);
    }
});
