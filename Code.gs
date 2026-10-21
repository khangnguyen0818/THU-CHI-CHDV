/**
 * QUẢN LÝ THU CHI CĂN HỘ DỊCH VỤ – Backend Google Apps Script
 * Dán file này vào Tiện ích mở rộng → Apps Script của Google Sheet (file Code.gs),
 * tạo thêm file HTML tên "Index" và dán nội dung Index.html vào.
 *
 * Có thể quản lý nhiều NHÀ. Mỗi nhà, mỗi tháng có 3 trang tính:
 *   "<Nhà> - Phòng 2026-10", "<Nhà> - Chi phí 2026-10", "<Nhà> - Thu 2026-10".
 * Trang "TỔNG HỢP" ghi thu / chi / lợi nhuận từng nhà, từng tháng.
 * Trang ẩn "_CAU_HINH" lưu cấu hình cột, công thức, đơn giá của từng nhà / tháng.
 */

const TZ = 'Asia/Ho_Chi_Minh';
const CFG_SHEET = '_CAU_HINH';
const SUM_SHEET = 'TỔNG HỢP';
const HEAD_BG = '#a9d08e';
const CFG_HEAD = ['THANG', 'COT', 'THAM_SO', 'PHIEN_BAN', 'NGUOI_SUA', 'NHA', 'NGAN_HANG'];

// ===== Web App =====
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Quản lý căn hộ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('mobile-web-app-capable', 'yes');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏠 Căn hộ')
    .addItem('Mở app quản lý', 'moApp')
    .addToUi();
}

function moApp() {
  const url = ScriptApp.getService().getUrl();
  const html = url
    ? '<p style="font-family:sans-serif"><a href="' + url + '" target="_blank">👉 Mở app quản lý căn hộ</a></p>'
    : '<p style="font-family:sans-serif">Chưa triển khai Web App.<br>Vào Apps Script → Triển khai → Tùy chọn triển khai mới.</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(340).setHeight(100), 'Quản lý căn hộ');
}

// ===== API gọi từ app =====
/** Danh sách [{house, month}] của tất cả nhà. */
function apiDanhSach() {
  const v = cfgSheet_(ss_()).getDataRange().getValues();
  return v.slice(1)
    .map(r => ({ house: String(r[5] || ''), month: monthStr_(r[0]) }))
    .filter(x => x.house && x.month);
}

function apiTaiThang(house, month) {
  const ss = ss_();
  const f = findCfgRow_(cfgSheet_(ss), house, month);
  if (!f) return null;
  return {
    house: house,
    month: month,
    columns: JSON.parse(f.data[1] || '[]'),
    params: JSON.parse(f.data[2] || '[]'),
    bank: JSON.parse(f.data[6] || '{}'),
    rooms: readRooms_(ss, sheetName_(house, 'Phòng', month)),
    expenses: readTable_(ss, sheetName_(house, 'Chi phí', month), ['ngay', 'viec', 'so_tien', 'link', 'fixed']),
    incomes: readTable_(ss, sheetName_(house, 'Thu', month), ['viec', 'so_tien', 'link', 'fixed']),
    version: Number(f.data[3]) || 0,
    by: String(f.data[4] || '')
  };
}

function apiPhienBan(house, month) {
  const f = findCfgRow_(cfgSheet_(ss_()), house, month);
  return f ? Number(f.data[3]) || 0 : null;
}

function apiLuuThang(p) {
  const bad = checkHouseName_(p.house);
  if (bad) return { error: bad };
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const ss = ss_();
    const sh = cfgSheet_(ss);
    const f = findCfgRow_(sh, p.house, p.month);
    if (p.isNew && f) return { error: p.house + ' – tháng ' + p.month + ' đã tồn tại' };
    if (f && !p.isNew && !p.force && Number(f.data[3]) !== Number(p.version)) {
      return { conflict: true, by: String(f.data[4] || '') };
    }
    const version = Date.now();
    const who = Session.getActiveUser().getEmail() || '';

    writeRooms_(ss, sheetName_(p.house, 'Phòng', p.month), p);
    writeTable_(ss, sheetName_(p.house, 'Chi phí', p.month), ['NGÀY', 'VIỆC CHI', 'SỐ TIỀN', '_liên kết', '_cố định'],
      ['ngay', 'viec', 'so_tien', 'link', 'fixed'], p.expenses, 2, 1);
    writeTable_(ss, sheetName_(p.house, 'Thu', p.month), ['VIỆC THU', 'SỐ TIỀN', '_liên kết', '_cố định'],
      ['viec', 'so_tien', 'link', 'fixed'], p.incomes, 1, 0);
    writeSummary_(ss, p, who);

    const row = [p.month, JSON.stringify(p.columns), JSON.stringify(p.params), version, who, p.house, JSON.stringify(p.bank || {})];
    if (f) sh.getRange(f.row, 1, 1, CFG_HEAD.length).setValues([row]);
    else sh.appendRow(row);
    return { ok: true, version: version };
  } finally {
    lock.releaseLock();
  }
}

