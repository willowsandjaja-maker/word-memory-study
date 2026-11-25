# Word Memory Study — Handoff

A CogSci class experiment (CCA) on how background audio affects short-term memory.
Participants open the website themselves, on their own device, with headphones.
Each participant does the same word-recall test under three audio conditions,
in a random order that is **never shown to them**. Their results are saved as one
row per participant in a Google Sheet that the researcher (Willow) reads afterwards.

The site is finished and works end to end. **What's left is deploying it and
connecting it to the Google Sheet.**

---

## Status (updated 2026-11-24)

**Done**
- Local preview: `.claude/launch.json` (in the parent folder `cogsci final/`) serves the site at
  `http://localhost:8080` with `python3 -m http.server 8080 -d word-memory-study`.
- A full test run on localhost passed (timing temporarily at `SECS=0.3`, now back to `3`):
  - All 3 conditions run. Pink noise played `pink-noise.mp3`, Lyrical played `lyrical.mp3`, Silence played nothing.
    Audio stopped when the recall screen opened.
  - After each recall screen, the questionnaire for that condition appears with the right wording.
    Silence only gets Q1–Q2, and Q3–Q4 are saved as `N/A`.
  - Lists A/B/C went to positions 1/2/3, with words shuffled within each list. Scoring and intrusions worked.
  - The thank-you screen showed the expected "couldn't save" message, because no endpoint is set yet.
    The result was queued in `wms_queue`, and that test entry was then cleared.
- Randomization check: 60,000 draws of the order code gave each of the 6 orders 9,871–10,206 times
  (expected 10,000 each).

**Not done yet**
- `SHEET_ENDPOINT` is still `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE`. Willow has the setup steps (task 1 below)
  and the `Code.gs` contents. Next step: she pastes in the Web app URL.
- No public hosting yet; it's localhost only for now. No hosting CLIs are installed (no gh, netlify, vercel or
  wrangler, and no Homebrew). The easiest option is Netlify Drop: drag a folder containing only `index.html` + `audio/`
  onto app.netlify.com/drop.
- No end-to-end check that a row actually lands in the sheet.

---

## Folder contents

```
word-memory-study/
├── index.html            the whole site (HTML + CSS + JS, no build step, no dependencies)
├── audio/
│   ├── pink-noise.mp3    pink noise condition (~3.5 MB, 3:35, loops)
│   └── lyrical.mp3       lyrical music condition (~2.7 MB, 2:53, loops)
├── apps-script/
│   └── Code.gs           Google Apps Script that receives results and appends them to the sheet
└── HANDOFF.md            this file
```

The only external request the page makes is for the Google Font "Jost"
(it falls back to Avenir / system sans-serif).

---

## Tasks for Claude Code

1. **Set up the Google Sheet receiver** (the researcher has to do the Google parts in her browser, so walk her through them):
   - Create a blank Google Sheet, e.g. "Word Memory Study — Results".
   - In that sheet: **Extensions → Apps Script**. Replace the default code with `apps-script/Code.gs`. Save.
   - **Deploy → New deployment → Web app**. Set *Execute as*: **Me**, and *Who has access*: **Anyone**. Deploy, authorize, and copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).
   - Check it: opening the URL in a browser should return `{"ok":true,"columns":39}`.
2. **Connect the site**: in `index.html`, set `SHEET_ENDPOINT` (top of the `<script>`) to that Web app URL.
3. **Host the site** as a static site over HTTPS. GitHub Pages, Netlify, Vercel or Cloudflare Pages all work. Upload the folder exactly as it is, keeping `audio/` next to `index.html`. Don't upload `apps-script/` (it does no harm, but it isn't needed).
4. **Test end to end** on the hosted URL. Do one full run and confirm that a `Responses` tab appears in the sheet, with a bold, frozen header row and one data row.
   - For a faster test, temporarily set `const SECS=3` to `0.3`. Put it back to `3` afterwards.
   - Delete the test row before real participants start.
5. Give the researcher the final public URL to send to participants.

Do **not** change the experiment design (word lists, timing, question wording, conditions, order logic) without asking the researcher. Those are her methodological choices.

---

## Participant flow

