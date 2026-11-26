// ============================================
// 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - TAP TO SELECT MENU
// 👑 Single Select + Image + Text
// 💖 Boys Power Mode: ON
// ============================================

const { waqar, commands } = require('../waqar');
const moment = require('moment-timezone');
const config = require('../config');
const axios = require('axios');
const { fakevCard } = require('../lib/fakevCard');
const { runtime } = require('../lib/functions');

// ============================================
// 📌 VIDEO & AUDIO URLS
// ============================================
const VIDEO_URLS = [
    'https://files.catbox.moe/r7sxh0.mp4'
];

const AUDIO_URLS = [
    'https://files.catbox.moe/p314az.mp3',
    'https://files.catbox.moe/mx2x8j.mp3',
    'https://files.catbox.moe/vu1pse.mp3',
    'https://files.catbox.moe/p316az.mp3',
    'https://files.catbox.moe/5v6e10.mp3'
];

// ============================================
// 📌 CATEGORY IMAGES
// ============================================
const CATEGORY_IMAGES = {
    menu_settings: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_group: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_islamic: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_text: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_download: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_utility: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_owner: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_extra: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_ai: 'https://files.catbox.moe/2hpi1r.jpg',
    menu_stalk: 'https://files.catbox.moe/2hpi1r.jpg'
};