function apiXoaThang(house, month) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    deleteMonth_(ss_(), house, month);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Xóa một nhà cùng toàn bộ các tháng của nhà đó. */
function apiXoaNha(house) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = ss_();
    const months = apiDanhSach().filter(x => x.house === house).map(x => x.month);
    months.forEach(m => deleteMonth_(ss, house, m));
    return { ok: true, deleted: months.length };
  } finally {
    lock.releaseLock();
  }
}

function apiTongHop() {
  const sh = ss_().getSheetByName(SUM_SHEET);
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => r[0] !== '' && r[1] !== '')
    .map(r => ({ house: String(r[0]), month: monthStr_(r[1]), thu: Number(r[2]) || 0, chi: Number(r[3]) || 0, ln: Number(r[4]) || 0 }));
}

function apiNguoiDung() {
  return Session.getActiveUser().getEmail() || '';
}

// ===== Hàm nội bộ =====
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheetName_(house, kind, month) {
  return house + ' - ' + kind + ' ' + month;
}

function checkHouseName_(h) {
  h = String(h || '').trim();
  if (!h) return 'Thiếu tên nhà';
  if (h.length > 40) return 'Tên nhà tối đa 40 ký tự';
  if (/[\[\]*?\/\\:|']/.test(h)) return 'Tên nhà không được chứa các ký tự [ ] * ? / \\ : | \'';
  return '';
}

function monthStr_(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'yyyy-MM');
  return String(x || '').trim();
}

function cleanVal_(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'yyyy-MM-dd');
  return x;
}

function cellVal_(x) {
  return x === null || x === undefined ? '' : x;
}

function cfgSheet_(ss) {
  let sh = ss.getSheetByName(CFG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CFG_SHEET);
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange('F:F').setNumberFormat('@');
    sh.getRange(1, 1, 1, CFG_HEAD.length).setValues([CFG_HEAD]);
    sh.hideSheet();
  } else if (sh.getLastColumn() < CFG_HEAD.length) {
    sh.getRange(1, 1, 1, CFG_HEAD.length).setValues([CFG_HEAD]);
  }
  return sh;
}

function findCfgRow_(sh, house, month) {
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (monthStr_(v[i][0]) === month && String(v[i][5] || '') === house) return { row: i + 1, data: v[i] };
  }
  return null;
}

function deleteMonth_(ss, house, month) {
  ['Phòng', 'Chi phí', 'Thu'].forEach(k => {
    const sh = ss.getSheetByName(sheetName_(house, k, month));
    if (sh) ss.deleteSheet(sh);
  });
  const cfg = cfgSheet_(ss);
  const f = findCfgRow_(cfg, house, month);
  if (f) cfg.deleteRow(f.row);
  const sum = ss.getSheetByName(SUM_SHEET);
  if (sum) {
    const v = sum.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) {
      if (String(v[i][0]) === house && monthStr_(v[i][1]) === month) sum.deleteRow(i + 1);
    }
  }
}

function sheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureCols_(sh, n) {
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
}

