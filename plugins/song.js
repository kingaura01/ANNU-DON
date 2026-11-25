const fs = require('fs');
const yts = require('yt-search');
const { waqar } = require('../waqar');
const { fakevCard } = require('../lib/fakevCard');
const { isYouTubeUrl, downloadYouTubeMedia, cleanupDownloadedMedia } = require('../lib/youtubeDownloader');

async function getVideoInfo(query) {
    if (isYouTubeUrl(query)) {
        let videoId;
        try {
            const parsed = new URL(query);
            videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
        } catch (_) {}
        if (videoId) {
            try {
                const video = await yts({ videoId });
                if (video?.title) return video;
            } catch (_) {}
        }
        return null;
    }

    const search = await yts(query);
    return search?.videos?.[0] || null;
}

waqar({
    pattern: 'audio',
    alias: ['mp3', 'song', 'gana', 'play', 'ytmp3', 'ytaudio', 'playaudio', 'music', 'melody'],
    desc: 'Download YouTube audio as MP3',
    category: 'download',
    react: '🎵',
    filename: __filename
}, async (conn, mek, m, { from, reply, text }) => {
    let audioPath;
    try {
        const query = (text || '').trim();
        if (!query) {
            return reply('Example:\n.audio pasoori\n.audio https://youtu.be/xxx');
        }

        const isUrl = isYouTubeUrl(query);
        const video = await getVideoInfo(query);
        if (!isUrl && !video) {
            return reply('No audio found. Please try another song.');
        }

        const videoUrl = isUrl ? query : video.url;
        const title = video?.title || 'YouTube Audio';
        const artist = video?.author?.name || 'Unknown Artist';
        const duration = video?.timestamp || '';
        const thumbnail = video?.thumbnail || 'https://files.catbox.moe/2hpi1r.jpg';
        const views = video?.views || '';
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
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;

        try {
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption
            }, { quoted: fakevCard });
        } catch (imageError) {
            console.warn('Audio thumbnail could not be sent:', imageError.message);
        }

        audioPath = await downloadYouTubeMedia(videoUrl, 'audio');
        await conn.sendMessage(from, {
            audio: fs.readFileSync(audioPath),
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: fakevCard });
    } catch (err) {
        console.error('Audio Error:', err);
        if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
            return reply('The audio download timed out. Please try again.');
        }
        reply(`Audio download failed: ${err.message || 'Unknown error'}`);
    } finally {
        cleanupDownloadedMedia(audioPath);
    }
});
