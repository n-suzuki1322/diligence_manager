const express = require("express");
const mysql = require("mysql");
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 4649;
const dotenv = require('dotenv');
dotenv.config();

//passwordをhash化した時の文字数
const SALT = 10;

// manage session
const session = require('express-session');

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
    res.locals.name = req.session.name
    res.locals.email = req.session.email
    res.locals.isLoggedIn = true;
  } else {
    res.locals.isLoggedIn = false;
  }
  next();
})

// to access mysql
const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  multipleStatements: true
});

// 接続したDB確認
console.log('host ' + process.env.HOST)
console.log('user ' + process.env.DBUSER)
console.log('password ' + process.env.PASSWORD)
console.log('database ' + process.env.DATABASE)

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
      err ? reject({ dataExists: false, reason: err }) : resolve(results, fields)
    })
  })
}

//ルーティングでセッション確認分岐
function checkSession(req, res, next) {
  if (!req.session.userId) {
    res.redirect('/')
  } else {
    next()
  }
}

app
.get('/', (req, res) => {
  const userId = req.session.userId;
  const name = req.session.name;
  if (userId) {
    res.render('stamp.ejs', { userId: userId, name: name});
  }else {
    res.render('home.ejs');
  }
})

.get('/signin', (req, res) => {
  res.render("singin.ejs")
})

// signin
.post('/api/signin', (req, res) => {
  const r = req.body;
  const email = r.email;
  const password = r.password;
  console.log(`signin email = ${email}`);
  console.log(`signin password = ${password}`);
  connection.query(
    'SELECT * FROM users WHERE email = ?;',
    [email],
    (error, result) => {
      if (error) {
        console.log('maybe send wrong password or email');
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
  )
})


//　打刻の打刻による...
.post('/api/stamp', async (req, res) => {
  const r = req.body;
  const userId = req.session.userId;

  if (r.action === 'start') {   // 出勤ボタンが押されたらの処理
    const invalid_sstamp_sql = `select * from time_management where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_sresult = await mysql_query(connection, invalid_sstamp_sql, userId);
    if (invalid_sresult[0]) {  // 既に出勤打刻してあったらinsertしない
      console.log('もう十分に出勤されています');
      res.redirect('/') 
    } else {  // その日の分が打刻されていなかったらinsert
      const sstamp_sql = 'insert into time_management (user_id, st_time) VALUES(?, now());'
      const result = await mysql_query(connection, sstamp_sql, userId);
      console.log('insert result↓');
      result ? console.log(result) : console.log('internal server error(仮)');
      res.status(200)
      res.redirect('/');
    }
  } else {  // 退勤ボタンが押されたらの処理
    const invalid_estamp_sql = `select * from time_management where user_id = ? and date_format(ed_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_estamp_sql2 = `select * from time_management where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
    const invalid_eresult = await mysql_query(connection, invalid_estamp_sql, userId);
    const invalid_eresult2 = await mysql_query(connection, invalid_estamp_sql2, userId);
    if (invalid_eresult[0]) {// もう既に退勤してる場合
      console.log("もう退勤してるってば!");
      res.redirect('/');
    } else if(invalid_eresult2[0]) {// 出勤打刻されているandまだ退勤がされていなかった場合
      const estamp_sql = `update time_management set ed_time = now() where user_id = ? and date_format(st_time, '%Y-%m-%d') = date_format(now(), '%Y-%m-%d');`;
      const result = await mysql_query(connection, estamp_sql, userId);
      console.log("update result ↓")
      result ? console.log(result) : console.log('internal server error');
      res.status(200)
      res.redirect('/');
    } else { // 出勤打刻されていない
      console.log('まずは出勤してみてほしい')
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
.get("/signup", (req, res) => {
  res.render("signup.ejs", { errors: [] })
})

// signup part
.post("/api/signup", (req, res, next) => {
  const r = req.body;
  const name = r.name;
  const read = r.read;
  const email = r.email;
  const password = r.password;
  console.log(`this is req.body = ${JSON.stringify(r)}`);
  if (name || read || email  || password == "" ) {
    res.render('signup.ejs') 
  }
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      if (results.length > 0) {
        console.log(`same email is ${JSON.stringify(results)}`);
        res.render('signup.ejs');
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
    });
  });
})

/*workflow part */
.get('/workflow', checkSession,  (req, res) => {
  res.render("workflow/workflow.ejs", { errors: [] })
})

.get('/workflow/config',checkSession,  (req, res) => {
  res.render('workflow/config.ejs', {errors: [] })
})

.get('/workflow/create_pathway', async (req, res) => {
  const pathway_sql = "select id, name, furigana from users;";
  const users = await mysql_query(connection, pathway_sql);
  const pathway_sql2 = "select id, name from pathway_rules;";
  const rules = await mysql_query(connection, pathway_sql2);
  const pathway_sql3  = "select id, name from pathway_categories;";
  const pathway_categories = await mysql_query(connection, pathway_sql3);
  const deployment_sql = "select id, comp_id, name from deployment";
  const deployments = await mysql_query(connection, deployment_sql);
  res.render('workflow/create_pathway.ejs', { errors: [], users: users, rules: rules, categories: pathway_categories, deployments: deployments });
})

//sign out
.get('/api/signout', (req, res) => {
  req.session.destroy((err) => {
    if(err) { 
      console.log(err)
    } else {
      console.log("session was destroied, sign in again!");
      res.redirect('/')
    }
  });
})

.listen(port, () => console.log(`listening on port ${port}`));