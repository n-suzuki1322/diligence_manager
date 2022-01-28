'use strict';
document.addEventListener('DOMContentLoaded', function() {
  jQuery(function($) {
    const time_info = JSON.parse(document.getElementById("time_info").value);
    const year_param = JSON.parse(document.getElementById("year").value);
      const month_param = JSON.parse(document.getElementById("month").value);
    $.extend( $.fn.dataTable.defaults, { 
      language: {
        url: "https://cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Japanese.json"
      } 
    }); 
    /* get monthly last day method*/
    const getDays = (y, m) => {
      return new Date(y, m, 0).getDate();
    };

    // 時間、分の計算をシリアルをしやすくするためのもの
    const getSerial = (date) => {
      return date.getHours() * 60 + date.getMinutes();
    }

    const sameDay = (a, b) => {
      const c = a.getFullYear() + a.getMonth() + a.getDate()
      const d = b.getFullYear() + b.getMonth() + b.getDate()
      return c === d ? true : false;
    }
    /* today is a day */
    const search_month = new Date();
    const year = search_month.getFullYear();
    const month = search_month.getMonth();
    const dayOfWeekStrJP = [ "日", "月", "火", "水", "木", "金", "土" ];

    /** monthly days count */
    const days = getDays(year, month + 1);

    let dates = [];
    for (let i = 0; i < days; i++) {
      const s = i+1;// 日にち取得
      const d_1 = new Date(year, month, s);
      const t = `<div id="day${d_1.getDay()}">${dayOfWeekStrJP[d_1.getDay()]}</div>`;// 曜日取得
      let st_time = '<input type="time" name="st_time">';
      let ed_time = '<input type="time" name="ed_time">';
      let work_hours = ``;
      let overworks = ``;
      let nightworks = ``;
      let absence = `<select id="absence${i+1}" name="absence"><option selected></option><option>◯</option></select>`;
      let holiday = `<select id="holiday${i+1}" name="holiday"><option selected></option><option>◯</option></select>`;
      let remarks = `<input type="text" value="" name="remarks">`;
      time_info.forEach(ele => {
        const from_t = new Date(ele.st_time);
        const to_t = new Date(ele.ed_time);
        if (sameDay(d_1, from_t) && sameDay(d_1, to_t)) {
          // work hours
          const h = Math.floor((getSerial(to_t) - getSerial(from_t) - 60) / 60);
          const m = (getSerial(to_t) - getSerial(from_t) - 60) % 60;
          work_hours = `${('00'+h).slice(-2)}:${('00'+m).slice(-2)}`;
          overworks = "00:00";
          nightworks = "00:00";
          if (getSerial(to_t) > 1320) {
            //nightworks
            const night_h = Math.floor((getSerial(to_t) - 60 * 22) / 60);
            const night_m = (getSerial(to_t) - 60 * 22) % 60;
            nightworks = `${('00'+night_h).slice(-2)}:${('00'+night_m).slice(-2)}`;
            // overworks
            const over = 60 * 13 - getSerial(from_t);
            if (over > 0) {
              const over_h = Math.floor(over/ 60);
              const over_m = over % 60;
              overworks = `${('00'+over_h).slice(-2)}:${('00'+over_m).slice(-2)}`;
            }
          } else {
            const over = getSerial(to_t) - getSerial(from_t) - 60 * 9;
            if(over > 0) {
              const over_h = Math.floor(over/ 60);
              const over_m = over % 60;
              overworks = `${('00'+over_h).slice(-2)}:${('00'+over_m).slice(-2)}`;
            }
          }
          ele.absence !== 1 ? "" : absence = `<select id="absence${i+1}" name="absence"><option></option><option selected>◯</option></select>`;
          ele.holiday !== 1 ? "" : holiday = `<select id="holiday${i+1}" name="holiday"><option></option><option selected>◯</option></select>`;
          remarks = `<input type="text" name="remarks" value=${ele.remarks ? ele.remarks : ""}>`;
        }
        if (sameDay(d_1, from_t)) {
          st_time = `<input type="time" name="st_time" value=${String(from_t).match(/\d{2}:\d{2}/)[0]}>`;
        }
        if(sameDay(d_1, to_t)) {
          ed_time = `<input type="time" name="ed_time" value=${String(to_t).match(/\d{2}:\d{2}/)[0]}>`;
        }
      });
      dates.push([
        s,  //日にち
        t, // 曜日
        st_time,  // 出勤時刻
        ed_time,  // 退勤時刻
        work_hours,  // 実労働時間
        overworks,  // 残業時間
        nightworks,  // 深夜勤務
        absence,  // 欠勤 
        holiday,  // 有給
        remarks,  // 備考
      ]);
    }
    $("#daily-table").DataTable({
      buttons: ['csv', 'excel', 'pdf', 'print'],
      data: dates,
      searching: false,
      info: false,
      searching: false,
      ordering: false,
      lengthChange: false,
      displayLength: 31,
      paging: false,
      width: "10px",
      columnDefs :[
        {targets:'_all',className : 'dt-body-center'},
      ],
    })
  })
})

setTimeout(() => {
  const day0 = document.querySelectorAll('#day0');
  const day6 = document.querySelectorAll('#day6');
  day0.forEach(d => {
    d.parentNode.parentNode.classList.add('rest');
  });
  day6.forEach(d => {
    d.parentNode.parentNode.classList.add('rest');
  });
}, 100);