const { waqar } = require('../waqar');

const FONT_STYLES = [
    { id: 1, name: 'Bold', upper: 0x1D400, lower: 0x1D41A },
    { id: 2, name: 'Sans bold', upper: 0x1D5D4, lower: 0x1D5EE },
    { id: 3, name: 'Monospace', upper: 0x1D670, lower: 0x1D68A },
    { id: 4, name: 'Fullwidth', fullwidth: true }
];

function convertText(text, styleId) {
    const style = FONT_STYLES.find((item) => item.id === Number(styleId));
    if (!style) throw new RangeError('Choose a font style from 1 to 4.');

    return Array.from(String(text), (character) => {
        const code = character.codePointAt(0);
        if (style.fullwidth) {
            return code >= 0x21 && code <= 0x7E
                ? String.fromCodePoint(code + 0xFEE0)
                : character;
        }
        if (code >= 0x41 && code <= 0x5A) {
            return String.fromCodePoint(style.upper + code - 0x41);
        }
        if (code >= 0x61 && code <= 0x7A) {
            return String.fromCodePoint(style.lower + code - 0x61);
        }
        return character;
    }).join('');
}

function helpText() {
    return [
        '*TX Text Font Converter*',
        '`.tx list` — show available styles',
        '`.tx info 2` — show style details',
        '`.tx 1 Hello world` — convert text',
        '',
        ...FONT_STYLES.map((style) => `${style.id}. ${style.name}`)
    ].join('\n');
}

waqar({
    pattern: 'tx',
    alias: ['font', 'fonts', 'textstyle'],
    desc: 'Convert text to local Unicode font styles',
    category: 'text',
    react: '🎨',
    filename: __filename
}, async (conn, mek, m, { reply, args = [] }) => {
    const input = args.join(' ').trim();
    if (!input || input.toLowerCase() === 'list') return reply(helpText());

    const infoMatch = input.match(/^info\s+(\d+)$/i);
    if (infoMatch) {
        const style = FONT_STYLES.find((item) => item.id === Number(infoMatch[1]));
        return reply(style ? `Style ${style.id}: ${style.name}` : 'Style number must be from 1 to 4.');
    }

    const match = input.match(/^(\d+)\s+([\s\S]+)$/);
    if (!match) return reply(helpText());
    const [, styleId, text] = match;
    if (text.length > 3000) return reply('Text is too long. Please keep it under 3,000 characters.');

    try {
        const style = FONT_STYLES.find((item) => item.id === Number(styleId));
        if (!style) return reply('Style number must be from 1 to 4.\n\n' + helpText());
        return reply(`*${style.name}*\n${convertText(text, style.id)}`);
    } catch (error) {
        return reply('Could not convert that text. Please try again.');
    }
});

module.exports = { FONT_STYLES, convertText };
