// ============================================
// 🕐 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - RUNTIME WITH BUTTONS
// 👑 Developer: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 🔥 EXACT SAME STYLE AS MENU
// 💖 Interactive Buttons + Single Select
// ============================================

const { waqar, commands } = require('../waqar');
const { sendInteractiveMessage } = require('gifted-btns');
const moment = require('moment-timezone');
const config = require('../config');

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

// ============================================
// 🕐 RUNTIME COMMAND - WITH GIFTED-BTNS
// ============================================
waqar({
    pattern: "runtime",
    alias: ["uptime", "alive", "status", "botinfo", "ping"],
    desc: "🕐 Check bot runtime and status with buttons",
    category: "main",
    react: "🕐",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        // ── Reactions ──────────────────────────────────────────
        const reactions = ['⏳', '🔄', '✅'];
        for (const emoji of reactions) {
            await conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // ── Stats ──────────────────────────────────────────────
        const totalCommands = commands ? commands.length : 0;
        const uptime = formatUptime(process.uptime());
        const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const botName = config.BOT_NAME || "𝐀𝐍𝐍𝐔 𝐃𝐎𝐍";
        const ownerName = config.OWNER_NAME || '𝐀𝐍𝐍𝐔 𝐃𝐎𝐍';
        const prefix = config.PREFIX || ".";
        const pushName = pushname || 'User';
        const pakTime = moment().tz('Asia/Karachi').format('hh:mm:ss A');
        const pakDate = moment().tz('Asia/Karachi').format('DD/MM/YYYY');
        const greeting = getGreeting();

        // ── Build Text ─────────────────────────────────────────
        const text = `
╭────────────────────◇
│ 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
│  ㋡━━━━━━━━━━━━━━━㋡
│ ❦ 👤 User: ${pushName}
│ ❦ 👑 Owner: ${ownerName}
│ ❦ ⏰ Time: ${pakTime}
│ ❦ 📅 Date: ${pakDate}
│ ❦ ⏳ Uptime: ${uptime}
│ ❦ 📊 Commands: ${totalCommands}
│ ❦ 💾 Memory: ${memory} MB
│ ❦ 🔧 Prefix: ${prefix}
│ ❦ 🌟 ${greeting}
╰────────────────────○

💖 *Tap a button below for quick actions*
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

        // ── SEND WITH GIFTED-BTNS ─────────────────────────────
        await sendInteractiveMessage(waqar, from, {
            text: text,
            footer: `💖 ${botName} | ${uptime}`,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '🔖 ᴛᴀᴘ ᴛᴏ ᴏᴘᴇɴ ᴍᴇɴᴜ 💻',
                        sections: [{
                            title: '📌 Qᴜɪᴄᴋ Aᴄᴛɪᴏɴs',
                            highlight_label: '🔍 sᴇʟᴇᴄᴛ',
                            rows: [
                                {
                                    title: '📜 ᴏᴘᴇɴ ᴍᴇɴᴜ',
                                    description: 'View all commands with categories',
                                    id: 'menu'
                                },
                                {
                                    title: '🕐 ʀᴇғʀᴇsʜ sᴛᴀᴛᴜs',
                                    description: 'Update runtime information',
                                    id: 'runtime'
                                },
                                {
                                    title: '👑 ᴏᴡɴᴇʀ ɪɴғᴏ',
                                    description: 'Contact bot owner',
                                    id: 'owner'
                                },
                                {
                                    title: '🚀 ᴘɪɴɢ',
                                    description: 'Check bot latency',
                                    id: 'ping'
                                }
                            ]
                        }]
                    })
                },
                // ── Quick Reply Buttons ──────────────────────────
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🚀 Ping',
                        id: `${prefix}ping`
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '👑 Owner',
                        id: `${prefix}owner`
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📜 Menu',
                        id: `${prefix}menu`
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🕐 Refresh',
                        id: `${prefix}runtime`
                    })
                },
                // ── URL Buttons ──────────────────────────
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🎀 🄲🄷🄰🄽🄽🄴🄻 ✌︎㋡',
                        url: config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbEHpir6mYPSxtiCRs2q'
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '👑 🄾🅆🄽🄴🅁 ✌︎㋡',
                        url: config.OWNER_LINK || 'https://wa.me/923235605702'
                    })
                }
            ]
        });

        // ── LISTENER FOR SINGLE SELECT ─────────────────────────
        const menuHandler = async (update) => {
            const incoming = update.messages?.[0];
            if (!incoming?.message || incoming.key.remoteJid !== from) return;

            const msg = incoming.message;
            let selectedId = null;

            if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
                selectedId = msg.listResponseMessage.singleSelectReply.selectedRowId;
            }

            if (!selectedId) return;

            conn.ev.off("messages.upsert", menuHandler);

            if (selectedId === 'menu') {
                await conn.sendMessage(from, {
                    text: `📜 *Opening Menu...*\n\nType \`${prefix}menu\` to see full menu.`
                }, { quoted: incoming });
            } else if (selectedId === 'runtime') {
                await conn.sendMessage(from, {
                    text: `🕐 *Refreshing...*\n\n⏳ Uptime: ${uptime}\n🕰️ Time: ${pakTime}\n📅 Date: ${pakDate}`
                }, { quoted: incoming });
            } else if (selectedId === 'owner') {
                await conn.sendMessage(from, {
                    text: `👑 *Owner Info*\n\n📱 Number: 923235605702\n💖 Name: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`
                }, { quoted: incoming });
            } else if (selectedId === 'ping') {
                const start = Date.now();
                await conn.sendMessage(from, { text: '🏓 Pinging...' }, { quoted: incoming });
                const latency = Date.now() - start;
                await conn.sendMessage(from, {
                    text: `🏓 *Pong!*\n\n⚡ Latency: ${latency}ms\n⏱️ Uptime: ${uptime}`
                }, { quoted: incoming });
            }
        };

        conn.ev.on("messages.upsert", menuHandler);
        setTimeout(() => conn.ev.off("messages.upsert", menuHandler), 60000);

        // ── Reaction ───────────────────────────────────────────
        await conn.sendMessage(from, { react: { text: '💖', key: mek.key } });

    } catch (error) {
        console.error('🕐 Runtime Error:', error);
        
        // ── Fallback: Simple message ──────────────────────────
        try {
            const uptime = formatUptime(process.uptime());
            const pakTime = moment().tz('Asia/Karachi').format('hh:mm:ss A');
            const botName = config.BOT_NAME || "𝐀𝐍𝐍𝐔 𝐃𝐎𝐍";
            
            const fallbackText = `
╭────────────────────◇
│ 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
│  ㋡━━━━━━━━━━━━━━━㋡
│  ✿ ⏳ Uptime: ${uptime}
│  ✿ 🕰️ Time: ${pakTime}
│  ✿ 📊 Commands: ${commands ? commands.length : 0}
│  ✿ 📌 Prefix: ${config.PREFIX || '.'}
╰────────────────────○

> 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍`;
            await reply(fallbackText);
        } catch (fallbackError) {
            await reply(`🕐 Error loading runtime: ${error.message} 💕`);
        }
    }
});

console.log('🕐 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍- Runtime with Gifted Buttons Loaded! 💖');