1. **Welcome** (yellow): explains the study, about 10 minutes, headphones on. It does not mention the conditions.
2. **About you**: age (16–99, required), gender (Woman / Man / Non-binary / Self-describe + optional text / Prefer not to say), "Is English your first language?" (Yes / No).
3. **Instructions** (yellow, "Word Test — Memorize as many words as you can!!"): words appear one at a time every 3 seconds; memorize as many as possible; type them at the end; this happens 3 times.
4. **For each of the 3 tests:**
   1. "Test N of 3" screen with a **Start** button. The click is also what lets the browser play audio, since autoplay needs a user gesture.
   2. On Start, that condition's audio begins (or nothing, for silence). Then a 3-2-1 countdown, then **16 words**, one every **3 s**, big bold black text on white, with a progress bar along the bottom. Audio loops and plays **only during the countdown and the words**.
   3. Audio stops. **Recall screen**: a free-text box (words separated by commas or new lines). Submitting it empty asks the participant to confirm.
   4. **Questionnaire about that condition** ("X" is filled in after the test):
      1. How often do you study with X? *Often / Once in a while / Occasionally / Once or twice / Never*
      2. How do you like X? *1–5* (1 = not at all, 5 = very much)
      3. Have you heard X before taking this experiment? *Yes / No*
      4. How many times have you heard X? *Often / Once in a while / Occasionally / Never*
      - X = "the steady noise you just heard (pink noise)" / "the song you just heard" / "silence (no background sound)".
      - **Silence only gets Q1–Q2.** Q3–Q4 are recorded as `N/A`.
5. **Thank you**: sends the results. On failure it shows a "Try again" button and keeps the result in `localStorage` (`wms_queue`). Any queued results are re-sent automatically the next time the page is opened on that device.

The participant never chooses or sees their condition order. No scores are shown to them.

---

## Experiment design details

- **Conditions:** `S` Silence, `P` Pink noise (`audio/pink-noise.mp3`), `L` Lyrical (`audio/lyrical.mp3`).
- **Order:** picked uniformly at random on page load from all 6 permutations (`ORDERS`), using `crypto.getRandomValues`. It is recorded in the sheet only.
- **Word lists:** three lists of 16 unrelated concrete nouns (`LISTS.A/B/C`, all distinct). The list is tied to **test position**: the 1st test always uses A, the 2nd B, the 3rd C. Because the condition order is random, each list ends up paired with every condition across participants. Within a list, word order is shuffled for every participant.
- **Participant ID:** anonymous random code, `P-XXXXXX`, generated on page load. No names or emails are collected.
- **Scoring:** case-insensitive, letters only. A typed word matches a list word exactly, or after removing a trailing `S`/`ES` (plurals). Repeated words count once. Anything else counts as an *intrusion*. Misspellings count as intrusions, so the raw typed text is saved for re-scoring by hand.

---

## Data: one row per participant (39 columns, sheet tab `Responses`)

| # | Column | Notes |
|---|---|---|
| 1 | Timestamp (UTC) | ISO 8601 |
| 2 | Participant | `P-XXXXXX` |
| 3 | Order (researcher only) | e.g. `Lyrical → Silence → Pink noise` |
| 4–6 | Silence / Pink noise / Lyrical score | 0–16 correct |
| 7–18 | For each condition (Silence, Pink noise, Lyrical): how often study with, like (1-5), heard before, times heard | like is a number; Silence's heard / times are `N/A` |
| 19–21 | Age, Gender, English first language | |
| 22–39 | For each condition: position (1–3), word list (A/B/C), correct words, intrusions, typed (raw), recall time (s) | |

The column order is defined in **two places that must match**: `toRow()` in `index.html`
and `HEADERS` in `Code.gs`. The script rejects rows whose length isn't 39. If you add or remove a
column, update both and redeploy the Apps Script (**Deploy → Manage deployments → Edit → New version**,
so the URL stays the same).

---

## Technical notes and gotchas

- **Why `mode:'no-cors'` + `text/plain`:** Apps Script web apps can't answer CORS preflight requests. A `text/plain` POST avoids the preflight. With `no-cors` the response is opaque, so the page **can't see whether the script succeeded**. It only detects network failures. Sheet-side errors (for example a column-count mismatch) show up in Apps Script → **Executions**. If you want real confirmation, one option is a JSONP or `GET` ping, but keep it simple unless it's needed.
- **Formula injection:** `Code.gs` prefixes any cell starting with `= + - @` with `'`, so participant text can't run as a formula.
- **Concurrency:** `Code.gs` uses `LockService`, so simultaneous submissions don't clash.
- **Audio:** files are preloaded and set to `loop`. If a participant's audio fails to play (`play()` is rejected), the test still runs silently. Consider logging that as a column if it matters to the researcher (ask first).
- **Mobile:** the layout works down to 360 px wide, but the study is meant for a laptop with headphones. You could add a gentle "use a laptop with headphones" note on the welcome screen if the researcher wants one.
- **Duplicate submissions:** a participant who reloads and redoes the study gets a new ID and a new row. If needed, a `localStorage` flag could block retakes on the same device (ask the researcher).
- **Out of scope / removed on purpose:** an earlier version had a researcher setup screen and a "Saved sessions" table. Both were removed, because participants now open the site themselves.