/** Hàng 1 (ẩn) = mã cột, hàng 2 = tiêu đề, cuối cùng là hàng TỔNG. Cột cuối (ẩn) lưu các ô đã ghi đè công thức. */
function writeRooms_(ss, name, p) {
  const sh = sheet_(ss, name);
  const cols = p.columns;
  const keys = ['_STT'].concat(cols.map(c => c.key), ['_GHI_DE']);
  const labels = ['STT'].concat(cols.map(c => c.group ? c.group + ' - ' + c.label : c.label), ['(ô ghi đè)']);
  const rows = p.rooms.map((r, i) => [i + 1].concat(cols.map(c => cellVal_(r[c.key])), [(r._ovr || []).join(',')]));
  const tot = ['TỔNG'].concat(cols.map(c => c.sum ? p.rooms.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : ''), ['#TONG']);
  const all = [keys, labels].concat(rows, [tot]);

  sh.clear();
  ensureCols_(sh, keys.length);
  const rg = sh.getRange(1, 1, all.length, keys.length);
  const fmtRow = ['0'].concat(cols.map(c => c.type === 'text' ? '@' : '#,##0'), ['@']);
  rg.setNumberFormats(all.map((r, i) => i < 2 ? keys.map(() => '@') : fmtRow));
  rg.setValues(all);
  sh.getRange(2, 1, 1, keys.length).setFontWeight('bold').setBackground(HEAD_BG).setHorizontalAlignment('center').setWrap(true);
  sh.getRange(all.length, 1, 1, keys.length).setFontWeight('bold').setBackground(HEAD_BG);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(Math.min(3, keys.length));
  sh.hideRows(1);
  sh.hideColumns(keys.length);
}

function readRooms_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  if (v.length < 3) return [];
  const keys = v[0].map(String);
  const out = [];
  for (let i = 2; i < v.length; i++) {
    const o = {};
    let ovr = '';
    keys.forEach((k, j) => {
      if (k === '_GHI_DE') ovr = String(v[i][j] || '');
      else if (k && k[0] !== '_') o[k] = cleanVal_(v[i][j]);
    });
    if (ovr === '#TONG') continue;
    o._ovr = ovr ? ovr.split(',').filter(String) : [];
    out.push(o);
  }
  return out;
}

function writeTable_(ss, name, headers, fields, rows, moneyCol, labelCol) {
  const sh = sheet_(ss, name);
  const data = [headers].concat(rows.map(r => fields.map(f => f === 'fixed' ? (r.fixed ? 'TRUE' : '') : cellVal_(r[f]))));
  const tot = fields.map(() => '');
  tot[labelCol] = 'TỔNG';
  tot[moneyCol] = rows.reduce((s, r) => s + (Number(r.so_tien) || 0), 0);
  tot[fields.length - 1] = '#TONG';
  data.push(tot);

  sh.clear();
  ensureCols_(sh, fields.length);
  const rg = sh.getRange(1, 1, data.length, fields.length);
  rg.setNumberFormats(data.map((r, i) => fields.map((f, j) => (j === moneyCol && i > 0) ? '#,##0' : '@')));
  rg.setValues(data);
  sh.getRange(1, 1, 1, fields.length).setFontWeight('bold').setBackground(HEAD_BG).setHorizontalAlignment('center');
  sh.getRange(data.length, 1, 1, fields.length).setFontWeight('bold').setBackground(HEAD_BG);
  sh.setFrozenRows(1);
  sh.hideColumns(fields.length - 1, 2);
  sh.setColumnWidth(labelCol + 1, 220);
}

function readTable_(ss, name, fields) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const o = {};
    fields.forEach((f, j) => o[f] = cleanVal_(v[i][j]));
    if (o.fixed === '#TONG') continue;
    if (fields.every(f => o[f] === '' || o[f] === null)) continue;
    o.fixed = o.fixed === true || String(o.fixed).toUpperCase() === 'TRUE';
    out.push(o);
  }
  return out;
}

function writeSummary_(ss, p, who) {
  let sh = ss.getSheetByName(SUM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SUM_SHEET, 0);
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange('C:E').setNumberFormat('#,##0');
    sh.getRange('F:F').setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange(1, 1, 1, 7).setValues([['NHÀ', 'THÁNG', 'TỔNG THU', 'TỔNG CHI', 'LỢI NHUẬN', 'CẬP NHẬT', 'NGƯỜI SỬA']])
      .setFontWeight('bold').setBackground(HEAD_BG);
    sh.setFrozenRows(1);
  }
  const t = p.totals || {};
  const row = [p.house, p.month, t.thu || 0, t.chi || 0, t.ln || 0, new Date(), who];
  const v = sh.getDataRange().getValues();
  let r = -1;
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === p.house && monthStr_(v[i][1]) === p.month) r = i + 1;
  if (r > 0) sh.getRange(r, 1, 1, 7).setValues([row]);
  else sh.appendRow(row);
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, 7).sort([1, 2]);
}
