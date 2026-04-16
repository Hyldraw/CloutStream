// formatTitle.js
function formatTitle({ name, service, flags, by}) {
    const line1 = `🌊 ${name}`;
    const line2 = `📦 ${service}`;
    const line3 = `🌎 ${flags.map(f => " " + f).join("•")}`;
    const line4 = `Enviado por: @${by}`;
    return `${line1}\n${line2}\n${line3}\n${line4}`;
}

module.exports = formatTitle;
