// ============================================
// 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 - GHOST MODE
// Hide online presence while still receiving messages.
// ============================================
const config = require('../settings');
const { waqar } = require('../waqar');

function isEnabled(conn) {
    return conn?.__ghostMode === true || config.GHOST_MODE === 'true';
}

async function applyPresence(conn, enabled) {
    conn.__ghostMode = enabled;
    config.GHOST_MODE = enabled ? 'true' : 'false';
    try {
        await conn.sendPresenceUpdate(enabled ? 'unavailable' : 'available');
    } catch (error) {
        console.log(`[GhostMode] Presence update skipped: ${error.message}`);
    }
}

waqar({
    pattern: 'ghostmode',
    alias: ['ghost', 'invisible', 'ghoststatus'],
    desc: 'Hide online presence and keep receiving messages',
    category: 'privacy',
    react: '👻',
    filename: __filename
}, async (conn, mek, m, { reply, text, isOwner, isCreator }) => {
    if (!isOwner && !isCreator) {
        return reply('👻 Sirf 𝐀𝐍𝐍𝐔 𝐃𝐎𝐍 ghost mode change kar sakta hai.');
    }

    const action = String(text || 'status').trim().toLowerCase();
    if (['on', 'enable', 'enabled', 'true'].includes(action)) {
        await applyPresence(conn, true);
        return reply('👻 *GHOST MODE ON*\n\nBot unavailable/offline presence show karega aur messages receive karta rahega.');
    }

    if (['off', 'disable', 'disabled', 'false'].includes(action)) {
        await applyPresence(conn, false);
        return reply('🟢 *GHOST MODE OFF*\n\nBot normal online presence use karega.');
    }

    return reply(`👻 *GHOST MODE STATUS*\n\nStatus: ${isEnabled(conn) ? 'ON — unavailable/offline' : 'OFF — normal presence'}\n\nUse:\n.ghostmode on\n.ghostmode off`);
});

module.exports = { applyPresence, isEnabled };
