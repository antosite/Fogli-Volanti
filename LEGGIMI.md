# Fogli Volanti — istruzioni

Un sito statico in cui ogni articolo è un **foglio** (un file `.md`), le categorie sono **fascicoli** (cartelle) e le pagine fisse (Chi sono, Contatti…) sono **appunti appesi in bacheca**. Nessun database, nessun pannello: scrivi file di testo e li carichi.

## Dove si mette cosa

```
contenuti/
├── sito.json                 ← titolo, sottotitolo, testo di benvenuto, social
├── indice.json               ← generato in automatico, non toccarlo
├── immagini/                 ← tutte le immagini
├── pagine/                   ← pagine fisse (compaiono nel menu in alto)
│   ├── chi-sono.md
│   └── contatti.md
└── cartelle/                 ← i fascicoli
    ├── benvenuto.md          ← un foglio qui = "foglio sparso" sulla scrivania
    ├── video/                ← una cartella = un fascicolo
    │   ├── _cartella.md      ← (facoltativo) titolo, colore, descrizione del fascicolo
    │   ├── come-monto-un-video.md
    │   └── attrezzatura.md
    └── appunti/
        └── letture/          ← le cartelle possono stare una dentro l'altra
```

## Scrivere un nuovo foglio

1. Crea un file `.md` dentro la cartella giusta, ad esempio `contenuti/cartelle/video/nuovo-video.md`.
   Il nome del file diventa l'indirizzo: usa minuscole e trattini.
2. In cima metti le informazioni del foglio:

   ```
   ---
   titolo: Il titolo del foglio
   data: 2026-11-07
   tag: [video, montaggio]
   copertina: immagini/foto.jpg
   ---
   ```

   Tutto è facoltativo. Altre opzioni utili:
   - `estratto: …` il testo dell'anteprima (se manca, prende l'inizio del foglio)
   - `ordine: 1` per decidere l'ordine dei fogli nel fascicolo (altrimenti va dal più recente)
   - `bozza: true` per nascondere il foglio finché non è pronto
   - nelle pagine, `menu: false` le toglie dal menu in alto

3. Sotto scrivi il testo. Il foglio **Appunti → Come si scrive un foglio** mostra tutta la formattazione disponibile: grassetto, liste, immagini con didascalia, video, post-it colorati, tabelle.
4. Aggiorna l'indice (vedi sotto).

**Video YouTube**: incolla il link da solo su una riga, oppure scrivi `::youtube[link](didascalia)`.

**Spotify** (episodi, show, brani, album, playlist): incolla il link da solo su una riga, oppure `::spotify[link](compatto)` / `(grande)` / `(una didascalia)`. Il link si prende da Spotify con *Condividi → Copia link*.

**Modelli pronti**: nella cartella `modelli/` trovi file da copiare per articolo, episodio del podcast, post con video, pagina e categoria.
Se il foglio non ha una copertina, l'anteprima usa la prima immagine o la miniatura del primo video.

## Un nuovo fascicolo

Crea una cartella dentro `contenuti/cartelle/`. Se vuoi personalizzarlo aggiungi `_cartella.md`:

```
---
titolo: Video
descrizione: Dietro le quinte dei video del canale.
colore: #a9bfcf
ordine: 1
---
Testo facoltativo che appare in cima al fascicolo aperto.
```

Senza `colore` il fascicolo è color cartoncino.

## Aggiornare l'indice

Il sito è statico, quindi non può "guardare" dentro le cartelle da solo: legge l'elenco da `contenuti/indice.json`. Dopo aver aggiunto, rinominato o eliminato fogli lancia, dalla cartella del sito:

```
node strumenti/genera-indice.js
```

