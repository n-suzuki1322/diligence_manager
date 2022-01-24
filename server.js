const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 4649;
const dotenv = require("dotenv");
dotenv.config();

//passwordをhash化した時の文字数
const SALT = 10;

// manage session
const session = require("express-session");
const { json, status } = require("express/lib/response");

app
.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
)
.use(express.json())
.use(express.urlencoded({ extended: false }))
.use(express.static('src'))
.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.name = req.session.name;
    res.locals.email = req.session.email;
    res.locals.isLoggedIn = true;
  } else {
    res.locals.isLoggedIn = false;
  }
  next();
});

// to access mysql
const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  multipleStatements: true
});

// 接続したDB確認
console.log('host ' + process.env.HOST);
console.log('user ' + process.env.DBUSER);
console.log('password ' + process.env.PASSWORD);
console.log('database ' + process.env.DATABASE);

// json change
function jsonCh(data) {
  return Object.values(JSON.parse(JSON.stringify(data)));
}

// check the connection
connection.connect((err) => {
  err ? console.log('error connecting → ' + err.stack) : console.log('mysql connecting');
});

const mysql_query = (connection, sql, values) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results, fields) => {
      err ? reject({ dataExists: false, reason: err }) : resolve(results, fields);
    });
  });
};

//ルーティングでセッション確認分岐
function checkSession(req, res, next) {
  if (!req.session.userId) {
    res.redirect('/');
  } else {
    next();
  }
}


app
.get('/', (req, res) => {
  const userId = req.session.userId;
  const name = req.session.name;
  if (userId) {
    res.render("stamp.ejs", { userId: userId, name: name });
  } else {
    res.render("home.ejs");
  }
})

.get('/signin', (req, res) => {
  res.render("singin.ejs");
})

// signin
.post('/api/signin', (req, res) => {
  const r = req.body;
  const email = r.email;
  const password = r.password;
  console.log(`signin email = ${email}`);
  console.log(`signin password = ${password}`);
  connection.query(
    "SELECT * FROM users WHERE email = ?;",
    [email],
    (error, result) => {
      if (error) {
        console.log("maybe send wrong password or email");
        res.redirect('/signin');
      }
      if (result.length > 0) {
        const hash = result[0].password;
        bcrypt.compare(password, hash, (error, isEqual) => {
          if (isEqual) {
            req.session.userId = result[0].id;
            req.session.name = result[0].name;
            req.session.email = result[0].email;
            console.log(`session userId = ${req.session.userId}`);
            console.log(`session username = ${req.session.name}`);
            res.redirect('/');
          } else {
            console.log(`error is ${error}`);
            res.redirect('/signin');
          }
        });
      } else {
        res.redirect('/signin');
      }
    }
  );
})

//　打刻の打刻による...
.post('/api/stamp', async (req, res) => {
  const r = req.body;
  const userId = req.session.userId;

  if (r.action === "start") {
    // 出勤ボタンが押されたらの処理
    const invalid_sstamp_sql = `select * from time_management where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_sresult = await mysql_query(connection, invalid_sstamp_sql, userId);
    if (invalid_sresult[0]) {  // 既に出勤打刻してあったらinsertしない
      console.log("もう十分に出勤されています");
      res.redirect('/');
    } else {  // その日の分が打刻されていなかったらinsert
      const sstamp_sql = "insert into time_management (user_id, st_time) VALUES(?, now());";
      const result = await mysql_query(connection, sstamp_sql, userId);
      console.log("insert result↓");
      result ? console.log(result) : console.log("internal server error(仮)");
      res.status(200);
      res.redirect('/');
    }
  } else {  // 退勤ボタンが押されたらの処理
    const invalid_estamp_sql = `select * from time_management where user_id = ? and date_format(ed_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_estamp_sql2 = `select * from time_management where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_eresult = await mysql_query(connection, invalid_estamp_sql, userId);
    const invalid_eresult2 = await mysql_query(connection, invalid_estamp_sql2, userId);
    if (invalid_eresult[0]) { // もう既に退勤してる場合
      console.log("もう退勤してるってば!");
      res.redirect('/');
    } else if (invalid_eresult2[0]) { // 出勤打刻されているandまだ退勤がされていなかった場合
      const estamp_sql = `update time_management set ed_time = now() where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
      const result = await mysql_query(connection, estamp_sql, userId);
      console.log("update result ↓");
      result ? console.log(result) : console.log("internal server error");
      res.status(200);
      res.redirect('/');
    } else { // 出勤打刻されていない
      console.log("まずは出勤してみてほしい");
      res.redirect('/');
    }
  }
})

