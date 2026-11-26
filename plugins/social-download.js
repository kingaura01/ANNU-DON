// ============================================
// 🌸 DOWNLOAD COMMANDS - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 👑 Developer: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 💖 Boys Power Mode: ON
// ============================================

const { waqar } = require('../waqar');
const axios = require('axios');
const { fakevCard } = require('../lib/fakevCard');
const config = require('../config');

// ============================================
// 📌 API
// ============================================
const API_URL = 'https://arslan-apis.zone.id/download/mfire';

// ============================================
// 📘 FACEBOOK VIDEO DOWNLOAD
// ============================================
waqar({
    pattern: 'fb',
    alias: ['facebook', 'fbdl'],
    desc: 'Download a public Facebook video',
    category: 'download',
    react: '🌸',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    const url = q || m.quoted?.text || '';
    if (!/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\//i.test(url)) {
        return reply('🌸 Please provide a valid public Facebook video link.\nExample: .fb https://facebook.com/...');
    }

    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const { data } = await axios.get(
            `https://arslan-apis-v2.vercel.app/download/fbdown?url=${encodeURIComponent(url)}`,
            { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const result = data?.result;
        const download = result?.download || {};
        const videoUrl = download.hd || download.sd || download.p480;
        if (data?.status !== true || result?.status !== true || !videoUrl) {
            return reply('🌸 Facebook video fetch nahi ho saka. Link public ho aur dobara try karein.');
        }

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `🌸 *Facebook Video*\n\n🎬 ${result.metadata?.title || 'Video'}\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`
        }, { quoted: fakevCard });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (error) {
        console.error('[Facebook download] Error:', error.response?.data || error.message);
        return reply('🌸 Facebook downloader temporarily unavailable. Please try again later.');
    }
});

function boyBox(title, rows) {
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
// ============================================
// 📥 IGDL - MAIN DOWNLOADER
// ============================================
waqar({
    pattern: "igdl",
    alias: ["instagram", "insta", "ig"],
    desc: "🌸 Download Instagram videos/reels",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !url.includes("instagram.com")) {
            return reply("🌸 Please provide/reply to an Instagram link 💕");
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data.data?.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply("🌸 Failed to fetch media. Invalid link or private content. 💕");
        }

        for (const item of response.data.data) {
            await conn.sendMessage(from, {
                [item.type === 'video' ? 'video' : 'image']: { url: item.url },
                caption: `╭═══✿══════════════╗\n| 🌸 *Instagram Downloader*\n| ✿━━━━━━━━━━━━━━━✿\n| 👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍\n╰═══✿══════════════╝`
            }, { quoted: fakevCard });
        }

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 IGDL Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply("🌸 Download failed. Try again later. 💕");
    }
});

