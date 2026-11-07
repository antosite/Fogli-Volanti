---
titolo: Come si scrive un foglio
data: 2026-11-06
tag: [guida, markdown]
ordine: 1
estratto: Tutta la formattazione disponibile in un solo foglio, da tenere come promemoria.
---

Ogni foglio è un file `.md`. In alto c'è un piccolo blocco tra due righe `---` con le informazioni del foglio (titolo, data, tag…), sotto scrivi liberamente.

## Testo

Puoi scrivere in **grassetto**, in *corsivo*, ~~barrato~~, ==evidenziato come con l'evidenziatore== e `codice`. I link si scrivono così: [il mio canale](https://www.youtube.com/@filmdbyanto).

Per andare a capo senza cambiare paragrafo, metti due spazi alla fine della riga  
oppure lascia una riga vuota per un nuovo paragrafo.

## Elenchi

- Primo punto
- Secondo punto
  - un sotto-punto
  - un altro
- Terzo punto

1. Prima cosa da fare
2. Seconda cosa
3. Terza cosa

- [x] Cosa già fatta
- [ ] Cosa ancora da fare

## Immagini

Metti le immagini nella cartella `contenuti/immagini/` e scrivi il percorso partendo da lì. Il testo tra virgolette diventa la didascalia scritta a mano.

![Una scrivania piena di fogli](immagini/quaderno.svg "La didascalia va tra virgolette")

## Video da YouTube

Basta incollare il link da solo su una riga:

https://www.youtube.com/watch?v=jNQXAC9IVRw

Oppure, se vuoi una didascalia:

::youtube[https://youtu.be/jNQXAC9IVRw](Il primo video mai caricato su YouTube)

## Spotify

Anche qui basta incollare il link (da Spotify: *Condividi → Copia link*), da solo su una riga. Funziona con episodi, show, brani, album e playlist:

```
https://open.spotify.com/episode/…
```

Per scegliere la dimensione del player usa la forma lunga, con `compatto` o `grande` tra parentesi (oppure una didascalia):

```
::spotify[https://open.spotify.com/episode/…](compatto)
```

Se il link non è valido, al posto del player compare un riquadro tratteggiato come questo:

::spotify[INCOLLA-QUI-IL-LINK]

## Citazioni e post-it

> Una citazione si scrive con il segno di maggiore all'inizio della riga.

> [!nota] Questo è un post-it
> Scrivi `[!nota]` subito dopo il `>`. Ci sono anche `[!idea]` (verde), `[!info]` (azzurro) e `[!attenzione]` (rosa).

> [!attenzione] Ricorda
> Dopo aver aggiunto un foglio, lancia `node strumenti/genera-indice.js`.

## Tabelle

| Cosa | Dove va | Esempio |
|---|---|:---:|
| Foglio | `contenuti/cartelle/<cartella>/` | `mio-articolo.md` |
| Pagina | `contenuti/pagine/` | `chi-sono.md` |
| Immagine | `contenuti/immagini/` | `foto.jpg` |

## Codice

```
---
titolo: Il titolo del foglio
data: 2026-11-07
tag: [video, montaggio]
copertina: immagini/foto.jpg
---
```

---

Una riga con tre trattini (`---`) disegna il separatore ondulato che vedi qui sopra.
