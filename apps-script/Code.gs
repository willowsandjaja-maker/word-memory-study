/**
 * Word Memory Study — Google Sheets receiver.
 * Bound to the results spreadsheet (Extensions → Apps Script).
 * Deploy as a Web app: Execute as "Me", Who has access "Anyone".
 *
 * The site sends each participant's row as a GET request:
 *   ?callback=<fn>&payload=<JSON {"row":[...]}>
 * and the script answers with JavaScript that calls <fn>({ok:true}) or <fn>({ok:false,error:"..."}),
 * so the page knows whether the row was really saved.
 * doPost is kept so older copies of the page still work.
 */
const SHEET_NAME = 'Responses';

const CONDS = ['Silence', 'Pink noise', 'Lyrical'];
const HEADERS = [
  'Timestamp (UTC)', 'Participant', 'Order (researcher only)',
  'Silence score', 'Pink noise score', 'Lyrical score',
]
  .concat(...CONDS.map(n => [
    `${n}: how often study with`, `${n}: like (1-5)`, `${n}: heard before`, `${n}: times heard`,
  ]))
  .concat(['Name', 'Age', 'Gender', 'English first language'])
  .concat(...CONDS.map(n => [
    `${n} position`, `${n} word list`, `${n} correct words`, `${n} intrusions`, `${n} typed`, `${n} recall time (s)`,
  ]));

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = /^[A-Za-z_$][\w$]{0,63}$/.test(p.callback || '') ? p.callback : null;
  const result = p.payload ? saveRow(p.payload) : { ok: true, columns: HEADERS.length };
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(result)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json(result);
}

function doPost(e) {
  return json(saveRow(e && e.postData ? e.postData.contents : ''));
}

function saveRow(raw) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const row = JSON.parse(raw).row;
    if (!Array.isArray(row) || row.length !== HEADERS.length) {
      return { ok: false, error: `expected ${HEADERS.length} columns, got ${row && row.length}` };
    }
    // Prefix strings that look like formulas so participant text can't run as a formula.
    const safe = row.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v);
    getSheet().appendRow(safe);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
