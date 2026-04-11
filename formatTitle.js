// formatTitle.js
function formatTitle({ name, service, flags }) {
    const line1 = `🌊 ${name}`;
    const line2 = `📦 ${service}`;
    const line3 = `🌎 ${flags.map(f => " " + f).join("•")}`;
    return `${line1}\n${line2}\n${line3}`;
}

module.exports = formatTitle;
