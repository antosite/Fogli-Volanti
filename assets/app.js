/* ==========================================================================
   Fogli Volanti — applicazione
   Percorsi (hash):
     #/                    scrivania (home)
     #/c/<cartella>        apre un fascicolo (anche annidato: #/c/video/tutorial)
     #/f/<cartella>/<foglio>  legge un foglio e permette di sfogliare
     #/f/<foglio>          foglio sciolto (sulla scrivania)
     #/p/<pagina>          pagina (Chi sono, Contatti…)
     #/cerca/<testo>       ricerca
   ========================================================================== */
(function () {
  "use strict";

  const BASE = "contenuti/";
  const $app = document.getElementById("app");
  const cacheMd = new Map();
  let SITO = {}, INDICE = null;
  let stato = { vista: null, chiave: null };

  /* ---------------- utilità ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const inclinazione = (s, max = 2.4) => (((hash(s) % 1000) / 1000) * 2 - 1) * max;
  const src = (p) => (/^(https?:|data:|\/)/.test(p) ? p : BASE + p);
  const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  function dataIt(d) {
    if (!d) return "";
    const m = String(d).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (!m) return esc(d);
    return `${m[3] ? +m[3] + " " : ""}${MESI[+m[2] - 1]} ${m[1]}`;
  }
  const vai = (h) => { location.hash = h; };

  function trovaCartella(percorso) {
    if (!percorso) return { titolo: "Scrivania", percorso: "", fogli: INDICE.sciolti, cartelle: INDICE.cartelle, radice: true };
    let livello = INDICE.cartelle, trovata = null;
    for (const pezzo of percorso.split("/")) {
      trovata = livello.find((c) => c.slug === pezzo);
      if (!trovata) return null;
      livello = trovata.cartelle;
    }
    return trovata;
  }
  function catena(percorso) {
    const out = [];
    if (!percorso) return out;
    let livello = INDICE.cartelle;
    for (const pezzo of percorso.split("/")) {
      const c = livello.find((x) => x.slug === pezzo);
      if (!c) break;
      out.push(c);
      livello = c.cartelle;
    }
    return out;
  }
  function tuttiIFogli() {
    const out = INDICE.sciolti.map((f) => ({ ...f, cartella: "" }));
    (function giro(lista) {
      for (const c of lista) {
        c.fogli.forEach((f) => out.push({ ...f, cartella: c.percorso, nomeCartella: c.titolo, colore: c.colore }));
        giro(c.cartelle);
      }
    })(INDICE.cartelle);
    return out;
  }
  const contaFogli = (c) => c.fogli.length + c.cartelle.reduce((s, x) => s + contaFogli(x), 0);

  async function caricaMd(file) {
    if (cacheMd.has(file)) return cacheMd.get(file);
    const r = await fetch(BASE + file + "?v=" + encodeURIComponent(INDICE.generato));
    if (!r.ok) throw new Error("Foglio non trovato: " + file);
    const testo = await r.text();
    const { body } = FVMarkdown.frontMatter(testo);
    const html = FVMarkdown.parse(body.replace(/^#\s+.+\n/, ""), { base: BASE }); // il titolo H1 lo mostriamo noi
    cacheMd.set(file, html);
    return html;
  }

  /* ---------------- pezzi di interfaccia ---------------- */
  function briciole(percorso, extra) {
    const pezzi = [`<a href="#/">Scrivania</a>`];
    catena(percorso).forEach((c) => pezzi.push(`<a href="#/c/${c.percorso}">${esc(c.titolo)}</a>`));
    if (extra) pezzi.push(`<span>${esc(extra)}</span>`);
    return `<nav class="briciole" aria-label="Percorso">${pezzi.join('<i aria-hidden="true">/</i>')}</nav>`;
  }

  function cartellaHtml(c, piccola) {
    const n = contaFogli(c);
    const stile = c.colore ? ` style="--colore:${esc(c.colore)}"` : "";
    return `
      <a class="fascicolo${piccola ? " piccolo" : ""}" href="#/c/${c.percorso}"${stile}>
        <span class="fascicolo-retro"></span>
        <span class="fascicolo-foglio f1"></span>
        <span class="fascicolo-foglio f2"></span>
        <span class="fascicolo-fronte">
          <span class="fascicolo-etichetta">${esc(c.etichetta || c.titolo)}</span>
          ${c.descrizione ? `<span class="fascicolo-desc">${esc(c.descrizione)}</span>` : ""}
          <span class="fascicolo-conta">${n} ${n === 1 ? "foglio" : "fogli"}${c.cartelle.length ? ` · ${c.cartelle.length} ${c.cartelle.length === 1 ? "cartella" : "cartelle"}` : ""}</span>
        </span>
      </a>`;
  }

  function schedaHtml(f, percorso, opz = {}) {
    const link = percorso ? `#/f/${percorso}/${f.slug}` : `#/f/${f.slug}`;
    const cop = f.copertina
      ? `<span class="scheda-copertina${f.copertina.tipo === "video" ? " is-video" : ""}"><img src="${esc(src(f.copertina.src))}" alt="" loading="lazy"></span>`
      : "";
    return `
      <a class="scheda" href="${link}" style="--r:${inclinazione(f.slug + percorso).toFixed(2)}deg">
        ${opz.graffetta ? '<span class="graffetta" aria-hidden="true"></span>' : ""}
        ${cop}
        <span class="scheda-corpo">
          ${opz.cartella && f.nomeCartella ? `<span class="scheda-cartella">${esc(f.nomeCartella)}</span>` : ""}
          <span class="scheda-titolo">${esc(f.titolo)}</span>
          ${f.estratto ? `<span class="scheda-estratto">${esc(f.estratto)}</span>` : ""}
          <span class="scheda-meta">${f.data ? dataIt(f.data) : ""}${f.data ? " · " : ""}${f.minuti} min</span>
        </span>
      </a>`;
  }

  /* ---------------- viste ---------------- */
  function vistaScrivania() {
    document.title = SITO.titolo || "Fogli Volanti";
    const ultimi = tuttiIFogli().filter((f) => f.data && f.cartella).sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, SITO.ultimiFogli || 6);
    const pagineAppese = INDICE.pagine.filter((p) => p.menu !== false).slice(0, 3);
    $app.innerHTML = `
      <section class="intro">
        ${SITO.intro ? `<p class="intro-testo">${esc(SITO.intro)}</p>` : ""}
      </section>

      ${INDICE.cartelle.length ? `
      <section class="sezione">
        <h2 class="sezione-titolo"><span>Fascicoli</span></h2>
        <div class="griglia-fascicoli">${INDICE.cartelle.map((c) => cartellaHtml(c)).join("")}</div>
      </section>` : ""}

      ${ultimi.length ? `
      <section class="sezione">
        <h2 class="sezione-titolo"><span>Ultimi fogli</span></h2>
        <div class="griglia-schede">${ultimi.map((f) => schedaHtml(f, f.cartella, { cartella: true })).join("")}</div>
      </section>` : ""}

      ${INDICE.sciolti.length ? `
      <section class="sezione">
        <h2 class="sezione-titolo"><span>Fogli sparsi</span></h2>
        <div class="griglia-schede">${INDICE.sciolti.map((f) => schedaHtml(f, "", { graffetta: true })).join("")}</div>
      </section>` : ""}

      ${pagineAppese.length ? `
      <section class="sezione">
        <h2 class="sezione-titolo"><span>Appesi in bacheca</span></h2>
        <div class="bacheca">${pagineAppese.map((p) => `
          <a class="appunto" href="#/p/${p.slug}" style="--r:${inclinazione(p.slug, 3).toFixed(2)}deg">
            <span class="puntina" aria-hidden="true"></span>
            <strong>${esc(p.titolo)}</strong>
            <span>${esc(p.estratto)}</span>
          </a>`).join("")}
        </div>
      </section>` : ""}
    `;
  }

  function vistaCartella(percorso) {
    const c = trovaCartella(percorso);
    if (!c) return vistaErrore("Questo fascicolo non esiste (o è stato spostato).");
    document.title = `${c.titolo} — ${SITO.titolo || "Fogli Volanti"}`;
    const stile = c.colore ? ` style="--colore:${esc(c.colore)}"` : "";
    $app.innerHTML = `
      ${briciole(percorso)}
      <section class="cartella-aperta"${stile}>
        <div class="cartella-linguetta">${esc(c.etichetta || c.titolo)}</div>
        <div class="cartella-interno">
          <header class="cartella-testa">
            <h1>${esc(c.titolo)}</h1>
            ${c.descrizione ? `<p class="cartella-desc">${esc(c.descrizione)}</p>` : ""}
            ${c.testo ? `<div class="cartella-testo prosa">${FVMarkdown.parse(c.testo, { base: BASE })}</div>` : ""}
          </header>
          ${c.cartelle.length ? `<div class="griglia-fascicoli dentro">${c.cartelle.map((x) => cartellaHtml(x, true)).join("")}</div>` : ""}
          ${c.fogli.length
            ? `<div class="griglia-schede">${c.fogli.map((f) => schedaHtml(f, percorso)).join("")}</div>
               <p class="suggerimento">Apri un foglio e sfoglia con le frecce ← →</p>`
            : !c.cartelle.length ? `<p class="vuoto">Questo fascicolo è ancora vuoto.</p>` : ""}
        </div>
      </section>`;
  }

  function costruisciFoglio(f, elenco, indice, percorso, tipo) {
    const el = document.createElement("article");
    el.className = "foglio";
    el.style.setProperty("--r", inclinazione(f.slug, 0.6).toFixed(2) + "deg");
    el.innerHTML = `
      <div class="foglio-fori" aria-hidden="true"><i></i><i></i><i></i></div>
      <header class="foglio-testa">
        <div class="foglio-numero">${tipo === "pagina" ? "pagina" : "foglio"} ${indice + 1}<span>/${elenco.length}</span></div>
        <h1>${esc(f.titolo)}</h1>
        <div class="foglio-meta">
          ${f.data ? `<time datetime="${esc(f.data)}">${dataIt(f.data)}</time>` : ""}
          ${tipo !== "pagina" ? `<span>${f.minuti} min di lettura</span>` : ""}
          ${f.tag.map((t) => `<a class="tag" href="#/cerca/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}
        </div>
      </header>
      <div class="prosa"><p class="caricamento">Sto prendendo il foglio dal fascicolo…</p></div>
      <footer class="foglio-piede">${esc(SITO.titolo || "Fogli Volanti")} · ${tipo === "pagina" ? esc(f.titolo) : esc(catena(percorso).map((c) => c.titolo).join(" / ") || "fogli sparsi")}</footer>`;
    caricaMd(f.file)
      .then((html) => { el.querySelector(".prosa").innerHTML = html; })
      .catch((e) => { el.querySelector(".prosa").innerHTML = `<p class="errore">${esc(e.message)}</p>`; });
    return el;
  }

  function vistaFoglio(percorso, slug, tipo) {
    const elenco = tipo === "pagina" ? INDICE.pagine : (trovaCartella(percorso) || {}).fogli;
    const i = elenco ? elenco.findIndex((f) => f.slug === slug) : -1;
    if (i < 0) return vistaErrore("Questo foglio è volato via: non lo trovo.");
    const f = elenco[i];
    document.title = `${f.titolo} — ${SITO.titolo || "Fogli Volanti"}`;
    const link = (k) => {
      const x = elenco[k];
      if (!x) return null;
      return tipo === "pagina" ? `#/p/${x.slug}` : percorso ? `#/f/${percorso}/${x.slug}` : `#/f/${x.slug}`;
    };
    const prec = link(i - 1), succ = link(i + 1);
    const chiaveMazzo = tipo + ":" + percorso;

    // se stiamo già sfogliando lo stesso mazzo, animiamo il volo del foglio
    const mazzo = $app.querySelector(".mazzo");
    const direzione = stato.vista === "foglio" && stato.mazzo === chiaveMazzo && mazzo ? (i > stato.indice ? 1 : i < stato.indice ? -1 : 0) : 0;
    const nuovo = costruisciFoglio(f, elenco, i, percorso, tipo);

    const controlli = `
      <a class="sfoglia sfoglia-prec${prec ? "" : " off"}" ${prec ? `href="${prec}"` : 'aria-disabled="true"'} aria-label="Foglio precedente">
        <span aria-hidden="true">←</span><em>${prec ? esc(elenco[i - 1].titolo) : "Inizio"}</em></a>
      <div class="sfoglia-punti" role="tablist">${elenco.map((x, k) => `<a href="${link(k)}" class="${k === i ? "attivo" : ""}" title="${esc(x.titolo)}" aria-label="${esc(x.titolo)}"></a>`).join("")}</div>
      <a class="sfoglia sfoglia-succ${succ ? "" : " off"}" ${succ ? `href="${succ}"` : 'aria-disabled="true"'} aria-label="Foglio successivo">
        <em>${succ ? esc(elenco[i + 1].titolo) : "Fine del fascicolo"}</em><span aria-hidden="true">→</span></a>`;

    if (direzione !== 0) {
      const vecchio = mazzo.querySelector(".foglio:not(.via)");
      $app.querySelector(".controlli").innerHTML = controlli;
      $app.querySelector(".briciole-slot").innerHTML = briciole(percorso, tipo === "pagina" ? "Pagine" : null);
      if (direzione > 0) {
        // il foglio corrente vola via a sinistra e scopre quello sotto
        mazzo.insertBefore(nuovo, vecchio);
        vecchio.classList.add("via", "vola-sinistra");
      } else {
        // il foglio precedente rientra volando da sinistra, sopra il corrente
        nuovo.classList.add("arriva-sinistra");
        mazzo.appendChild(nuovo);
        vecchio.classList.add("via", "sotto");
      }
      setTimeout(() => vecchio.remove(), 650);
      window.scrollTo({ top: Math.min(window.scrollY, mazzo.offsetTop - 90), behavior: "smooth" });
    } else {
      $app.innerHTML = `
        <div class="briciole-slot">${briciole(percorso, tipo === "pagina" ? "Pagine" : null)}</div>
        <div class="mazzo-area">
          <div class="mazzo" data-restanti="${Math.min(elenco.length - i - 1, 3)}"></div>
        </div>
        <nav class="controlli" aria-label="Sfoglia">${controlli}</nav>`;
      $app.querySelector(".mazzo").appendChild(nuovo);
      nuovo.classList.add("entra");
      window.scrollTo(0, 0);
    }
    $app.querySelector(".mazzo").dataset.restanti = Math.min(elenco.length - i - 1, 3);
    stato = { vista: "foglio", mazzo: chiaveMazzo, indice: i, prec, succ };
  }

  function vistaCerca(q) {
    q = decodeURIComponent(q || "").trim();
    const chiave = q.toLowerCase();
    const ris = !chiave ? [] : tuttiIFogli().filter((f) =>
      [f.titolo, f.estratto, ...(f.tag || []), f.nomeCartella].join(" ").toLowerCase().includes(chiave));
    document.title = `Cerca “${q}” — ${SITO.titolo || "Fogli Volanti"}`;
    $app.innerHTML = `
      ${briciole("", "Ricerca")}
      <section class="sezione">
        <h2 class="sezione-titolo"><span>${ris.length} ${ris.length === 1 ? "foglio trovato" : "fogli trovati"} per “${esc(q)}”</span></h2>
        ${ris.length ? `<div class="griglia-schede">${ris.map((f) => schedaHtml(f, f.cartella, { cartella: true })).join("")}</div>`
          : `<p class="vuoto">Nessun foglio parla di questo. Prova con un'altra parola.</p>`}
      </section>`;
    const campo = document.getElementById("cerca-campo");
    if (campo && document.activeElement !== campo) campo.value = q;
  }

  function vistaErrore(msg) {
    $app.innerHTML = `<div class="errore-box"><div class="foglio piccolo"><h1>Ops.</h1><p>${esc(msg)}</p><p><a href="#/">← Torna alla scrivania</a></p></div></div>`;
  }

  /* ---------------- router ---------------- */
  function router() {
    const h = location.hash.replace(/^#\/?/, "");
    const [tipo, ...resto] = h.split("/");
    const r = resto.filter(Boolean).join("/");
    if (tipo !== "f" && tipo !== "p") stato = { vista: tipo || "home" };
    document.body.dataset.vista = tipo || "home";
    switch (tipo) {
      case "": case undefined: return vistaScrivania();
      case "c": return vistaCartella(r);
      case "f": {
        const pezzi = r.split("/");
        const slug = pezzi.pop();
        return vistaFoglio(pezzi.join("/"), slug, "foglio");
      }
      case "p": return vistaFoglio("", r, "pagina");
      case "cerca": return vistaCerca(resto.join("/"));
      default: return vistaErrore("Pagina non trovata.");
    }
  }

  /* ---------------- testata e piè di pagina ---------------- */
  function testata() {
    document.getElementById("testata-titolo").textContent = SITO.titolo || "Fogli Volanti";
    document.getElementById("testata-sotto").textContent = SITO.sottotitolo || "";
    if (SITO.logo) document.getElementById("logo").src = SITO.logo;
    if (SITO.icona) document.getElementById("favicon").href = SITO.icona;
    const nav = document.getElementById("menu");
    nav.innerHTML = INDICE.pagine.filter((p) => p.menu !== false)
      .map((p) => `<a href="#/p/${p.slug}">${esc(p.titolo)}</a>`).join("");
    const piede = document.getElementById("piede");
    piede.innerHTML = `
      <div>${SITO.firma ? `<span class="firma"><img src="${esc(SITO.firma)}" alt="${esc(SITO.autore || "")}"></span>` : ""}${esc(SITO.piede || `© ${new Date().getFullYear()} ${SITO.autore || ""}`)}</div>
      <div class="social">${(SITO.social || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.nome)}</a>`).join("")}</div>`;
    if (SITO.descrizione) document.querySelector('meta[name="description"]').setAttribute("content", SITO.descrizione);
  }

  /* ---------------- interazioni globali ---------------- */
  document.addEventListener("keydown", (e) => {
    if (stato.vista !== "foglio" || e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight" && stato.succ) vai(stato.succ.slice(1));
    if (e.key === "ArrowLeft" && stato.prec) vai(stato.prec.slice(1));
  });
  let tx = null, ty = null;
  document.addEventListener("touchstart", (e) => { if (e.target.closest(".mazzo")) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (tx === null || stato.vista !== "foglio") return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0 && stato.succ) vai(stato.succ.slice(1));
      if (dx > 0 && stato.prec) vai(stato.prec.slice(1));
    }
  });
  document.getElementById("cerca").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("cerca-campo").value.trim();
    if (q) vai("/cerca/" + encodeURIComponent(q));
  });

  /* ---------------- avvio ---------------- */
  async function avvio() {
    try {
      const [s, i] = await Promise.all([
        fetch(BASE + "sito.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        fetch(BASE + "indice.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      ]);
      SITO = s; INDICE = i;
    } catch (e) {
      $app.innerHTML = `<div class="errore-box"><div class="foglio piccolo"><h1>Il vento ha portato via l'indice</h1>
        <p>Non riesco a leggere <code>contenuti/indice.json</code>.</p>
        <p>Se hai aperto <code>index.html</code> con un doppio clic, il browser blocca la lettura dei file: avvia un piccolo server nella cartella del sito, ad esempio <code>npx serve</code> oppure <code>python3 -m http.server</code>, e apri l'indirizzo che ti indica.</p>
        <p>Se hai appena aggiunto dei fogli, ricordati di lanciare <code>node strumenti/genera-indice.js</code>.</p></div></div>`;
      return;
    }
    testata();
    window.addEventListener("hashchange", router);
    router();
  }
  avvio();
})();