Serve [Node.js](https://nodejs.org) (nessun altro pacchetto da installare).
Se pubblichi con GitHub Pages usando il workflow incluso, l'indice si rigenera da solo a ogni caricamento.

## Vedere il sito sul computer

Aprire `index.html` con un doppio clic non funziona (il browser blocca la lettura dei file). Dalla cartella del sito avvia un piccolo server:

```
npx serve
```
oppure
```
python3 -m http.server
```
e apri l'indirizzo che ti indica (es. http://localhost:3000 o http://localhost:8000).

## Pubblicarlo su GitHub Pages (gratis)

Non serve il terminale: si fa tutto dal sito di GitHub.

1. **Crea il repository.** Su github.com → *New repository*. Nome, ad esempio, `fogli-volanti`; visibilità **Public** (con l'account gratuito Pages funziona solo sui repository pubblici). Non aggiungere README. → *Create repository*.
2. **Carica i file.** Nella pagina del repository clicca *uploading an existing file* e trascina **il contenuto** della cartella `fogli-volanti` (index.html, assets, contenuti, strumenti, modelli…), non la cartella stessa. → *Commit changes*.
3. **Aggiungi l'automazione** (la cartella `.github` è nascosta e spesso il trascinamento la salta). *Add file → Create new file*, come nome scrivi `.github/workflows/pubblica.yml`, incolla il contenuto dell'omonimo file che trovi nello zip → *Commit changes*.
   Su Mac, per vedere i file nascosti nel Finder: ⌘ + ⇧ + . (punto).
4. **Attiva Pages.** *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
5. **Aspetta un minuto.** Nella scheda *Actions* vedi l'automazione al lavoro (pallino giallo → spunta verde). Il sito è online su
   `https://IL-TUO-NOME-UTENTE.github.io/fogli-volanti/`
   Se nella scheda Actions non è partito nulla, apri *Pubblica Fogli Volanti* → *Run workflow*.

### Aggiungere fogli dopo la pubblicazione

- **Nuovo articolo:** entra in `contenuti/cartelle/<categoria>` → *Add file → Create new file* → nome `titolo-articolo.md` → incolla un modello da `modelli/` e scrivi → *Commit changes*.
- **Immagini:** entra in `contenuti/immagini` → *Add file → Upload files*.
- **Nuova categoria:** *Create new file* con nome `contenuti/cartelle/nome-categoria/_cartella.md` (scrivendo le barre, GitHub crea le cartelle).
- **Modificare:** apri il file e clicca la matita ✏️.

Ogni *Commit* rigenera l'indice e ripubblica il sito da solo in circa un minuto: non devi lanciare niente.

**Più comodo, se scrivi spesso:** installa [GitHub Desktop](https://desktop.github.com), clona il repository sul computer, scrivi i file con il tuo editor e premi *Commit* e poi *Push*.

**Dominio personale (facoltativo):** *Settings → Pages → Custom domain*, poi segui le istruzioni per il DNS del tuo dominio.

### Altri hosting

Netlify o Cloudflare Pages: collega il repository, comando di build `node strumenti/genera-indice.js`, cartella di pubblicazione `.` (la radice).

## Personalizzare

- Testi generali e link social: `contenuti/sito.json`
- Colori e caratteri: le variabili in cima a `assets/style.css`
- Colori del brand (azzurro `#0097b2`, giallo `#ffbd59`): le variabili `--azzurro` e `--giallo` in cima a `assets/style.css`
- **Logo** dei fogli: `assets/logo-fogli-volanti.png` (voce `"logo"` in `sito.json`), mostrato dentro il riquadro azzurro
- **Firma "anto"** nel piè di pagina: `assets/logo-anto.png` (voce `"firma"`; togli la voce per nasconderla)
- **Icona della scheda del browser:** `assets/favicon.png` (voce `"icona"`)

## Come si usa il sito

- Clic su un fascicolo → si apre e mostra i fogli (e le eventuali sottocartelle)
- Clic su un foglio → lo leggi. Per sfogliare: frecce ← → della tastiera, i pulsanti nella barra in basso, i pallini, oppure trascina col dito sul telefono
- Clic su un tag o ricerca in alto → trova i fogli per titolo, testo d'anteprima, tag o fascicolo
