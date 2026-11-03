// mermaid-cli (solo para renderizar los diagramas de docs/) trae Puppeteer.
// No descargamos un Chrome propio: se usa el navegador instalado (ver docs/render-diagrams.mjs).
module.exports = {
  skipDownload: true,
};
