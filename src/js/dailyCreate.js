'use strict';
jQuery(function($) {
  const time_info = JSON.parse(document.getElementById("time_info").value);
  $.extend( $.fn.dataTable.defaults, { 
    language: {
      url: "https://cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Japanese.json"
    } 
  }); 
  /* get monthly last day method*/
  const getDays = (y, m) => {
    return new Date(y, m, 0).getDate();
  };

  const sameDay = (a, b) => {
    const c = a.getFullYear() + a.getMonth() + a.getDate()
    const d = b.getFullYear() + b.getMonth() + b.getDate()
    return c === d ? true : false;
  }

  /* today is a day */
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();
  const dayOfWeekStrJP = [ "日", "月", "火", "水", "木", "金", "土" ];

  /** monthly days count */
  const days = getDays(year, month + 1);

  let dates = [];
  for (let i = 0; i < days; i++) {
    const s = i+1;// 日にち取得
    const d_1 = new Date(year, month, i+1);
    const t = dayOfWeekStrJP[d_1.getDay()];// 曜日取得
    let st_time = '';
    let ed_time = '';
    let work_hours = "00:00";
    let night_work_hours = "0:00";
    let absence = "";
    let holiday = "";
    let remarks = "";
    time_info.forEach(ele => {
      const from_t = new Date(ele.st_time);
      const to_t = new Date(ele.ed_time);
      if (sameDay(d_1, from_t) && sameDay(d_1, to_t)) {
        const work_milliseconds = to_t.getTime() - from_t.getTime();
        const h = Math.floor(work_milliseconds / (60 * 60 * 1000));
        const m = Math.ceil((work_milliseconds - h * 60 * 60 * 1000) / 60000);
        /* 実労働時間取得(現状: 秒単位切り上げ)*/
        work_hours = `${('00'+h).slice(-2)}:${('00'+m).slice(-2)}`;

        const night_work_milliseconds = to_t.getTime() - d_1.setHours(22);
        if (night_work_milliseconds > 0) {
          const h_2 = Math.floor(night_work_milliseconds / (60 * 60 * 1000))
          const m_2 = Math.floor((night_work_milliseconds - h_2 * 60 * 60 * 1000) / 60000);
          /* 深夜勤務時間取得*/
          night_work_hours = `${h_2}:${('00'+m_2).slice(-2)}`;
        }
        ele.absence === 0 ? "" : absence = "悪霊に取り憑かれた";
        ;
        ele.holiday === 0 ? "" : holiday = "有給パラダイス";
        remarks = ele.remarks;
      }
      if (sameDay(d_1, from_t)) {
        st_time = String(from_t).match(/\d{2}:\d{2}/)[0];
      }
      if(sameDay(d_1, to_t)) {
        ed_time = String(to_t).match(/\d{2}:\d{2}/)[0];
      }
      
    });
    dates.push([
      s,  //日にち
      t, // 曜日
      st_time,  // 出勤時刻
      ed_time,  // 退勤時刻
      work_hours,  // 実労働時間
      '0:00',  // 残業時間
      night_work_hours,  // 深夜勤務
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
    pagingType: "simple",
    width: "10px"
  })
})