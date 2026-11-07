/* ==========================================================================
   Fogli Volanti — mini parser Markdown (nessuna dipendenza)
   Supporta: titoli, grassetto, corsivo, barrato, ==evidenziato==, `codice`,
   link, immagini (con didascalia), liste (anche annidate e con [ ] / [x]),
   citazioni, note "post-it" (> [!nota]), blocchi di codice, tabelle,
   linee orizzontali, HTML grezzo, video YouTube.
   ========================================================================== */
(function (global) {
  "use strict";

  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- YouTube ---------- */
  function youtubeId(str) {
    str = str.trim();
    if (/^[\w-]{11}$/.test(str)) return str;
    const m = str.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
    );
    return m ? m[1] : null;
  }
  function youtubeEmbed(id, caption) {
    return (
      `<figure class="video"><div class="video-box">` +
      `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(caption || "Video YouTube")}" ` +
      `loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` +
      `</div>${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`
    );
  }

  /* ---------- Spotify ---------- */
  // accetta link open.spotify.com (anche /intl-it/) o URI spotify:episode:ID
  function spotifyInfo(str) {
    str = str.trim();
    let m = str.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,})/);
    if (!m) m = str.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]{10,})$/);
    return m ? { tipo: m[1], id: m[2] } : null;
  }
  function spotifyEmbed(info, opz) {
    // altezze ufficiali: 152 compatto, 232 episodio/show con copertina, 352 playlist/album
    let h = { track: 152, episode: 232, show: 232, album: 352, playlist: 352, artist: 352 }[info.tipo];
    const o = (opz || "").trim().toLowerCase();
    if (o === "compatto" || o === "piccolo") h = 152;
    else if (o === "grande") h = 352;
    else if (/^\d+$/.test(o)) h = +o;
    const cap = o && !/^(compatto|piccolo|grande|\d+)$/.test(o) ? opz.trim() : "";
    return (
      `<figure class="spotify"><iframe src="https://open.spotify.com/embed/${info.tipo}/${info.id}?utm_source=generator" ` +
      `height="${h}" style="height:${h}px" title="Player Spotify" loading="lazy" frameborder="0" ` +
      `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>` +
      `${cap ? `<figcaption>${inline(cap)}</figcaption>` : ""}</figure>`
    );
  }
  const spotifySegnaposto = () =>
    `<div class="spotify-segnaposto">Qui apparirà il player Spotify: incolla il link dell'episodio, della puntata o della playlist.</div>`;

  /* ---------- Percorsi relativi delle immagini ---------- */
  let BASE = "";
  function resolve(url) {
    if (/^(https?:|data:|mailto:|tel:|#|\/)/i.test(url)) return url;
    return BASE + url;
  }

  /* ---------- Inline ---------- */
  function inline(text) {
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(`<code>${esc(c)}</code>`);
      return `\u0000${codes.length - 1}\u0000`;
    });

    // HTML inline consentito (es. <br>, <span>): lo proteggiamo prima dell'escape
    const tags = [];
    text = text.replace(/<\/?[a-zA-Z][^>]*>/g, (t) => {
      tags.push(t);
      return `\u0001${tags.length - 1}\u0001`;
    });

    text = esc(text);

    // immagini ![alt](src "titolo")
    text = text.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, alt, src, title) =>
      `<img src="${resolve(src)}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy">`
    );
    // link [testo](url)
    text = text.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g, (_, t, href, title) => {
      const ext = /^https?:/i.test(href);
      return `<a href="${resolve(href)}"${title ? ` title="${title}"` : ""}${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
    });
    // URL nudi
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');

    text = text
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>")
      .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1<em>$2</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/==(.+?)==/g, "<mark>$1</mark>")
      .replace(/ {2,}\n|\\\n/g, "<br>");

    text = text.replace(/\u0001(\d+)\u0001/g, (_, i) => tags[i]);
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
    return text;
  }

  /* ---------- Liste ---------- */
  function parseList(lines) {
    // lines: array di righe che appartengono alla lista
    const items = [];
    const baseIndent = lines[0].match(/^\s*/)[0].length;
    const ordered = /^\s*\d+[.)]\s/.test(lines[0]);
    let cur = null;
    for (const l of lines) {
      const ind = l.match(/^\s*/)[0].length;
      const m = l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
      if (m && ind <= baseIndent + 1) {
        cur = { text: m[1], children: [] };
        items.push(cur);
      } else if (cur) {
        cur.children.push(l);
      }
    }
    const tag = ordered ? "ol" : "ul";
    const html = items
      .map((it) => {
        let t = it.text;
        let cls = "";
        const task = t.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) {
          cls = ' class="task"';
          t = `<input type="checkbox" disabled${task[1] !== " " ? " checked" : ""}> ${inline(task[2])}`;
        } else t = inline(t);
        const sub = it.children.filter((c) => c.trim());
        let subHtml = "";
        if (sub.length) {
          if (/^\s*(?:[-*+]|\d+[.)])\s/.test(sub[0])) subHtml = parseList(sub);
          else subHtml = " " + inline(sub.map((s) => s.trim()).join(" "));
        }
        return `<li${cls}>${t}${subHtml}</li>`;
      })
      .join("");
    return `<${tag}>${html}</${tag}>`;
  }

  /* ---------- Tabelle ---------- */
  function splitRow(r) {
    return r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  }
  function parseTable(lines) {
    const head = splitRow(lines[0]);
    const align = splitRow(lines[1]).map((c) =>
      /^:-+:$/.test(c) ? "center" : /^-+:$/.test(c) ? "right" : /^:-+$/.test(c) ? "left" : ""
    );
    const cell = (tag, c, i) => `<${tag}${align[i] ? ` style="text-align:${align[i]}"` : ""}>${inline(c)}</${tag}>`;
    const body = lines.slice(2).map((r) => `<tr>${splitRow(r).map((c, i) => cell("td", c, i)).join("")}</tr>`);
    return `<div class="tabella"><table><thead><tr>${head.map((c, i) => cell("th", c, i)).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`;
  }

  /* ---------- Blocchi ---------- */
  function parse(src, opts) {
    BASE = (opts && opts.base) || "";
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    const slugCount = {};

    while (i < lines.length) {
      let line = lines[i];

      if (!line.trim()) { i++; continue; }

      // blocco di codice
      const fence = line.match(/^\s*(```|~~~)\s*([\w-]*)/);
      if (fence) {
        const buf = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code${fence[2] ? ` class="lang-${fence[2]}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
        continue;
      }

      // YouTube: ::youtube[URL o ID](didascalia opzionale)  oppure  una riga con solo il link
      const yt = line.match(/^\s*::youtube\[([^\]]+)\](?:\(([^)]*)\))?\s*$/i);
      if (yt) {
        const id = youtubeId(yt[1]);
        out.push(id ? youtubeEmbed(id, yt[2]) : `<p>${inline(line)}</p>`);
        i++;
        continue;
      }
      if (/^\s*https?:\/\/\S+\s*$/.test(line) && youtubeId(line)) {
        out.push(youtubeEmbed(youtubeId(line)));
        i++;
        continue;
      }

      // Spotify: ::spotify[link](compatto | grande | didascalia)  oppure  una riga con solo il link
      const sp = line.match(/^\s*::spotify\[([^\]]+)\](?:\(([^)]*)\))?\s*$/i);
      if (sp) {
        const info = spotifyInfo(sp[1]);
        out.push(info ? spotifyEmbed(info, sp[2]) : spotifySegnaposto());
        i++;
        continue;
      }
      if (/^\s*(https?:\/\/open\.spotify\.com\/\S+|spotify:\w+:\w+)\s*$/.test(line) && spotifyInfo(line)) {
        out.push(spotifyEmbed(spotifyInfo(line)));
        i++;
        continue;
      }

      // titoli
      const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) {
        const lvl = h[1].length;
        let slug = h[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
        slugCount[slug] = (slugCount[slug] || 0) + 1;
        if (slugCount[slug] > 1) slug += "-" + slugCount[slug];
        out.push(`<h${lvl} id="${slug}">${inline(h[2])}</h${lvl}>`);
        i++;
        continue;
      }

      // linea orizzontale
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        out.push('<hr>');
        i++;
        continue;
      }

      // citazioni / post-it
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
        const call = buf[0] && buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (call) {
          const tipo = call[1].toLowerCase();
          const titolo = call[2];
          const inner = parse(buf.slice(1).join("\n"), opts);
          out.push(`<aside class="postit postit-${tipo}">${titolo ? `<strong class="postit-titolo">${inline(titolo)}</strong>` : ""}${inner}</aside>`);
        } else {
          out.push(`<blockquote>${parse(buf.join("\n"), opts)}</blockquote>`);
        }
        continue;
      }

      // liste
      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
        const buf = [];
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim()) {
            // continua se la riga dopo è ancora lista/indentata
            const nx = lines[i + 1] || "";
            if (/^\s{2,}\S/.test(nx)) { i++; continue; }
            break;
          }
          if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(l) || /^\s{2,}\S/.test(l)) { buf.push(l); i++; }
          else break;
        }
        out.push(parseList(buf));
        continue;
      }

      // tabelle
      if (line.includes("|") && lines[i + 1] && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        const buf = [];
        while (i < lines.length && lines[i].includes("|")) buf.push(lines[i++]);
        out.push(parseTable(buf));
        continue;
      }

      // HTML grezzo
      if (/^\s*<(div|section|figure|iframe|details|table|video|audio|aside|p|center|img)[\s>]/i.test(line)) {
        const buf = [];
        while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
        out.push(buf.join("\n"));
        continue;
      }

      // paragrafo
      const buf = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{1,6}\s|\s*>|\s*```|\s*~~~|\s*(?:[-*+]|\d+[.)])\s+|\s*::youtube|\s*::spotify)/.test(lines[i]) &&
        !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
      ) buf.push(lines[i++]);
      const para = buf.join("\n");

      // immagine da sola → figura con didascalia
      const solo = para.trim().match(/^!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"(.*?)")?\s*\)$/);
      if (solo) {
        const cap = solo[3] || "";
        out.push(
          `<figure class="foto"><img src="${resolve(solo[2])}" alt="${esc(solo[1])}" loading="lazy">` +
          (cap ? `<figcaption>${inline(cap)}</figcaption>` : "") + `</figure>`
        );
      } else {
        out.push(`<p>${inline(para)}</p>`);
      }
    }
    return out.join("\n");
  }

  /* ---------- Front matter ---------- */
  function frontMatter(src) {
    const m = src.match(/^﻿?---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!m) return { meta: {}, body: src };
    const meta = {};
    m[1].split("\n").forEach((l) => {
      const kv = l.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (!kv) return;
      let v = kv[2].trim().replace(/^["']|["']$/g, "");
      if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      else if (/^(true|false)$/i.test(v)) v = v.toLowerCase() === "true";
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      meta[kv[1]] = v;
    });
    return { meta, body: src.slice(m[0].length) };
  }

  const api = { parse, frontMatter, youtubeId, spotifyInfo };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.FVMarkdown = api;
})(this);
