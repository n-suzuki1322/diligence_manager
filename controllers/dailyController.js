const mysql = require('mysql');
const exceljs = require("exceljs");

// mysqlに接続
const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  multipleStatements: true
})

const mysql_query = (connection, sql, values) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results, fields) => {
      if (err) {
        console.log(err)
        reject({ dataExists: false, reason: err })
      } else resolve(results, fields)
    })
  })
}

// 日時勤怠
exports.getDaily = async (req, res) => {
  const userId = req.session.userId;
  const year = req.params.year | 0;
  const month = req.params.month | 0;
  const date = new Date(year, month + 1, 0) ;
  const lastDay = date.getDate();

  // 社名
  const daily_sql1 = `
  select 
  com.id, com.name
  from 
  company com left join (
  select 
  gu.dep_id, gu.user_id, dep.comp_id, dep.name 
  from 
  group_users gu left join 
  deployment dep on gu.dep_id=dep.id
  ) as st on com.id = st.comp_id where st.user_id = ${userId} order by com.id desc limit 1;
  `;
  const com_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql1)))[0];
  // 勤怠情報(月間)
  const daily_sql2 = `
  select 
  date, st_time, ed_time, absence, holiday, remarks
  from 
  time_management 
  where user_id = ${userId} 
  and 
  date between "${year}-${('00'+String(month+1)).slice(-2)}-01" and "${year}-${('00'+String(month+1)).slice(-2)}-${lastDay}";`;
  const time_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql2)));
  console.log(time_info);
  // 名前
  const daily_sql3 = `select name from users where id = ${userId};`;
  const name_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql3)))[0];
  res.render("daily/daily.ejs", {com_info: com_info, time_info: time_info, name_info: name_info, year: year, month: month});
}

exports.getDailyEdit = async (req, res) => {
  const userId = req.session.userId;
  const year = req.params.year | 0;
  const month = req.params.month | 0;
  const date = new Date(year, month + 1, 0) ;
  const yearAndMonth = `${year}-${('00'+String(month+1)).slice(-2)}`;
  const lastDay = date.getDate();

  // 社名
  const daily_sql1 = `
  select 
  com.id, com.name
  from 
  company com left join (
  select 
  gu.dep_id, gu.user_id, dep.comp_id, dep.name 
  from 
  group_users gu left join 
  deployment dep on gu.dep_id=dep.id
  ) as st on com.id = st.comp_id where st.user_id = ${userId} order by com.id desc limit 1;
  `;
  const com_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql1)))[0];
  // 勤怠情報(月間)
  const daily_sql2 = `
  select date, st_time, ed_time, absence, holiday, remarks
  from 
  time_management 
  where user_id = ${userId} 
  and 
  date between "${yearAndMonth}-01" and "${yearAndMonth}-${lastDay}";`;
  const time_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql2)));
  // 名前
  const daily_sql3 = `select name from users where id = ${userId};`;
  const name_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql3)))[0];
  res.render("daily/daily_edit.ejs", {com_info: com_info, time_info: time_info, name_info: name_info, year: year, month: month});
}

exports.getDailyComp = async (req, res) => {
  const r = JSON.parse(JSON.stringify(req.body));
  const userId = req.session.userId;
  const year = req.params.year | 0;
  const month = req.params.month | 0;
  const month_length = r.st_time.length;

  let n = 0;
  let integrated_sql = "";


  while (n != month_length) {
    const date = `${year}-${('00'+String(month+1)).slice(-2)}-${('00'+String(n+1)).slice(-2)}`;
    let st_time_val = null;
    let ed_time_val = null;
    let absence_val = 0;
    let holiday_val = 0;
    let remarks_val = null;
    const check_sql  = `select * from time_management where date = '${date}' and user_id = ${userId};`;
    const result = JSON.parse(JSON.stringify(await mysql_query(connection, check_sql)));
    if (result.length === 0) {
      if (r.st_time[n] != "") {
        st_time_val = `'${date} ${r.st_time[n]}:00'`;
      }
      if (r.ed_time[n] != "") {
        ed_time_val = `'${date} ${r.ed_time[n]}:00'`;
      }
      if (r.absence[n] != "") {
        absence_val = 1;
      }
      if (r.holiday[n] != "") {
          holiday_val = 1;
      }
      if (r.remarks[n] != "") {
          remarks_val = r.remarks[n];
      }
      if (r.st_time[n] != "" || r.ed_time[n] != "" || r.absence[n] != "" || r.holiday[n] != "" || r.remarks[n] != "") {
        if (r.remarks[n] != "") {
          integrated_sql  += `
          insert 
          into 
          time_management (
            user_id, 
            date,
            st_time, 
            ed_time, 
            absence, 
            holiday, 
            remarks
          ) values (${userId}, '${date}', ${st_time_val}, ${ed_time_val}, ${absence_val}, ${holiday_val}, '${remarks_val}');
          `;
        } else {
          integrated_sql  += `
          insert 
          into 
          time_management (
            user_id, 
            date,
            st_time, 
            ed_time, 
            absence, 
            holiday, 
            remarks
          ) values (${userId}, '${date}', ${st_time_val}, ${ed_time_val}, ${absence_val}, ${holiday_val}, null);
          `;
        }
      }
    } else {
      if (r.st_time[n] != "") {
        st_time_val = `'${date} ${r.st_time[n]}:00'`;
      }
      if (r.ed_time[n] != "") {
        ed_time_val = `'${date} ${r.ed_time[n]}:00'`;
      }
      if (r.absence[n] != "") {
        absence_val = 1;
      }
      if (r.holiday[n] != "") {
          holiday_val = 1;
      }
      if (r.remarks[n] != "") {
          remarks_val = r.remarks[n];
      }
      if (r.remarks[n] != "") {
        integrated_sql  += `
        update time_management 
        set 
        st_time = ${st_time_val},
        ed_time = ${ed_time_val}, 
        absence = ${absence_val}, 
        holiday = ${holiday_val}, 
        remarks = '${remarks_val}'
        where 
        date = '${date}'
        and 
        user_id = ${userId};
        `;
      } else {
        integrated_sql  += `
        update time_management 
        set 
        st_time = ${st_time_val},
        ed_time = ${ed_time_val}, 
        absence = ${absence_val}, 
        holiday = ${holiday_val}, 
        remarks = null
        where 
        date = '${date}'
        and 
        user_id = ${userId};
        `;
      }
    }
    n++;
  }

  integrated_sql != "" ? await mysql_query(connection, integrated_sql) : "";
  res.redirect(`/daily/year=${year}/month=${month}`);
}

