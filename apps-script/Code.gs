/**
 * Word Memory Study — Google Sheets receiver.
 * Bound to the results spreadsheet (Extensions → Apps Script).
 * Deploy as a Web app: Execute as "Me", Who has access "Anyone".
 * The site POSTs {"row":[...]} as text/plain; one row is appended per participant.
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

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const row = body.row;
    if (!Array.isArray(row) || row.length !== HEADERS.length) {
      return json({ ok: false, error: `expected ${HEADERS.length} columns, got ${row && row.length}` });
    }
    const sheet = getSheet();
    // Prefix strings that look like formulas so participant text can't run as a formula.
    const safe = row.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v);
    sheet.appendRow(safe);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, columns: HEADERS.length });
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
