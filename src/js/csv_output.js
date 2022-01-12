'use strict';

  
const downloadCSV = (table, filename) => {
  let escaped = /,|\r?\n|\r|"/;
  let e = /"/g;
  
  // データ作成
  let bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8BOMあり
  let csv = [], row = [], field, r, c;
  for (r = 0;  r < table.rows.length; r++) {
    row.length = 0;
    for (c = 0; c < table.rows[r].cells.length; c++) {
      field = table.rows[r].cells[c].textContent;
      row.push(escaped.test(field)? '"'+field.replace(e, '""')+'"': field);
    }
    csv.push(row.join(','));
  }
  
  //var blob = new Blob([/*bom, */csv.join('\n')], {'type': 'text/csv'}); // BOMなし
  var blob = new Blob([bom, csv.join('\n')], {'type': 'text/csv'});
  
  // 保存
  if (window.navigator.msSaveBlob) {
    // IE用(保存 or 開く保存)
    window.navigator.msSaveBlob(blob, filename); 
  } else {
    const url = (window.URL || window.webkitURL).createObjectURL(blob);
    const download = document.createElement("a");
    download.href = url;
    download.download = filename;
    download.click();
    (window.URL || window.webkitURL).revokeObjectURL(url);
  }
}
  
  
  