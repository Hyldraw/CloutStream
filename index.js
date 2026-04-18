// index.js - Addon Stremio CloutStream (versão organizada)
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const movies = require("./movies");
const series = require("./series");
const animes = require("./animes");

// ==========================================
// MANIFEST
// ==========================================
const manifest = {
    id: "com.cloutstream",
    version: "1.3.6",                    // aumentei um pouco a versão
    name: "CloutStream",
    description: "Filmes e séries com carregamento rápido, sem travamentos e excelente qualidade.",
    logo: "https://i.imgur.com/nHiohqg.jpeg",
    background: "https://i.imgur.com/R591N2s.jpeg",
    resources: ["stream", "catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],

    // === Novo campo solicitado ===
    stremioAddonsConfig: {
        issuer: "https://stremio-addons.net",
        signature: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..UQyF8DlipC7V3s79CYTqyQ.KGWRXppVxxPGV7I-6VARM33Vx-IdhiSo9DM71VQCofFLHv-t093Flp8Wj_eiy-lVWY-BjDS9quFcVW6c9hDObwINNl_avbwOA1i8txctq-6JAQ6bSDI_i3r4j2QqCR_Y.tGe8pTJsphbdjaUPPh3UbQ"
    },

    catalogs: [
        { type: "movie", id: "cloutstream-recentes", name: "Últimos Filmes", extra: [{ name: "search", isRequired: false }] },
        { type: "series", id: "cloutstream-recentes-series", name: "Últimas Séries", extra: [{ name: "search", isRequired: false }] },
        { type: "series", id: "cloutstream-recentes-animes", name: "Últimos Animes", extra: [{ name: "search", isRequired: false }] }
    ]
};

// ==========================================
// CONFIGURAÇÕES
// ==========================================
const TMDB_API_KEY = "684c7dd6657929028f2ad1bd1ef6e3c8";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

// Unifica filmes + séries + animes
const streams = { ...movies, ...series, ...animes };

// ==========================================
// EXTRAÇÃO AUTOMÁTICA DE CATÁLOGO
// ==========================================
function extrairFilmes() {
    const map = new Map();
    for (const [id, list] of Object.entries(movies)) {
        const item = list[0];
        if (!item?.title) continue;
        const match = item.title.match(/🌊\s*(.+?)\s*\((\d{4})\)/);
        if (match) {
            map.set(id, { id, nome: match[1].trim(), ano: parseInt(match[2]) });
        }
    }
    return Array.from(map.values());
}

function extrairSeries() {
    const map = new Map();
    for (const [id, list] of Object.entries(series)) {
        if (!id.includes(":")) continue;
        const serieId = id.split(":")[0];
        const item = list[0];
        if (!item?.title) continue;

        let nome = "Série Desconhecida";
        let ano = 2024;
        const match = item.title.match(/🌊\s*([^(]+?)\s*\((\d{4})\)/i);
        if (match) {
            nome = match[1].trim();
            ano = parseInt(match[2]);
        }
        if (!map.has(serieId)) {
            map.set(serieId, { id: serieId, nome, ano });
        }
    }
    return Array.from(map.values());
}

function extrairAnimes() {
    const map = new Map();
    for (const [id, list] of Object.entries(animes)) {
        if (!id.includes(":")) continue;
        const animeId = id.split(":")[0];
        const item = list[0];
        if (!item?.title) continue;

        let nome = "Anime Desconhecido";
        let ano = 2024;
        const match = item.title.match(/🌊\s*([^(]+?)\s*\((\d{4})\)/i);
        if (match) {
            nome = match[1].trim();
            ano = parseInt(match[2]);
        }
        if (!map.has(animeId)) {
            map.set(animeId, { id: animeId, nome, ano });
        }
    }
    return Array.from(map.values());
}

const catalogoFilmes = extrairFilmes();
const catalogoSeries = extrairSeries();
const catalogoAnimes = extrairAnimes();

console.log(`🎬 Filmes extraídos: ${catalogoFilmes.length}`);
console.log(`📺 Séries extraídas: ${catalogoSeries.length}`);
console.log(`🍙 Animes extraídos: ${catalogoAnimes.length}`);

// ==========================================
// TMDB - Buscar Posters
// ==========================================
async function buscarPosterTMDB(imdbId, tipo = "movie") {
    try {
        const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=pt-BR`;
        const response = await fetch(url);
        const data = await response.json();

        if (tipo === "movie" && data.movie_results?.length > 0) {
            const path = data.movie_results[0].poster_path;
            if (path) return `${TMDB_IMAGE_URL}${path}`;
        }
        if (tipo === "tv" && data.tv_results?.length > 0) {
            const path = data.tv_results[0].poster_path;
            if (path) return `${TMDB_IMAGE_URL}${path}`;
        }

        // Fallback para TV
        if (tipo === "tv") {
            const tvUrl = `https://api.themoviedb.org/3/tv/${imdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
            const tvRes = await fetch(tvUrl);
            const tvData = await tvRes.json();
            if (tvData.poster_path) return `${TMDB_IMAGE_URL}${tvData.poster_path}`;
        }
        return "https://via.placeholder.com/500x750/1a1a2e/ffffff?text=Sem+Poster";
    } catch (err) {
        console.error(`Erro poster ${imdbId}:`, err.message);
        return "https://via.placeholder.com/500x750/1a1a2e/ffffff?text=Erro";
    }
}

let postersCache = null;

async function carregarPosters() {
    if (postersCache) return postersCache;

    console.log("\n🖼️  Carregando posters do TMDB...");

    const filmesComPoster = [];
    for (const filme of catalogoFilmes) {
        const poster = await buscarPosterTMDB(filme.id, "movie");
        filmesComPoster.push({ ...filme, poster });
        console.log(`✅ Filme: ${filme.nome} (${filme.ano})`);
        await new Promise(r => setTimeout(r, 120)); // evitar rate limit
    }

    const seriesComPoster = [];
    for (const serie of catalogoSeries) {
        const poster = await buscarPosterTMDB(serie.id, "tv");
        seriesComPoster.push({ ...serie, poster });
        console.log(`✅ Série: ${serie.nome} (${serie.ano})`);
        await new Promise(r => setTimeout(r, 120));
    }

    const animesComPoster = [];
    for (const anime of catalogoAnimes) {
        const poster = await buscarPosterTMDB(anime.id, "tv");
        animesComPoster.push({ ...anime, poster });
        console.log(`✅ Anime: ${anime.nome} (${anime.ano})`);
        await new Promise(r => setTimeout(r, 120));
    }

    postersCache = { filmes: filmesComPoster, series: seriesComPoster, animes: animesComPoster };
    return postersCache;
}

// ==========================================
// BUILDER + HANDLERS
// ==========================================
const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    const posters = await carregarPosters();

    if (type === "movie" && id === "cloutstream-recentes") {
        return {
            metas: posters.filmes.map(f => ({
                id: f.id,
                type: "movie",
                name: f.nome,
                year: f.ano,
                poster: f.poster,
                posterShape: "regular"
            }))
        };
    }

    if (type === "series" && id === "cloutstream-recentes-series") {
        return {
            metas: posters.series.map(s => ({
                id: s.id,
                type: "series",
                name: s.nome,
                year: s.ano,
                poster: s.poster,
                posterShape: "regular"
            }))
        };
    }

    if (type === "series" && id === "cloutstream-recentes-animes") {
        return {
            metas: posters.animes.map(a => ({
                id: a.id,
                type: "series",
                name: a.nome,
                year: a.ano,
                poster: a.poster,
                posterShape: "regular"
            }))
        };
    }

    return { metas: [] };
});

builder.defineStreamHandler(({ type, id }) => {
    return Promise.resolve({ streams: streams[id] || [] });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
async function iniciar() {
    await carregarPosters();           // agora a função existe
    serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
    console.log(`\n🚀 CloutStream rodando em http://localhost:7000`);
    console.log(`   Filmes: ${postersCache.filmes.length} | Séries: ${postersCache.series.length} | Animes: ${postersCache.animes.length}`);
}

iniciar().catch(err => {
    console.error("Erro ao iniciar o addon:", err);
});
