#!/usr/bin/env node
/* ==========================================================================
   Fogli Volanti — generatore dell'indice
   Legge tutti i file .md dentro /contenuti e scrive /contenuti/indice.json,
   che il sito usa per sapere quali cartelle, fogli e pagine esistono.

   Uso:   node strumenti/genera-indice.js
   (lancialo ogni volta che aggiungi, rinomini o elimini un foglio)
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const md = require("../assets/markdown.js");

const ROOT = path.join(__dirname, "..", "contenuti");
const DIR_CARTELLE = path.join(ROOT, "cartelle");
const DIR_PAGINE = path.join(ROOT, "pagine");
const INFO_CARTELLA = "_cartella.md";

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const slugDa = (nome) => nome.replace(/\.md$/i, "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");

function testoPiano(body) {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^.*\|.*$/gm, "")
    .replace(/\[[ xX]\]\s+/g, "")
    .replace(/^::(youtube|spotify).*$/gim, "")
    .replace(/^\s*https?:\/\/\S+\s*$/gim, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^\s*>\s?\[!\w+\].*$/gm, "")
    .replace(/[*_~=`>#|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function estratto(body, max = 180) {
  const t = testoPiano(body);
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function copertinaDa(meta, body) {
  if (meta.copertina) return { tipo: "immagine", src: meta.copertina };
  const img = body.match(/!\[[^\]]*\]\(\s*([^\s)]+)/);
  if (img) return { tipo: "immagine", src: img[1] };
  const yt = body.match(/::youtube\[([^\]]+)\]/i) || body.match(/^\s*(https?:\/\/\S*(?:youtube\.com|youtu\.be)\S*)\s*$/im);
  if (yt) {
    const id = md.youtubeId(yt[1]);
    if (id) return { tipo: "video", src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, id };
  }
  return null;
}

function leggiFoglio(file) {
  const src = fs.readFileSync(file, "utf8");
  const { meta, body } = md.frontMatter(src);
  if (meta.bozza === true) return null; // "bozza: true" nasconde il foglio
  const titoloH1 = body.match(/^#\s+(.+)$/m);
  const parole = testoPiano(body).split(" ").filter(Boolean).length;
  return {
    slug: meta.slug || slugDa(path.basename(file)),
    titolo: meta.titolo || (titoloH1 ? titoloH1[1].trim() : path.basename(file, ".md")),
    data: meta.data ? String(meta.data) : null,
    estratto: meta.estratto || estratto(body),
    copertina: copertinaDa(meta, body),
    tag: Array.isArray(meta.tag) ? meta.tag : meta.tag ? [meta.tag] : [],
    ordine: typeof meta.ordine === "number" ? meta.ordine : null,
    minuti: Math.max(1, Math.round(parole / 200)),
    file: rel(file),
  };
}

function ordina(fogli) {
  return fogli.sort((a, b) => {
    if (a.ordine !== null || b.ordine !== null) return (a.ordine ?? 9999) - (b.ordine ?? 9999);
    return String(b.data || "").localeCompare(String(a.data || "")) || a.titolo.localeCompare(b.titolo);
  });
}

function leggiCartella(dir, percorso) {
  const voci = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => !d.name.startsWith("."));
  let meta = {}, descrizioneLunga = "";
  const info = path.join(dir, INFO_CARTELLA);
  if (fs.existsSync(info)) {
    const fm = md.frontMatter(fs.readFileSync(info, "utf8"));
    meta = fm.meta;
    descrizioneLunga = fm.body.trim();
  }
  const fogli = ordina(
    voci.filter((v) => v.isFile() && /\.md$/i.test(v.name) && v.name !== INFO_CARTELLA)
      .map((v) => leggiFoglio(path.join(dir, v.name))).filter(Boolean)
  );
  const cartelle = voci.filter((v) => v.isDirectory())
    .map((v) => leggiCartella(path.join(dir, v.name), percorso ? `${percorso}/${slugDa(v.name)}` : slugDa(v.name)))
    .sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999) || a.titolo.localeCompare(b.titolo));
  const nome = path.basename(dir);
  return {
    slug: slugDa(nome),
    percorso,
    titolo: meta.titolo || nome.charAt(0).toUpperCase() + nome.slice(1).replace(/[-_]/g, " "),
    descrizione: meta.descrizione || "",
    testo: descrizioneLunga,
    colore: meta.colore || null,
    etichetta: meta.etichetta || null,
    ordine: typeof meta.ordine === "number" ? meta.ordine : null,
    fogli,
    cartelle,
  };
}

function main() {
  if (!fs.existsSync(DIR_CARTELLE)) fs.mkdirSync(DIR_CARTELLE, { recursive: true });
  if (!fs.existsSync(DIR_PAGINE)) fs.mkdirSync(DIR_PAGINE, { recursive: true });

  const radice = leggiCartella(DIR_CARTELLE, "");
  const pagine = fs.readdirSync(DIR_PAGINE).filter((f) => /\.md$/i.test(f))
    .map((f) => {
      const p = leggiFoglio(path.join(DIR_PAGINE, f));
      if (!p) return null;
      const { meta } = md.frontMatter(fs.readFileSync(path.join(DIR_PAGINE, f), "utf8"));
      p.menu = meta.menu !== false; // "menu: false" la toglie dal menu in alto
      return p;
    })
    .filter(Boolean)
    .sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999) || a.titolo.localeCompare(b.titolo));

  const indice = {
    generato: new Date().toISOString(),
    sciolti: radice.fogli,       // fogli messi direttamente in /contenuti/cartelle
    cartelle: radice.cartelle,
    pagine,
  };
  fs.writeFileSync(path.join(ROOT, "indice.json"), JSON.stringify(indice, null, 2));

  const conta = (c) => c.fogli.length + c.cartelle.reduce((s, x) => s + conta(x), 0);
  const tot = radice.fogli.length + radice.cartelle.reduce((s, c) => s + conta(c), 0);
  console.log(`✓ indice.json aggiornato — ${radice.cartelle.length} cartelle, ${tot} fogli, ${pagine.length} pagine`);
}

main();