// 日時勤怠
.get('/daily', checkSession, async (req, res) => {
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

  res.render('daily.ejs', { com_info: com_info, time_info: time_info, name_info: name_info });
})

// signup page
.get('/signup', (req, res) => {
  res.render("signup.ejs", { errors: [] });
})

// signup part
.post('/api/signup', (req, res, next) => {
    const r = req.body;
    const name = r.name;
    const read = r.read;
    const email = r.email;
    const password = r.password;
    console.log(`this is req.body = ${JSON.stringify(r)}`);
    if (name || read || email || password == "") {
      res.render("signup.ejs");
    }
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      (error, results) => {
        if (results.length > 0) {
          console.log(`same email is ${JSON.stringify(results)}`);
          res.render("signup.ejs");
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    const r = req.body;
    const name = r.name;
    const read = r.read;
    const email = r.email;
    const password = r.password;
    const INSERT_STATEMENT =
      "INSERT INTO users (name, furigana, email, password) VALUES (?, ?, ?, ?);";
    bcrypt.hash(password, SALT, (err, hash) => {
      if (err) {
        console.log("bcrypt error" + err);
      }
      connection.query(
        INSERT_STATEMENT,
        [name, read, email, hash],
        (err, result) => {
          console.log("result↓");
          console.log(result);
          if (err) {
            console.log(err);
          } else {
            res.redirect('/');
          }
        }
      );
    });
  }
)

/*workflow part */
.get('/workflow', checkSession, (req, res) => {
  res.render('workflow/workflow.ejs', { errors: [] });
})

.get('/workflow/config', checkSession, async (req, res) => {
  const pathway_sql = "select pw.id as pid, pw.name as pw_name, dep.id as did, dep.name as dp_name from pathways pw left join deployment dep on pw.dep_id = dep.id;";
  const pathways = await mysql_query(connection, pathway_sql);
  res.render('workflow/config.ejs', { errors: [], pathways: pathways });
})

.get('/workflow/create_pathway', async (req, res) => {
  const pathway_sql = "select id, name, furigana from users;";
  const users = await mysql_query(connection, pathway_sql);
  const pathway_sql2 = "select id, name from pathway_roles;";
  const roles = await mysql_query(connection, pathway_sql2);
  const pathway_sql3 = "select id, name from pathway_categories;";
  const pathway_categories = await mysql_query(connection, pathway_sql3);
  const deployment_sql = "select id, comp_id, name from deployment";
  const deployments = await mysql_query(connection, deployment_sql);
  res.render('workflow/create_pathway.ejs', { errors: [], users: users, roles: roles, categories: pathway_categories, deployments: deployments });
})

.post('/api/create_pathway', async (req, res) => {
  const r = req.body;
  console.log(`req body is ${JSON.stringify(r)}`);
  const workflow_name = r.workflow_name;
  const deployment = r.deployment | 0;
  const categories = r.category.join(',');
  const roles = r.role.join(',');
  const users = r.processor.join(',');
  const pathway_insert = "insert into pathways (name, dep_id, category_ids, role_ids, user_ids) values (?, ?, ?, ?, ?);";
  connection.query(
    pathway_insert,
    [workflow_name, deployment, categories, roles, users],
    (err, result) => {
      console.log("result ↓");
      console.log(result);
      err ? console.log(err) : res.redirect('/workflow/config');
    }
  )
})

// workflowのフォームを選択する画面
.get('/workflow/apply', checkSession, async (req, res) => {
  const pathway_sql = "select id, name, dep_id, category_ids, role_ids, user_ids from pathways;";
  const pathways = await mysql_query(connection, pathway_sql);
  console.log(pathways);
  res.render("workflow/apply.ejs", { errors: [], pathways: pathways });
})


// workflowの申請画面
.get('/workflow/:id', checkSession, async (req, res) => {
  const userId = req.session.userId;
  const id = req.params.id;
  const user_query = `select name from users where id = ${userId};`;
  const user = await mysql_query(connection, user_query);
  const pathway_query = `select pw.id as pathway_id, pw.name as pathway_name, dep.name as deployment_name, pw.category_ids, pw.role_ids, pw.user_ids from pathways pw left join deployment dep on pw.dep_id = dep.id where pw.id = ${id};`;
  const pathway = JSON.parse(JSON.stringify(await mysql_query(connection, pathway_query)));
  const leaf_types_query = "select id, name from leaf_types;";
  const leaf_types = await mysql_query(connection, leaf_types_query);

  // 申請経路整形
  const category_arr = pathway[0].category_ids.split(',').map(Number);
  const role_arr = pathway[0].role_ids.split(',').map(Number);
  const user_arr = pathway[0].user_ids.split(',').map(Number);
  let pathway_parr = [];  //parent
  let i = 0;
  let a_l = category_arr.length;
  for(; i < a_l; i++) {
    let pathway_carr = [];  //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${category_arr[i]};`;
    const category = JSON.parse(JSON.stringify(await mysql_query(connection, category_query)));
    pathway_carr.push(category[0].name);
    
    // role part
    const role_query = `select id, name from pathway_roles where id = ${role_arr[i]};`;
    const role = JSON.parse(JSON.stringify(await mysql_query(connection, role_query)));
    pathway_carr.push(role[0].name);

    // processor part
    if (role[0].id == 7) {
      const processor_query = `select name from users where id = ${userId};`;
      const processor = JSON.parse(JSON.stringify(await mysql_query(connection, processor_query)));
      pathway_carr.push(processor[0].name);
    } else {
      const processor_query = `select name from users where id = ${user_arr[i]};`;
      const processor = JSON.parse(JSON.stringify(await mysql_query(connection, processor_query)));
      pathway_carr.push(processor[0].name);
    }
    pathway_parr.push(pathway_carr);
  }

  res.render("workflow/apply_main.ejs", { errors: [], pathway: pathway, user: user, leaf_types: leaf_types, route_check: pathway_parr });
})

// create workflow
.post('/api/create_workflow', async (req, res) => {
  const r = req.body;
  const userId = Number(req.session.userId);
  
  const pathway_id  = Number(r.pathway_id);
  const leaf_type = Number(r.leaf_type);
  
  // st_date and ed_date
  const st_date_arr = r.st_date.split(' ');
  const ed_date_arr = r.ed_date.split(' ');
  const month1 = st_date_arr[1].replace(/Jan/i, 1).replace(/Feb/i, 2).replace(/Mar/i, 3).replace(/Apr/i, 4).replace(/May/i, 5).replace(/Jun/i, 6).replace(/Jul/i, 7).replace(/Aug/i, 8).replace(/Sep/i, 9).replace(/Oct/i, 10).replace(/Nov/i, 11).replace(/Dec/i, 12);
  const month2 = ed_date_arr[1].replace(/Jan/i, 1).replace(/Feb/i, 2).replace(/Mar/i, 3).replace(/Apr/i, 4).replace(/May/i, 5).replace(/Jun/i, 6).replace(/Jul/i, 7).replace(/Aug/i, 8).replace(/Sep/i, 9).replace(/Oct/i, 10).replace(/Nov/i, 11).replace(/Dec/i, 12);
  const st_date =  `${st_date_arr[3]}-${('00' + month1).slice(-2)}-${('00' + st_date_arr[2]).slice(-2)} 00:00:00`;
  const ed_date =  `${ed_date_arr[3]}-${('00' + month2).slice(-2)}-${('00' + ed_date_arr[2]).slice(-2)} 00:00:00`;
  
  const remarks = r.remarks;

  const sql = `select * from pathways where id = ${pathway_id};`;
  const pathways = JSON.parse(JSON.stringify(await mysql_query(connection, sql)));
  const user_ids = pathways[0].user_ids.split(',').map(Number);
  const role_ids = pathways[0].role_ids.split(',').map(Number);
  const category_ids = pathways[0].category_ids.split(',').map(Number);
  const applicant_index = role_ids.indexOf(7)
  user_ids[applicant_index] = userId;

  // insert to workflow table
  const workflow_insert_statement = `
  insert into workflows (user_id, pathway_id, leaf_type, st_date, ed_date, remarks) VALUES (?, ?, ?, ?, ?, ?);`;
  await mysql_query(connection, workflow_insert_statement, [userId, pathway_id, leaf_type, st_date, ed_date, remarks]);
  // get insertId part
  const insert_intermidiates_query_pre = "select id from workflows where id = (select max(id) from workflows);";
  const last_record = await mysql_query(connection, insert_intermidiates_query_pre);
  const maxid = last_record[0].id;

  //insert intermidiates _workflow table
  let insert_intermidiates_query = '';
  let n = 0;
  while (n < role_ids.length) {
    insert_intermidiates_query += `insert into intermidiates_workflow (workflow_id, category_id, role_id, user_id) VALUES (${maxid}, ${category_ids[n]}, ${role_ids[n]}, ${user_ids[n]});`;
    n++;
  }
  console.log(insert_intermidiates_query);

  connection.query(
    insert_intermidiates_query,
    (err, result) => {
      if (err) {
        console.log(err);
        res.redirect('/workflow');
      } else {
        console.log("result↓");
        console.log(result);
        res.redirect('/sendls');
      }
    }
  );
})

// workflow送信一覧
.get('/sendls', async (req, res) => {
  const userId = req.session.userId;
  
  const workflow_sql = `select wf.id, pw.name from workflows wf left join pathways pw on pw.id = wf.pathway_id where  wf.is_deleted = 0  and wf.user_id = ${userId};`;
  const send_workflows = await mysql_query(connection, workflow_sql);
  res.render("workflow/sendls.ejs", { errors: [], send_workflows: send_workflows });
})

.get('/send_confirm/:id', checkSession, async (req, res) => {
  const userId = req.session.userId;
  const workflow_id = req.params.id | 0;
  const user_query = `select * from users where id = ${userId};`;
  const user = await mysql_query(connection, user_query);
  const workflow_query = `
  select wf.id, wf.created_at as apply_date, dep.name as dep_name, pw.name as pathway_name, lef.name as leaf_name, wf.st_date, wf.ed_date, wf.remarks, wf.is_canceled, pw.category_ids, pw.role_ids, pw.user_ids
  from workflows wf
  left join pathways pw on wf.pathway_id = pw.id 
  left join deployment dep on pw.dep_id = dep.id
  left join leaf_types lef on wf.leaf_type = lef.id
  where wf.id = ${workflow_id} and wf.is_deleted = 0;`;
  const workflow = await mysql_query(connection, workflow_query);
  const category_arr = workflow[0].category_ids.split(',').map(Number);
  const role_arr = workflow[0].role_ids.split(',').map(Number);
  const user_arr = workflow[0].user_ids.split(',').map(Number);

  let pathway_parr = [];  //parent
  let i = 0;
  let a_l = category_arr.length;
  for(; i < a_l; i++) {
    let pathway_carr = [];  //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${category_arr[i]};`;
    const category = JSON.parse(JSON.stringify(await mysql_query(connection, category_query)));
    pathway_carr.push(category[0].name);
    
    // role part
    const role_query = `select id, name from pathway_roles where id = ${role_arr[i]};`;
    const role = JSON.parse(JSON.stringify(await mysql_query(connection, role_query)));
    pathway_carr.push(role[0].name);

    // processor part
    if (role[0].id == 7) {
      const processor_query = `select name from users where id = ${userId};`;
      const processor = JSON.parse(JSON.stringify(await mysql_query(connection, processor_query)));
      pathway_carr.push(processor[0].name);
    } else {
      const processor_query = `select name from users where id = ${user_arr[i]};`;
      const processor = JSON.parse(JSON.stringify(await mysql_query(connection, processor_query)));
      pathway_carr.push(processor[0].name);
    }
    pathway_parr.push(pathway_carr);
  }

  res.render("workflow/send_confirm.ejs", { errors: [], user: user, workflow: workflow, route_check: pathway_parr });
})

.get('/api/delete_sendthisis/:id', async (req, res) => {
  const del_target_id = req.params.id | 0;
  const delete_send_query = `update workflows set is_deleted = 1 where id = ${del_target_id};`;
  connection.query(
    delete_send_query,
    (err, result) => {
      console.log("result ↓");
      console.log(result);
      err ? console.log(err) : res.redirect('/sendls');
    }
  )
})

.get('/receiptls', checkSession, async (req, res) => {
  const userId = req.session.userId;
  
  const receipt_workflow_sql = `
  select wf.id, pw.name pathway_name, us.name as user_name from intermidiates_workflow iw 
  left join workflows wf on iw.workflow_id = wf.id
  left join users us on wf.user_id = us.id
  left join pathways pw on wf.pathway_id = pw.id
  where iw.user_id = ${userId};`
  const receipt_workflows = await mysql_query(connection, receipt_workflow_sql);
  res.render("workflow/receiptls.ejs", { errors: [], receipt_workflows: receipt_workflows });
})


.get('/receipt_confirm/:id', checkSession, async (req, res) => {
  const userId = req.session.userId;
  const workflow_id = req.params.id | 0;
  const sql = `
  select wf.id, wf.created_at as apply_date, dep.name as dep_name, pw.name as pathway_name, lef.name as leaf_name, wf.st_date, wf.ed_date, wf.remarks, wf.is_canceled, pw.category_ids, pw.role_ids, pw.user_ids
  from workflows wf
  left join pathways pw on wf.pathway_id = pw.id 
  left join deployment dep on pw.dep_id = dep.id
  left join leaf_types lef on wf.leaf_type = lef.id
  where wf.id = ${workflow_id}`;
  const workflow = await mysql_query(connection, sql);

  const status_sql = `select category_id, role_id, user_id, is_complete from intermidiates_workflow where workflow_id = ${workflow_id};`;
  const status = await mysql_query(connection, status_sql);
  let status_parr = [];
  let a_l = status.length;
  let n = 0;
  while (n < a_l) {
    let status_carr = [];  //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${status[n].category_id};`;
    const category = JSON.parse(JSON.stringify(await mysql_query(connection, category_query)));
    status_carr.push(category[0].name);

    // role part
    const role_query = `select id, name from pathway_roles where id = ${status[n].role_id};`;
    const role = JSON.parse(JSON.stringify(await mysql_query(connection, role_query)));
    status_carr.push(role[0].name);

    // user part
    const processor_query = `select name from users where id = ${status[n].user_id};`;
    const processor = JSON.parse(JSON.stringify(await mysql_query(connection, processor_query)));
    status_carr.push(processor[0].name);

    //is_complete
    status_carr.push(status[n].is_complete);

    status_parr.push(status_carr);
    n++;
  }

  res.render("workflow/receipt_confirm.ejs", { errors: [], workflow: workflow, status: status_parr });
})

//sign out
.get('/api/signout', checkSession, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("session was destroied, sign in again!");
      res.redirect('/');
    }
  });
})

.listen(port, () => console.log(`listening on port ${port}`));
