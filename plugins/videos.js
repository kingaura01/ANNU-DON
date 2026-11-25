// ============================================
// 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - VIDEO DOWNLOADER
// Uses yt-dlp with FFmpeg to avoid stale third-party download URLs.
// ============================================

const { waqar } = require('../waqar');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fakevCard } = require('../lib/fakevCard');
const { isYouTubeUrl, downloadYouTubeMedia, cleanupDownloadedMedia } = require('../lib/youtubeDownloader');

ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function girlBox(title, rows) {
    const body = rows.map(([emoji, label, value]) =>
        `│  ✿ ${emoji} ${label}: ${value || ''}`
    ).join('\n');
    return `
╭────────────────────◇
│  ✿ ${title} ✿
│  ✌︎㋡━━━━━━━━━✌︎㋡
${body}
╰────────────────────○

> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
`;
}

async function searchVideo(query) {
    const search = await yts(query);
    if (!search?.videos?.length) throw new Error('No YouTube results found.');
    return search.videos[0];
}

async function getVideoDetails(url) {
    try {
        const parsed = new URL(url);
        const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
        if (videoId) {
            const details = await yts({ videoId });
            if (details?.title) return details;
        }
    } catch (_) {}
    return null;
}

async function trimVideo(inputPath, outputPath, start, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .run();
    });
}

waqar({
    pattern: 'video',
    alias: ['ytv', 'video3', 'video2', 'video4'],
    desc: 'Download YouTube video',
    category: 'download',
    react: '🌸',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    let downloadedPath;
    let trimmedPath;
    try {
        if (!args.length) {
            return reply(`╭═══✿══════════════╗
│  ✿ 🎬 𝗩𝗜𝗗𝗘𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 📝 Usage: .video <name or link>
│  ✿ 🎬 Example: .video jutt gang
│  ✿ 🔗 By Link: .video https://youtu.be/xxxxx
│  ✿ ✂️ Trim: .video <link> trim 00:00:10 00:00:30
╰═══✿══════════════╝

🌸 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 💖`);
        }

        let query = args.join(' ');
        let trimStart = null;
        let trimDuration = null;
        const trimIndex = args.findIndex(arg => arg.toLowerCase() === 'trim');
        if (trimIndex >= 0 && args.length > trimIndex + 2) {
            trimStart = args[trimIndex + 1];
            trimDuration = args[trimIndex + 2];
            query = args.slice(0, trimIndex).join(' ');
        }

        if (!query) return reply('Please provide a YouTube name or link.');
        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        let video;
        let videoUrl;
        if (isYouTubeUrl(query)) {
            videoUrl = query;
            video = await getVideoDetails(videoUrl);
        } else {
            video = await searchVideo(query);
            videoUrl = video.url;
        }

        const videoTitle = video?.title || 'YouTube Video';
        const videoThumb = video?.thumbnail;
        const videoDuration = video?.timestamp || 'Unknown';
        const videoViews = video?.views || 'N/A';

        if (videoThumb) {
            try {
                await conn.sendMessage(from, {
                    image: { url: videoThumb },
                    caption: girlBox('🎬 VIDEO INFO', [
                        ['🎬', 'Title', videoTitle.slice(0, 60) + (videoTitle.length > 60 ? '...' : '')],
                        ['⏱️', 'Duration', videoDuration],
                        ['👁️', 'Views', videoViews],
                        ['⏳', 'Status', 'Processing...']
                    ])
                }, { quoted: fakevCard });
            } catch (imageError) {
                console.warn('Video thumbnail could not be sent:', imageError.message);
            }
        }

        downloadedPath = await downloadYouTubeMedia(videoUrl, 'video');
        let sendPath = downloadedPath;
        let caption;

        if (trimStart && trimDuration) {
            await conn.sendMessage(from, { react: { text: '✂️', key: mek.key } });
            trimmedPath = path.join(tempDir, `trimmed-${crypto.randomUUID()}.mp4`);
            await trimVideo(downloadedPath, trimmedPath, trimStart, trimDuration);
            sendPath = trimmedPath;
            caption = girlBox('✂️ TRIMMED VIDEO', [
                ['🎬', 'Title', videoTitle.slice(0, 60) + (videoTitle.length > 60 ? '...' : '')],
                ['✂️', 'Trim', `${trimStart} to ${trimDuration}`],
                ['🎚️', 'Quality', 'Up to 720p'],
                ['⏱️', 'Duration', videoDuration],
                ['✅', 'Status', 'Done!']
            ]);
        } else {
            caption = girlBox('🎬 VIDEO', [
                ['🎬', 'Title', videoTitle.slice(0, 60) + (videoTitle.length > 60 ? '...' : '')],
                ['🎚️', 'Quality', 'Up to 720p'],
                ['⏱️', 'Duration', videoDuration],
                ['👁️', 'Views', videoViews],
                ['✅', 'Status', 'Downloaded!']
            ]);
        }

        await conn.sendMessage(from, {
            video: fs.readFileSync(sendPath),
            mimetype: 'video/mp4',
            caption
        }, { quoted: fakevCard });
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });
    } catch (err) {
        console.error('Video Error:', err);
        reply(girlBox('❌ VIDEO ERROR', [
            ['❌', 'Error', err.message || 'Download failed'],
            ['🔄', 'Status', 'Please try again']
        ]));
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
    } finally {
        cleanupDownloadedMedia(downloadedPath);
        cleanupDownloadedMedia(trimmedPath);
    }
});

waqar({
    pattern: 'videodoc',
    alias: ['vdoc', 'docvideo'],
    desc: 'Download video as a document file',
    category: 'download',
    react: '🌸',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    let downloadedPath;
    try {
        const query = args.join(' ').trim();
        if (!query) return reply('Provide a YouTube video name or link.\nExample: .vdoc Big Buck Bunny');
        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        let video;
        let videoUrl;
        if (isYouTubeUrl(query)) {
            videoUrl = query;
            video = await getVideoDetails(videoUrl);
        } else {
            video = await searchVideo(query);
            videoUrl = video.url;
        }

        downloadedPath = await downloadYouTubeMedia(videoUrl, 'video');
        const title = video?.title || 'YouTube video';
        const safeFileName = title.replace(/[^\w\s-]/g, '').trim().slice(0, 50) || 'video';
        await conn.sendMessage(from, {
            document: fs.readFileSync(downloadedPath),
            mimetype: 'video/mp4',
            fileName: `${safeFileName}.mp4`,
            caption: girlBox('📄 VIDEO DOCUMENT', [
                ['🎬', 'Title', title.slice(0, 60) + (title.length > 60 ? '...' : '')],
                ['🎚️', 'Quality', 'Up to 720p'],
                ['✅', 'Status', 'Downloaded!']
            ])
        }, { quoted: fakevCard });
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });
    } catch (err) {
        console.error('Video Doc Error:', err);
        reply(girlBox('❌ DOC ERROR', [
            ['❌', 'Error', err.message || 'Download failed'],
            ['🔄', 'Status', 'Please try again']
        ]));
        try { await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }); } catch (_) {}
    } finally {
        cleanupDownloadedMedia(downloadedPath);
    }
});

console.log('𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 video plugin loaded.');
