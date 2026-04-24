// formatTitleS.js
function formatTitle({ name, ep, service, flags }) {
    const line1 = `🍃 ${name}`;
    const line2 = `🪪 ${ep}`;
    const line3 = `📦 ${service}`;
    const line4 = `🌎 ${flags.map(f => " " + f).join(" •")}`;
    return `${line1}\n${line2}\n${line3}\n${line4}`;
}

module.exports = formatTitle;
