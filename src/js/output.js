'use strict';

  
const downloadCSV = (filename) => {
  const daily_table = document.getElementById('daily-table');
  let escaped = /,|\r?\n|\r|"/;
  let e = /"/g;
  
  // データ作成
  let bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8BOMあり
  let csv = [], row = [], field, r, c;
  for (r = 0;  r < daily_table.rows.length; r++) {
    row.length = 0;
    for (c = 0; c < daily_table.rows[r].cells.length; c++) {
      field = daily_table.rows[r].cells[c].textContent;
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

window.onlaod = () => {
  const daily_tbody = document.getElementById("daily-tbody");
}

const downloadExcel = () => {
  const year = document.getElementById('year').value;
  const month = document.getElementById('month').value;
  const url = `/api/excel_output/year=${year}/month=${month}`;
  const method = 'POST';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  /**create json */
  let body_arr = [];
  let n = 0;
  const rows = daily_tbody.rows.length;
  while (n != rows) {
    const tr = daily_tbody.rows[n];
    const temp = {
      start: tr.cells[2].innerHTML,
      end: tr.cells[3].innerHTML,
      absence: tr.cells[7].innerHTML,
      holiday: tr.cells[8].innerHTML,
      remarks: tr.cells[9].innerHTML
    }
    body_arr.push(temp);
    n++;
  }
  const body = JSON.stringify(body_arr);

  fetch(url, { 
    method: method,
    headers: headers,
    body: body
  })
  .then( async (res) => {
    console.log(res);
    // const url = (window.URL || window.webkitURL).createObjectURL(blob);
    // const output_file = "daily.xlsx";
    // const download = document.createElement("a");
    // download.href = url;
    // download.download = output_file;
    // download.click();
    // (window.URL || window.webkitURL).revokeObjectURL(url);
    

    // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // res.setHeader("Content-Disposition", "attachment; filename=" + output_file);

    await workbook.xlsx.write(res);

    res.end();
  }).catch(console.error);
  
};


