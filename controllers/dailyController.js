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
  // 社名
  const daily_sql1 = `select 
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
  // 勤怠情報
  const daily_sql2 = `select * from time_management where user_id = ${userId};`;
  const time_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql2)));
  // 名前
  const daily_sql3 = `select name from users where id = ${userId};`;
  const name_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql3)))[0];

  res.render("daily/daily.ejs", {com_info: com_info,time_info: time_info,name_info: name_info});
}

exports.getDailyEdit = async (req, res) => {
  const userId = req.session.userId;
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
  // 勤怠情報
  const daily_sql2 = `select * from time_management where user_id = ${userId};`;
  const time_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql2)));
  // 名前
  const daily_sql3 = `select name from users where id = ${userId};`;
  const name_info = JSON.parse(JSON.stringify(await mysql_query(connection, daily_sql3)))[0];
  res.render("daily/daily_edit.ejs", {com_info: com_info,time_info: time_info,name_info: name_info});
}

exports.getDailyComp = async (req, res) => {
  res.redirect('/daily');
}

exports.excelOutput = async (req, res) => {
  const r = req.body;

  const template_filename = "views/template/record.xlsx";
  const output_file = "daily.xlsx";

  const year_space = "J3";
  const year = 2022; // here variable
  const month_space = "M3";
  const month = 1; // here variable
  const dep_space = "J4";
  const dep = "技術開発部"; // here variable
  const name_space = "J5";
  const name = "鈴木頌弘"; // here variable
  const sttime_space = "B7";
  const edtime_space = "D7";
  const rest_space = "E7";
  const overtime_space = "F7";
  const midnight_space = "H8";
  const setting_sttime = 9.5 / 24;// 始業時刻のシリアル値
  const setting_edtime = 18 / 24;// 終業時刻のシリアル値
  const setting_rest = 1 / 24;// 休憩時間のシリアル値
  const setting_overtime = 8 / 24;// 休憩時間のシリアル値
  const setting_midnight = 22 / 24;// 休憩時間のシリアル値
  const serial = 1440;// シリアルの現段階の最大値(24 * 60)

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(template_filename);

  const sheet = workbook.worksheets[0];
  sheet.getCell(year_space).value = year;
  sheet.getCell(month_space).value = month;
  sheet.getCell(dep_space).value = JSON.stringify(dep).replace(/\"/g, "");
  sheet.getCell(name_space).value = JSON.stringify(name).replace(/\"/g, "");
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

  await workbook.xlsx.writeFile(output_file);
  console.log("output完了");
  res.send(workbook);
}