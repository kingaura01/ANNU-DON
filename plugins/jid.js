// ============================================
// 🌸 JID - 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 👑 Developer: 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍
// 💖 Boys Power Mode: ON
// ============================================

const { waqar } = require('../waqar');

waqar({
    pattern: "jid",
    alias: ["id", "chatid", "gjid"],
    desc: "🌸 Get full JID of current chat (𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 writes Only)",
    category: "owner",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, isCreator, reply, sender }) => {
    try {
        if (!isOwner && !isCreator) {
            return reply(`🌸 Only my 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 can use this! 🦁💖`);
        }

        if (isGroup) {
            return reply(`👥 *Group JID:*\n\`\`\`${from}\`\`\``);
        } else {
            return reply(`👤 *User JID:*\n\`\`\`${sender}\`\`\``);
        }

    } catch (e) {
        console.error("🌸 JID Error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});

console.log('𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - JID plugin loaded! 💖');