exports.excelOutput = async (req, res) => {
  const r = req.body;
  const userId = req.session.userId;
  const serial = 1440;// シリアルの現段階の最大値(24 * 60)
  const dep_sql = `select dep.name from deployment dep left join group_users gu on dep.id = gu.dep_id where gu.user_id = ${userId};`;
  
  const template_filename = "views/template/record.xlsx";
  // const output_file = "daily.xlsx";
  
  const year_space = "J3";
  const year = req.params.year | 0;
  const month_space = "M3";
  const month = req.params.month | 0;
  const dep_space = "J4";
  const dep = JSON.parse(JSON.stringify(await mysql_query(connection, dep_sql)))[0].name;
  const username_space = "J5";
  const username = req.session.name;
  const sttime_space = "B7";
  const setting_sttime = 9.5 / 24;// 始業時刻のシリアル値
  const edtime_space = "D7";
  const setting_edtime = 18 / 24;// 終業時刻のシリアル値
  const rest_space = "E7";
  const setting_rest = 1 / 24;// 休憩時間のシリアル値
  const overtime_space = "F7";
  const setting_overtime = 8 / 24;// 休憩時間のシリアル値
  const midnight_space = "H8";
  const setting_midnight = 22 / 24;// 休憩時間のシリアル値

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(template_filename);

  const sheet = workbook.worksheets[0];
  sheet.getCell(year_space).value = year;
  sheet.getCell(month_space).value = month + 1;
  sheet.getCell(dep_space).value = JSON.stringify(dep).replace(/\"/g, "");
  sheet.getCell(username_space).value = JSON.stringify(username).replace(/\"/g, "");
  sheet.getCell(sttime_space).value = setting_sttime;
  sheet.getCell(edtime_space).value = setting_edtime;
  sheet.getCell(rest_space).value = setting_rest;
  sheet.getCell(overtime_space).value = setting_overtime;
  sheet.getCell(midnight_space).value = setting_midnight;

  let n = 0;
  while(n != r.length) {
    const daily_start_place = `D${n+10}`;
    const daily_end_place = `E${n+10}`;
    const absence_place = `I${n+10}`;
    const holiday_place = `J${n+10}`;
    const remarks_place = `K${n+10}`;
    let sttime;
    let edtime;
    const sttime_arr = r[n].start.split(':').map(Number);
    const edtime_arr = r[n].end.split(':').map(Number);
    if(sttime_arr.length === 2 ) {
      sttime = (sttime_arr[0] * 60 + sttime_arr[1]) / serial;
    }
    if(edtime_arr.length === 2 ) {
      edtime = (edtime_arr[0] * 60 + edtime_arr[1]) / serial;
    }
    sheet.getCell(daily_start_place).value = sttime;
    sheet.getCell(daily_end_place).value = edtime;
    sheet.getCell(absence_place).value = r[n].absence.replace(/ /g, "");
    sheet.getCell(holiday_place).value = r[n].holiday.replace(/ /g, "");
    sheet.getCell(remarks_place).value = r[n].remarks.replace(/ /g, "");
    n++;
  }
  const output_file = `出勤簿(${year}年${month+1}月).xlsx`;

  // JSON.stringify(workbook, decycle());
  await workbook.xlsx.writeFile(output_file);
  console.log("output完了");
  res.send(workbook);
}