// ============================================
// 📌 HELPERS
// ============================================
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function getGreeting() {
    const time = moment().tz('Asia/Karachi').format('HH:mm:ss');
    if (time < '05:00:00') return 'ɢᴏᴏᴅ ɴɪɢʜᴛ 🌌';
    if (time < '12:00:00') return 'ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ 🌄';
    if (time < '15:00:00') return 'ɢᴏᴏᴅ ᴀғᴛᴇʀɴᴏᴏɴ 🌅';
    if (time < '18:00:00') return 'ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ 🌃';
    if (time < '20:00:00') return 'ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ 🌃';
    return 'ɢᴏᴏᴅ ɴɪɢʜᴛ 🌌';
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeCommandName(value) {
    return String(value || '')
        .trim()
        .replace(/^\.+/, '')
        .split(/\s+/)[0]
        .replace(/\?+$/, '')
        .toLowerCase();
}

function buildCommandSections(commandRegistry, prefix) {
    const groupedCommands = new Map();
    const seenNames = new Set();
    const categoryOrder = [
        'DOWNLOAD', 'AI', 'MUSIC', 'AUDIO', 'MEDIA', 'TEXT', 'FUN', 'TOOLS',
        'UTILITY', 'GROUP', 'SECURITY', 'SETTINGS', 'OWNER', 'CHANNEL',
        'INFO', 'GENERAL', 'PDF', 'PRIVACY', 'MAIN', 'MENU'
    ];
    const categoryLabels = { DOWNLOAD: 'DOWNLOADS' };

    for (const command of commandRegistry) {
        if (!command || command.dontAddCommandList || !command.pattern) continue;
        const category = String(command.category || 'utility').trim().toUpperCase();
        for (const value of [command.pattern, ...(Array.isArray(command.alias) ? command.alias : [])]) {
            const name = normalizeCommandName(value);
            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            if (!groupedCommands.has(category)) groupedCommands.set(category, []);
            groupedCommands.get(category).push(name);
        }
    }

    const commandSections = [...groupedCommands.entries()]
        .sort(([a], [b]) => {
            const ai = categoryOrder.indexOf(a);
            const bi = categoryOrder.indexOf(b);
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
        })
        .map(([category, names]) => {
            const label = categoryLabels[category] || category;
            const rows = [...names].sort((a, b) => a.localeCompare(b)).map(name => `│  │● ${prefix}${name}`);
            return [
                `╭──⟦ *${label}-CMDS* ⟧`,
                '│',
                '│  ┌',
                ...rows,
                '│  └',
                '╰──'
            ].join('\n');
        })
        .join('\n\n');

    return { commandSections, visibleCommandCount: seenNames.size };
}

// ============================================
// 🎬 MAIN MENU (Random Video + Audio)
// ============================================
waqar({
    pattern: "menu",
    alias: ["help", "cmds", "commands", "allmenu2"],
    desc: "🌸 Tap to select menu with 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 video",
    category: "main",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        // ── Reactions ──────────────────────────────────────────
        const reactions = ['⏳', '🔄', '⚙️', '✅'];
        for (const emoji of reactions) {
            await conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // ── Stats ──────────────────────────────────────────────
        const totalCommands = commands.length;
        const uptime = runtime(process.uptime());
        const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const botName = config.BOT_NAME || "𝐀𝐍𝐍𝐔 𝐃𝐎𝐍";
        const ownerName = config.OWNER_NAME || '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍';
        const prefix = config.PREFIX || ".";
        const pushName = pushname || 'User';
        const pakTime = moment().tz('Asia/Karachi').format('hh:mm:ss A');
        const pakDate = moment().tz('Asia/Karachi').format('DD/MM/YYYY');
        const greeting = getGreeting();

        // ── Send the owner's selected menu video ─────────────
        const randomVideo = getRandomItem(VIDEO_URLS);

        // ── Build a complete categorized command-and-alias list ──
        const { commandSections, visibleCommandCount } = buildCommandSections(commands, prefix);
        const pairingUrl = config.PAIRING_URL || config.APP_URL || 'https://annu-don-production.up.railway.app/';
        const headerText = `
╭━━━━❲〘 *𝐀𝐍𝐍𝐔 𝐃𝐎𝐍* 〙❳━━━
> ╭━━━❪ 𝐌𝐄𝐍𝐔 ❫━━━─
> ┃ *Prefix:* [ ${prefix} ]
> ┃ *Mode:* ${(config.MODE || 'public').toUpperCase()}
> ┃ *Time:* ${pakTime}
> ┃ *Date:* ${pakDate}
> ┃ *Memory:* ${memory} MB
> ┃ *Uptime:* ${uptime}
> ┃ *Command names:* ${visibleCommandCount} (commands + aliases)
> ┃ *Pairing:* ${pairingUrl || 'Set APP_URL in Railway Variables'}
> ┃ *Channel:* ${config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbEHpir6mYPSxtiCRs2q'}
> ╰━
╰━━━━━━━❮ ◈ ❯━━━━━━

${commandSections}

> _Powered by 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍_
> _All registered command names and aliases are listed above._
        `.trim();

        // ── Context Info ───────────────────────────────────────
        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363433260974040@newsletter',
                newsletterName: '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍',
                serverMessageId: 143
            }
        };

        // ── STEP 1: Send Random Video ─────────────────────────
        try {
            const headCheck = await axios.head(randomVideo).catch(() => null);
            if (headCheck && headCheck.status === 200) {
                await conn.sendMessage(from, {
                    video: { url: randomVideo },
                    mimetype: 'video/mp4',
                    ptv: true,
                    caption: `🌸 *${botName}* 💖\n👑 Welcome ${pushName || 'King'}!`,
                    gifPlayback: false,
                    contextInfo: contextInfo
                }, { quoted: fakevCard });
            }
        } catch (videoError) {
            console.log('🌸 Video send skipped:', videoError.message);
        }

        // ── STEP 2: Send the menu image first, then the command list ──
        const imageUrl = config.MENU_IMAGE_URL || 'https://files.catbox.moe/2hpi1r.jpg';

        try {
            await conn.sendMessage(from, {
                image: { url: imageUrl },
                caption: `🌸 *${botName}*\n\n👋 Welcome ${pushName || 'User'}!\n📚 Tap the menu below to browse commands.`,
                contextInfo
            }, { quoted: fakevCard });
        } catch (imageError) {
            console.log('🌸 Menu image send skipped:', imageError.message);
        }

        // ── Categories ─────────────────────────────────────────
        const categories = [
            { id: 'menu_settings', title: '⚙️ ʙᴏᴛ sᴇᴛᴛɪɴɢs' },
            { id: 'menu_group', title: '🛡 ɢʀᴏᴜᴘ ᴛᴏᴏʟs' },
            { id: 'menu_islamic', title: '☪️ ɪsʟᴀᴍɪᴄ' },
            { id: 'menu_text', title: '🎨 ᴛᴇxᴛ ᴇғғᴇᴄᴛs' },
            { id: 'menu_download', title: '📥 ᴅᴏᴡɴʟᴏᴀᴅᴇʀ' },
            { id: 'menu_utility', title: '🛠 ᴜᴛɪʟɪᴛʏ' },
            { id: 'menu_owner', title: '👑 ᴏᴡɴᴇʀ' },
            { id: 'menu_extra', title: '📌 ᴇxᴛʀᴀ' },
            { id: 'menu_ai', title: '🤖 ᴀɪ' },
            { id: 'menu_pdf', title: '📚 PDF COURSES' },
            { id: 'menu_stalk', title: '👀 sᴛᴀʟᴋ' }
        ];

        // ── Send the complete command list directly ────────────
        // Do not depend on interactive-message support for the main menu:
        // some WhatsApp clients show only the preceding video when that
        // optional payload is rejected. The full VIP list must always arrive.
        await conn.sendMessage(from, {
            text: headerText,
            contextInfo: contextInfo
        }, { quoted: mek });

        // Interactive buttons were intentionally removed from this command.
        // WhatsApp rejects the old mixed payload when its list rows/buttons
        // exceed client limits. Category menus remain available as direct
        // commands such as .menu_ai, .menu_group and .menu_settings.

        // ── Reaction ───────────────────────────────────────────
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🌸 Menu Error:', error);
        
        // ── Fallback: Simple menu ──────────────────────────────
        try {
            const fallbackMenu = `
╭────────────────────◇
│ 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 🤖 Bot: ${config.BOT_NAME || '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍'}
│  ✿ 👑 Owner: ${config.OWNER_NAME || '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍'}
│  ✿ 📊 Commands: ${commands.length}
│  ✿ ⏱️ Uptime: ${runtime(process.uptime())}
│  ✿ 📌 Prefix: ${config.PREFIX || '.'}
╰────────────────────○

> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;
            await reply(fallbackMenu);
        } catch (fallbackError) {
            reply(`🌸 Error loading menu: ${error.message} 💕`);
        }
    }
});

// ============================================
// 📌 CATEGORY MENU COMMANDS (With Image)
// ============================================

// ── Settings Menu ────────────────────────────
waqar({
    pattern: "menu_settings",
    alias: ["settings"],
    desc: "🌸 Bot settings commands",
    category: "menu",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ ⚙️ ʙᴏᴛ sᴇᴛᴛɪɴɢs ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .public / .private
│  ✿ .antidelete on/off
│  ✿ .status on/off
│  ✿ .anticall on/off
│  ✿ .autoreacts on/off
│  ✿ .welcome on/off
│  ✿ .alive
│  ✿ .ping
│  ✿ .setprefix [char]
│  ✿ .setmenupic [url/reply]
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_settings },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Group Menu ───────────────────────────────
waqar({
    pattern: "menu_group",
    alias: ["groupmenu"],
    desc: "🌸 Group tools commands",
    category: "menu",
    react: "🛡",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 🛡 ɢʀᴏᴜᴘ ᴛᴏᴏʟs ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .kick (reply to user)
│  ✿ .leave (bot leaves group)
│  ✿ .addmember [number]
│  ✿ .add [number]
│  ✿ .mute / .unmute
│  ✿ .promote / .demote
│  ✿ .tagall [note]
│  ✿ .admintag [note]
│  ✿ .tag [text] (or reply)
│  ✿ .hidetag [text]
│  ✿ .link
│  ✿ .revoke
│  ✿ .setgname [name]
│  ✿ .setgdesc [text]
│  ✿ .groupinfo
│  ✿ .antilink on/off
│  ✿ .antitag on/kick/off
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_group },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Islamic Menu ─────────────────────────────
waqar({
    pattern: "menu_islamic",
    alias: ["islamic"],
    desc: "🌸 Islamic commands",
    category: "menu",
    react: "☪️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ ☪️ ɪsʟᴀᴍɪᴄ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .asmaulhusna [1-20]
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_islamic },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Text Effects Menu ────────────────────────
waqar({
    pattern: "menu_text",
    alias: ["texteffects"],
    desc: "🌸 Text effects commands",
    category: "menu",
    react: "🎨",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 🎨 ᴛᴇxᴛ ᴇғғᴇᴄᴛs ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .matrix [text]
│  ✿ .1917 [text]
│  ✿ .fancy [text]
│  ✿ .tx [1-4] [text] - Unicode font styles
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_text },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Download Menu ─────────────────────────────
waqar({
    pattern: "menu_download",
    alias: ["dlmenu", "download"],
    desc: "🌸 Download & media commands",
    category: "menu",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 📥 ᴅᴏᴡɴʟᴏᴀᴅᴇʀ & ᴍᴇᴅɪᴀ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .song [name]
│  ✿ .play [name/url]
│  ✿ .ytdl [name/url]
│  ✿ .video [name/url]
│  ✿ .splitstatus (reply to video)
│  ✿ .ytmp3 [url]
│  ✿ .ytmp4 [url]
│  ✿ .dp (get profile pic)
│  ✿ .getpp [number]
│  ✿ .vv (reply to once view)
│  ✿ .save (reply to media)
│  ✿ .tiktok [url]
│  ✿ .ttdl [url]
│  ✿ .mediafire [url]
│  ✿ .instagram [url]
│  ✿ .igdl [url]
│  ✿ .apk [app name]
│  ✿ .weather [city]
│  ✿ .sticker (reply to image)
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_download },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Utility Menu ─────────────────────────────
waqar({
    pattern: "menu_utility",
    alias: ["utility"],
    desc: "🌸 Utility commands",
    category: "menu",
    react: "🛠",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 🛠 ᴜᴛɪʟɪᴛʏ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .time
│  ✿ .repo
│  ✿ .owner
│  ✿ .ping
│  ✿ .alive
│  ✿ .runtime
│  ✿ .calc [expression]
│  ✿ .enc [javascript code]
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_utility },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Owner Menu ───────────────────────────────
waqar({
    pattern: "menu_owner",
    alias: ["ownermenu"],
    desc: "🌸 Owner commands",
    category: "menu",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 👑 ᴏᴡɴᴇʀ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .shutdown (restart)
│  ✿ .block / .unblock
│  ✿ .join / .leave
│  ✿ .forward <jid1,jid2,...> (reply)
│  ✿ .broadcast <message>
│  ✿ .setppbot (reply)
│  ✿ .anticall on/off
│  ✿ .autotyping on/off
│  ✿ .alwaysonline on/off
│  ✿ .autoread on/off
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_owner },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Extra Menu ───────────────────────────────
waqar({
    pattern: "menu_extra",
    alias: ["extra"],
    desc: "🌸 Extra commands",
    category: "menu",
    react: "📌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 📌 ᴇxᴛʀᴀ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .pair [number]
│  ✿ .botstatus
│  ✿ .menu
│  ✿ .left (leave group)
│  ✿ .alive2
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_extra },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── AI Menu ──────────────────────────────────
waqar({
    pattern: "menu_ai",
    alias: ["aimenu"],
    desc: "🌸 AI commands",
    category: "menu",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 🤖 ᴀɪ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .ai [question]
│  ✿ .openai [question]
│  ✿ .deepseek [question]
│  ✿ .dalle [prompt]
│  ✿ .remini (reply to image)
│  ✿ .aiart [prompt]
│  ✿ .text2img [prompt]
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_ai },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

// ── Stalk Menu ───────────────────────────────
waqar({
    pattern: "menu_stalk",
    alias: ["stalk"],
    desc: "🌸 Stalk commands",
    category: "menu",
    react: "👀",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const text = `
╭────────────────────◇
│  ✿ 👀 sᴛᴀʟᴋ ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ .tiktokstalk [username]
│  ✿ .instastalk [username]
│  ✿ .githubstalk [username]
│  ✿ .nowa [number]
│  ✿ .truecaller [number]
╰────────────────────○
> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
    `.trim();
    
    await conn.sendMessage(from, {
        image: { url: CATEGORY_IMAGES.menu_stalk },
        caption: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true
        }
    }, { quoted: mek });
});

console.log('𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - Tap to Select Menu with Image + Text Loaded! 💖');
console.log('📌 Video URLs: ${VIDEO_URLS.length} | Audio URLs: ${AUDIO_URLS.length}');
console.log('📌 Category images: ${Object.keys(CATEGORY_IMAGES).length}');

module.exports = { buildCommandSections, normalizeCommandName };
