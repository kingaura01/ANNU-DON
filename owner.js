// ============================================
// 👑 OWNER - ANNU DON
// 👑 Developer: ANNU DON
// 💖 Boys Power Mode: ON
// 📌 Owner info + Developer commands
// ============================================

const { waqar } = require('../waqar');
const { sendInteractiveMessage } = require('gifted-btns');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const { runtime, sleep } = require('../lib/functions');

// ============================================
// 📌 DEVELOPER INFO
// ============================================
const DEV_INFO = {
    name: "ANNU DON",
    number: "923235605702",
    channel: "https://whatsapp.com/channel/0029VbEHpir6mYPSxtiCRs2q",
    github: "https://github.com/kingaura01/ANNU-DON",
    telegram: "https://t.me/sp.king9839",
};

// ============================================
// 👑 OWNER / DEVELOPER INFO COMMAND
// ============================================
waqar({
    pattern: "owner",
    alias: ["creator", "dev", "developer", "about"],
    desc: "🌸 Get developer/owner information",
    category: "info",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const uptime = runtime(process.uptime());
        const botName = config.BOT_NAME || "ANNU DON";

        const text = `
╭═══✿══════════════╗
│  ✿ 👑 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥 ✿
│  ✿━━━━━━━━━━━━━━━✿
│  ✿ 🤖 Bot: ${botName}
│  ✿ 👤 Name: ${DEV_INFO.name}
│  ✿ 📱 Contact: ${DEV_INFO.number}
│  ✿ ⏳ Uptime: ${uptime}
╰═══✿══════════════╝

💖 *Contact Developer:*
wa.me/${DEV_INFO.number}

💖 *Join Channel:*
${DEV_INFO.channel}


💖 *GitHub:*
${DEV_INFO.github}

💖 *Website:*
${DEV_INFO.website}

🌸 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 ANNU DON 💖
        `.trim();

        // ── Send with Buttons ──
        await sendInteractiveMessage(conn, from, {
            text: text,
            footer: `💖 ${botName}`,
            interactiveButtons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📱 CONTACT OWNER',
                        url: `https://wa.me/${DEV_INFO.number}`
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🎀 CHANNEL',
                        url: DEV_INFO.channel
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💻 GITHUB',
                        url: DEV_INFO.github
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 WEBSITE',
                        url: DEV_INFO.website
                    })
                }
            ]
        });

    } catch (error) {
        console.error('🌸 Owner Error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ============================================
// 👑 SHUTDOWN / RESTART COMMAND
// ============================================
waqar({
    pattern: "shutdown",
    alias: ["restart", "reboot"],
    desc: "👑 Restart the bot (Owner only)",
    category: "owner",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("🌸 *Access Denied!* 💕\n\nOnly owner can use this command.");

    await reply("🔄 *Restarting bot...* Please wait! 💖");
    await sleep(2000);
    process.exit(0);
});
