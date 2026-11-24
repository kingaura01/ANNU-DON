// ============================================
// 🌸 JID - ANNU DON
// 👑 Developer: ANNU DON
// 💖 Boys Power Mode: ON
// ============================================

const { waqar } = require('../waqar');

waqar({
    pattern: "jid",
    alias: ["id", "chatid", "gjid"],
    desc: "🌸 Get full JID of current chat (ANNU DON writes Only)",
    category: "owner",
    react: "🌸",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isOwner, isCreator, reply, sender }) => {
    try {
        if (!isOwner && !isCreator) {
            return reply(`🌸 Only my ANNU DON can use this! 🦁💖`);
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

console.log('ANNU DON - JID plugin loaded! 💖');