// ============================================
// 📥 IGDL4 - ALTERNATIVE API
// ============================================
waqar({
    pattern: "igdl4",
    alias: ["instagram4", "insta4", "ig4", "igvideo4"],
    desc: "🌸 Download Instagram videos (Alternative API)",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const igUrl = args[0] || m.quoted?.text;
        if (!igUrl || !igUrl.includes("instagram.com")) {
            return reply('🌸 Please provide a valid Instagram URL.\nExample: .igdl4 https://instagram.com/... 💕');
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://bk9.fun/download/instagram?url=${encodeURIComponent(igUrl)}`;
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.BK9?.[0]?.url) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('🌸 Unable to fetch the video. Try .igdl for primary download. 💕');
        }

        const videoUrl = response.data.BK9[0].url;
        const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        if (!videoResponse.data) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('🌸 Failed to download the video. Please try again later. 💕');
        }

        const videoBuffer = Buffer.from(videoResponse.data, 'binary');

        await conn.sendMessage(from, {
            video: videoBuffer,
            caption: `🌸 *Instagram Downloader*\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 IGDL4 Error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('🌸 API failed. Try .igdl for primary download. 💕');
    }
});

// ============================================
// 📥 IGDL2 - API V5
// ============================================
waqar({
    pattern: "igdl2",
    alias: ["instagram2", "ig2", "instadl2"],
    desc: "🌸 Download Instagram videos (API v5)",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const igUrl = args[0] || m.quoted?.text;
        if (!igUrl || !igUrl.includes("instagram.com")) {
            return reply('🌸 Please provide a valid Instagram URL.\n\nExample: .igdl2 https://instagram.com/reel/... 💕');
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://jawad-tech.vercel.app/downloader?url=${encodeURIComponent(igUrl)}`;
        const response = await axios.get(apiUrl);

        const data = response.data;

        if (!data.status || !data.result || !Array.isArray(data.result)) {
            return reply('🌸 Unable to fetch the video. Please check the URL and try again. 💕');
        }

        const videoUrl = data.result[0];
        if (!videoUrl) return reply("🌸 No video found in the response. 💕");

        const metadata = data.metadata || {};
        const author = metadata.author || "Unknown";
        const caption = metadata.caption ? metadata.caption.slice(0, 300) + "..." : "No caption provided.";
        const likes = metadata.like || 0;
        const comments = metadata.comment || 0;

        await reply('🌸 Uploading your video... Please wait 💕');

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: `🌸 *Instagram Reel Downloader*\n👤 *Author:* ${author}\n💬 *Caption:* ${caption}\n❤️ *Likes:* ${likes} | 💭 *Comments:* ${comments}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 IGDL2 Error:', error);
        reply('🌸 Failed to download the Instagram video. Please try again later. 💕');
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});

// ============================================
// 📥 IG3 - SIMPLE DOWNLOADER
// ============================================
waqar({
    pattern: "ig3",
    alias: ["insta3", "instagram3"],
    desc: "🌸 Download Instagram video (Simple)",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🌸 Please provide an Instagram video link. 💕");
        if (!q.includes("instagram.com")) return reply("🌸 Invalid Instagram link. 💕");

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        reply("🌸 Downloading video, please wait... 💕");

        const apiUrl = `https://rest-lily.vercel.app/api/downloader/igdl?url=${q}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.data || !data.data[0]) return reply("🌸 Failed to fetch Instagram video. 💕");

        const { url } = data.data[0];

        await conn.sendMessage(from, {
            video: { url: url },
            caption: `🌸 *Instagram Downloader*\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (e) {
        console.error("🌸 IG3 Error:", e);
        reply(`🌸 Error: ${e.message} 💕`);
    }
});
// ============================================
// 🎵 TIKTOK DOWNLOAD - CONFIRMED WORKING API
// ============================================
waqar({
    pattern: "tiktok",
    alias: ["ttdl", "tiktokdl", "tt"],
    desc: "🌸 Download TikTok videos",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const tiktokUrl = args[0] || m.quoted?.text;
        if (!tiktokUrl || !/^(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\//i.test(tiktokUrl)) {
            return reply('🌸 Please provide a valid TikTok video URL.\nExample: .tiktok https://www.tiktok.com/@user/video/123 💕');
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://adeel-xtech-apis.vercel.app/api/ttdl?url=${encodeURIComponent(tiktokUrl)}`;
        const { data } = await axios.get(apiUrl, {
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
        });
        const videoUrl = data?.status === true && data?.result?.video;

        if (!videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('🌸 TikTok video link nahi mila. Link public/valid hona chahiye. 💕');
        }

        const title = data.result.title || 'TikTok Video';
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `🌸 *TikTok Downloader*\n\n🎬 *Title:* ${title}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });
    } catch (error) {
        console.error('🌸 TikTok Error:', error.response?.data || error.message || error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('🌸 TikTok downloader temporarily unavailable. Please try again later. 💕');
    }
});
// ============================================
// 📦 MEDIAFIRE2 - MAIN DOWNLOADER
// ============================================
waqar({
    pattern: "mediafire2",
    alias: ["mfire2", "mfdownload2"],
    desc: "🌸 Download files from MediaFire",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const mediafireUrl = args[0] || m.quoted?.text;
        if (!mediafireUrl || !mediafireUrl.includes("mediafire.com")) {
            return reply('🌸 Please provide a valid MediaFire URL.\nExample: .mediafire2 https://mediafire.com/... 💕');
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://velyn.vercel.app/api/downloader/mediafire?url=${encodeURIComponent(mediafireUrl)}`;
        const response = await axios.get(apiUrl);

        if (!response.data || !response.data.status || !response.data.data) {
            return reply('🌸 Unable to fetch the file. Please check the URL and try again. 💕');
        }

        const { filename, size, mimetype, link } = response.data.data;

        await reply(`🌸 Downloading ${filename} (${size})... Please wait 💕`);

        const fileResponse = await axios.get(link, { responseType: 'arraybuffer' });
        if (!fileResponse.data) {
            return reply('🌸 Failed to download the file. Please try again later. 💕');
        }

        const fileBuffer = Buffer.from(fileResponse.data, 'binary');

        if (mimetype.startsWith('image')) {
            await conn.sendMessage(from, {
                image: fileBuffer,
                caption: `🌸 *File Details*\n\n🔖 *Name*: ${filename}\n📏 *Size*: ${size}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363433260974040@newsletter',
                        newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                        serverMessageId: 143
                    }
                }
            }, { quoted: fakevCard });
        } else if (mimetype.startsWith('video')) {
            await conn.sendMessage(from, {
                video: fileBuffer,
                caption: `🌸 *File Details*\n\n🔖 *Name*: ${filename}\n📏 *Size*: ${size}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 WRITRS & 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
                contextInfo: {
                    mentionedJid: [m.sender],
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
            await conn.sendMessage(from, {
                document: fileBuffer,
                mimetype: mimetype,
                fileName: filename,
                caption: `🌸 *File Details*\n\n🔖 *Name*: ${filename}\n📏 *Size*: ${size}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
                contextInfo: {
                    mentionedJid: [m.sender],
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

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 MediaFire2 Error:', error);
        reply('🌸 Unable to download the file. Please try again later. 💕');
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
// ============================================
// 📥 MEDIAFIRE DOWNLOAD COMMAND
// ============================================
waqar({
    pattern: "mediafire",
    alias: ["mfire", "media"],
    desc: "🌸 Download files from MediaFire",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply('🌸 Please provide a MediaFire URL.\nExample: .mediafire https://www.mediafire.com/... 💕');
        }

        // ── Loading Reaction ──
        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        // ── API Call ──
        const apiUrl = `${API_URL}?url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);

        // ── Check Response ──
        if (!response.data || !response.data.status) {
            return reply('🌸 Unable to fetch the file. Please try again later. 💕');
        }

        const { fileName, fileType, size, date, dl_link } = response.data.result;

        if (!dl_link) {
            return reply('🌸 No download link found. Please try again later. 💕');
        }

        // ── Downloading Message ──
        await reply(`🌸 Downloading ${fileName || 'file'}... 💕`);

        // ── Download File ──
        const fileResponse = await axios.get(dl_link, { responseType: 'arraybuffer' });
        if (!fileResponse.data) {
            return reply('🌸 Failed to download the file. Please try again later. 💕');
        }

        // ── Send to User ──
        await conn.sendMessage(from, {
            document: fileResponse.data,
            mimetype: fileType || 'application/octet-stream',
            fileName: fileName || 'mediafire_file',
            caption: `🌸 *File Details*\n\n📂 *Name*: ${fileName || 'N/A'}\n📦 *Size*: ${size || 'N/A'}\n📅 *Upload Date*: ${date || 'N/A'}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363433260974040@newsletter',
                    newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                         serverMessageId: 143
                }
            }
        }, { quoted: fakevCard });

        // ── Send to Channel/Newsletter ──
        try {
            const channelText = `
╭────────────────────◇
│ 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
│  ✿━━━━━━━━━━━━━━━✿
│ 📥 *MediaFire Download*
│ 📄 *File:* ${fileName || 'N/A'}
│ 📦 *Size:* ${size || 'N/A'}
│ 📅 *Date:* ${date || 'N/A'}
│ 🔗 *Source:* ${q}
╰────────────────────○
> 🦋⃟ 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍🦋⃟‌💙
            `.trim();

            await conn.sendMessage('120363433260974040@newsletter', {
                text: channelText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true
                }
            });

            await conn.sendMessage('120363433260974040@newsletter', {
                document: fileResponse.data,
                mimetype: fileType || 'application/octet-stream',
                fileName: fileName || 'mediafire_file',
                caption: `📥 ${fileName || 'N/A'} | ${size || 'N/A'}`
            });

            console.log('🌸 File sent to channel');
        } catch (channelError) {
            console.error('🌸 Channel send error:', channelError.message);
        }

        // ── Reaction ──
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 MediaFire Error:', error);
        reply('🌸 Unable to download the file. Please try again later. 💕');
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
// ============================================
// 📦 APK DOWNLOAD
// ============================================
waqar({
    pattern: "apk",
    alias: ["modapk", "apkdownload"],
    desc: "🌸 Download APK files",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const appName = args.join(" ");
        if (!appName) {
            return reply('🌸 Please provide an app name.\nExample: .apk whatsapp 💕');
        }

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const apiUrl = `https://api.nexoracle.com/downloader/apk`;
        const params = {
            apikey: 'free_key@maher_apis',
            q: appName,
        };

        const response = await axios.get(apiUrl, { params });

        if (!response.data || response.data.status !== 200 || !response.data.result) {
            return reply('🌸 Unable to find the APK. Please try again later. 💕');
        }

        const { name, lastup, package, size, icon, dllink } = response.data.result;

        await conn.sendMessage(from, {
            image: { url: icon },
            caption: `🌸 Downloading ${name}... Please wait 💕`,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363433260974040@newsletter',
                    newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                    serverMessageId: 143
                }
            }
        }, { quoted: fakevCard });

        const apkResponse = await axios.get(dllink, { responseType: 'arraybuffer' });
        if (!apkResponse.data) {
            return reply('🌸 Failed to download the APK. Please try again later. 💕');
        }

        const apkBuffer = Buffer.from(apkResponse.data, 'binary');

        const message = `🌸 *APK Details*\n\n🔖 *Name*: ${name}\n📅 *Last Update*: ${lastup}\n📦 *Package*: ${package}\n📏 *Size*: ${size}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;

        await conn.sendMessage(from, {
            document: apkBuffer,
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${name}.apk`,
            caption: message,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363433260974040@newsletter',
                    newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                    serverMessageId: 143
                }
            }
        }, { quoted: fakevCard });

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 APK Error:', error);
        reply('🌸 Unable to fetch APK details. Please try again later. 💕');
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
waqar({
    pattern: "pindl",
    alias: ["pinterestdl", "pinterest", "pin", "pins", "pindownload"],
    desc: "🌸 Download media from Pinterest",
    category: "download",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (args.length < 1) {
            return reply('🌸 Please provide the Pinterest URL to download from. 💕');
        }

        const pinterestUrl = args[0];

        await conn.sendMessage(from, { react: { text: '🌸', key: mek.key } });

        const response = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(pinterestUrl)}`);

        if (!response.data.success) {
            return reply('🌸 Failed to fetch data from Pinterest. 💕');
        }

        const media = response.data.result.media;
        const title = response.data.result.title || 'No title available';

        const videoUrl = media.find(item => item.type.includes('720p'))?.download_url || media[0]?.download_url;

        const desc = `🌸 *Pinterest Downloader*\n\n📝 *Title*: ${title}\n📸 *Type*: ${media[0]?.type || 'N/A'}\n\n👑 Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;

        if (videoUrl) {
            await conn.sendMessage(from, { video: { url: videoUrl }, caption: desc }, { quoted: fakevCard });
        } else {
            const imageUrl = media.find(item => item.type === 'Thumbnail')?.download_url;
            if (imageUrl) {
                await conn.sendMessage(from, { image: { url: imageUrl }, caption: desc }, { quoted: fakevCard });
            } else {
                return reply('🌸 No media found to download. 💕');
            }
        }

        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (e) {
        console.error("🌸 Pinterest Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`🌸 Error: ${e.message} 💕`);
    }
});

console.log('𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 Download plugins loaded! 💖');
