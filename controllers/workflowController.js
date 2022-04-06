const mysql = require('mysql');

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

/*workflow part */
exports.getWorkflow = (req, res) => {
  res.render("workflow/workflow.ejs", { errors: [] });
}

exports.getWorkflowConfig = async (req, res) => {
  const pathway_sql =
    "select pw.id as pid, pw.name as pw_name, dep.id as did, dep.name as dp_name from pathways pw left join deployment dep on pw.dep_id = dep.id;";
  const pathways = await mysql_query(connection, pathway_sql);
  res.render("workflow/config.ejs", { errors: [], pathways: pathways });
}

exports.getCreatePathway = async (req, res) => {
  const pathway_sql = "select id, name, furigana from users;";
  const users = await mysql_query(connection, pathway_sql);
  const pathway_sql2 = "select id, name from pathway_roles;";
  const roles = await mysql_query(connection, pathway_sql2);
  const pathway_sql3 = "select id, name from pathway_categories;";
  const pathway_categories = await mysql_query(connection, pathway_sql3);
  const deployment_sql = "select id, comp_id, name from deployment";
  const deployments = await mysql_query(connection, deployment_sql);
  res.render("workflow/create_pathway.ejs", {
    errors: [],
    users: users,
    roles: roles,
    categories: pathway_categories,
    deployments: deployments
  });
}

exports.postCreatePathway = async (req, res) => {
  const r = req.body;
  console.log(`req body is ${JSON.stringify(r)}`);
  if (r.category == 0 || r.role == 0 || r.processor == 0) {
    res.redirect(`/workflow/create_pathway`);
    return;
  }
  const workflow_name = r.workflow_name;
  const deployment = r.deployment | 0;
  const categories = r.category.join(",");
  const roles = r.role.join(",");
  const users = r.processor.join(",");
  const pathway_insert =
    "insert into pathways (name, dep_id, category_ids, role_ids, user_ids) values (?, ?, ?, ?, ?);";
  connection.query(
    pathway_insert,
    [workflow_name, deployment, categories, roles, users],
    (err, result) => {
      console.log("result ↓");
      console.log(result);
      err ? console.log(err) : res.redirect("/workflow/config");
    }
  );
}

// workflowのフォームを選択する画面
exports.getWorkflowApply = async (req, res) => {
  const pathway_sql =
    "select id, name, dep_id, category_ids, role_ids, user_ids from pathways;";
  const pathways = await mysql_query(connection, pathway_sql);
  res.render("workflow/apply.ejs", { errors: [], pathways: pathways });
}

// workflowの申請画面
exports.getWorkflowApplication = async (req, res) => {
  const userId = req.session.userId;
  const id = req.params.id;
  const user_query = `select name from users where id = ${userId};`;
  const user = await mysql_query(connection, user_query);
  const pathway_query = `select pw.id as pathway_id, pw.name as pathway_name, dep.name as deployment_name, pw.category_ids, pw.role_ids, pw.user_ids from pathways pw left join deployment dep on pw.dep_id = dep.id where pw.id = ${id};`;
  const pathway = JSON.parse(
    JSON.stringify(await mysql_query(connection, pathway_query))
  );
  const leaf_types_query = "select id, name from leaf_types;";
  const leaf_types = await mysql_query(connection, leaf_types_query);

  // 申請経路整形
  const category_arr = pathway[0].category_ids.split(",").map(Number);
  const role_arr = pathway[0].role_ids.split(",").map(Number);
  const user_arr = pathway[0].user_ids.split(",").map(Number);
  let pathway_parr = []; //parent
  let i = 0;
  let a_l = category_arr.length;
  for (; i < a_l; i++) {
    let pathway_carr = []; //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${category_arr[i]};`;
    const category = JSON.parse(
      JSON.stringify(await mysql_query(connection, category_query))
    );
    pathway_carr.push(category[0].name);

    // role part
    const role_query = `select id, name from pathway_roles where id = ${role_arr[i]};`;
    const role = JSON.parse(
      JSON.stringify(await mysql_query(connection, role_query))
    );
    pathway_carr.push(role[0].name);

    // processor part
    if (role[0].id == 7) {
      const processor_query = `select name from users where id = ${userId};`;
      const processor = JSON.parse(
        JSON.stringify(await mysql_query(connection, processor_query))
      );
      pathway_carr.push(processor[0].name);
    } else {
      const processor_query = `select name from users where id = ${user_arr[i]};`;
      const processor = JSON.parse(
        JSON.stringify(await mysql_query(connection, processor_query))
      );
      pathway_carr.push(processor[0].name);
    }
    pathway_parr.push(pathway_carr);
  }

  res.render("workflow/apply_main.ejs", { errors: [], pathway: pathway, user: user, leaf_types: leaf_types, route_check: pathway_parr });
}

// create workflow
exports.postCreateWorkflow = async (req, res) => {
  const r = req.body;
  const userId = Number(req.session.userId);

  const pathway_id = Number(r.pathway_id);
  const leaf_type = Number(r.leaf_type);

  // st_date and ed_date
  const st_date_arr = r.st_date.split(" ");
  const ed_date_arr = r.ed_date.split(" ");
  const month1 = st_date_arr[1]
    .replace(/Jan/i, 1)
    .replace(/Feb/i, 2)
    .replace(/Mar/i, 3)
    .replace(/Apr/i, 4)
    .replace(/May/i, 5)
    .replace(/Jun/i, 6)
    .replace(/Jul/i, 7)
    .replace(/Aug/i, 8)
    .replace(/Sep/i, 9)
    .replace(/Oct/i, 10)
    .replace(/Nov/i, 11)
    .replace(/Dec/i, 12);
  const month2 = ed_date_arr[1]
    .replace(/Jan/i, 1)
    .replace(/Feb/i, 2)
    .replace(/Mar/i, 3)
    .replace(/Apr/i, 4)
    .replace(/May/i, 5)
    .replace(/Jun/i, 6)
    .replace(/Jul/i, 7)
    .replace(/Aug/i, 8)
    .replace(/Sep/i, 9)
    .replace(/Oct/i, 10)
    .replace(/Nov/i, 11)
    .replace(/Dec/i, 12);
  const st_date = `${st_date_arr[3]}-${("00" + month1).slice(-2)}-${("00" + st_date_arr[2]).slice(-2)} 00:00:00`;
  const ed_date = `${ed_date_arr[3]}-${("00" + month2).slice(-2)}-${("00" + ed_date_arr[2]).slice(-2)} 00:00:00`;

  const remarks = r.remarks;

  const sql = `select * from pathways where id = ${pathway_id};`;
  const pathways = JSON.parse(
    JSON.stringify(await mysql_query(connection, sql))
  );
  const user_ids = pathways[0].user_ids.split(",").map(Number);
  const role_ids = pathways[0].role_ids.split(",").map(Number);
  const category_ids = pathways[0].category_ids.split(",").map(Number);
  const applicant_index = role_ids.indexOf(7);
  user_ids[applicant_index] = userId;

  // insert to workflow table
  const workflow_insert_statement = `
  insert into workflows (user_id, pathway_id, leaf_type, st_date, ed_date, remarks) VALUES (?, ?, ?, ?, ?, ?);`;
  await mysql_query(connection, workflow_insert_statement, [
    userId,
    pathway_id,
    leaf_type,
    st_date,
    ed_date,
    remarks
  ]);
  // get insertId part
  const insert_intermidiates_query_pre =
    "select id from workflows where id = (select max(id) from workflows);";
  const last_record = await mysql_query(
    connection,
    insert_intermidiates_query_pre
  );
  const maxid = last_record[0].id;

  //insert intermidiates _workflow table
  let insert_intermidiates_query = "";
  let n = 0;
  while (n < role_ids.length) {
    insert_intermidiates_query += `insert into intermidiates_workflow (workflow_id, category_id, role_id, user_id) VALUES (${maxid}, ${category_ids[n]}, ${role_ids[n]}, ${user_ids[n]});`;
    n++;
  }

  connection.query(insert_intermidiates_query, (err, result) => {
    if (err) {
      console.log(err);
      res.redirect("/workflow");
    } else {
      console.log("result↓");
      console.log(result);
      res.redirect("/sendls");
    }
  });
}

// workflow送信一覧
exports.getSendls = async (req, res) => {
  const userId = req.session.userId;

  const workflow_sql = `
  select 
  wf.id, pw.name, wf.is_complete
  from workflows wf 
  left join pathways pw on pw.id = wf.pathway_id 
  where wf.is_deleted = 0  and wf.user_id = ${userId};
  `;
  const send_workflows = await mysql_query(connection, workflow_sql);
  res.render("workflow/sendls.ejs", { errors: [], send_workflows: send_workflows });
}

exports.getSendConfirm = async (req, res) => {
  const userId = req.session.userId;
  const workflow_id = req.params.id | 0;
  const user_query = `select * from users where id = ${userId};`;
  const user = await mysql_query(connection, user_query);
  const workflow_query = `
  select 
  wf.id, wf.created_at as apply_date, dep.name as dep_name, pw.name as pathway_name, lef.name as leaf_name, wf.st_date, wf.ed_date, wf.remarks, wf.is_canceled, pw.category_ids, pw.role_ids, pw.user_ids
  from workflows wf
  left join pathways pw on wf.pathway_id = pw.id 
  left join deployment dep on pw.dep_id = dep.id
  left join leaf_types lef on wf.leaf_type = lef.id
  where wf.id = ${workflow_id} and wf.is_deleted = 0;
  `;
  const workflow = await mysql_query(connection, workflow_query);

  const status_sql = `
  select 
  category_id, role_id, user_id, is_complete 
  from 
  intermidiates_workflow where workflow_id = ${workflow_id};
  `;
  const status = await mysql_query(connection, status_sql);
  let status_parr = [];
  let a_l = status.length;
  let n = 0;
  while (n < a_l) {
    let status_carr = []; //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${status[n].category_id};`;
    const category = JSON.parse(
      JSON.stringify(await mysql_query(connection, category_query))
    );
    status_carr.push(category[0].name);

    // role part
    const role_query = `select id, name from pathway_roles where id = ${status[n].role_id};`;
    const role = JSON.parse(
      JSON.stringify(await mysql_query(connection, role_query))
    );
    status_carr.push(role[0].name);

    // user part
    const processor_query = `select name from users where id = ${status[n].user_id};`;
    const processor = JSON.parse(
      JSON.stringify(await mysql_query(connection, processor_query))
    );
    status_carr.push(processor[0].name);

    //is_complete
    status_carr.push(status[n].is_complete);

    status_parr.push(status_carr);
    n++;
  }
  res.render("workflow/send_confirm.ejs", { errors: [], user: user, workflow: workflow, status: status_parr});
}

exports.deleteSendThisis = async (req, res) => {
  const del_target_id = req.params.id | 0;
  const delete_send_query = `update workflows set is_deleted = 1 where id = ${del_target_id};`;
  connection.query(delete_send_query, (err, result) => {
    console.log("result ↓");
    console.log(result);
    err ? console.log(err) : res.redirect("/sendls");
  });
}

exports.getReceiptls = async (req, res) => {
  const userId = req.session.userId;

  const receipt_workflow_sql = `
  select 
  wf.id, pw.name pathway_name, us.name as user_name, wf.is_complete
  from intermidiates_workflow iw 
  left join workflows wf on iw.workflow_id = wf.id
  left join users us on wf.user_id = us.id
  left join pathways pw on wf.pathway_id = pw.id
  where iw.user_id = ${userId};
  `;
  const receipt_workflows = await mysql_query(
    connection,
    receipt_workflow_sql
  );
  res.render("workflow/receiptls.ejs", {
    errors: [],
    receipt_workflows: receipt_workflows
  });
}

exports.getReceiptConfirm = async (req, res) => {
  const workflow_id = req.params.id | 0;
  const sql = `
  select 
  wf.id, wf.created_at as apply_date, dep.name as dep_name, pw.name as pathway_name, lef.name as leaf_name, wf.st_date, wf.ed_date, wf.remarks, wf.is_canceled, pw.category_ids, pw.role_ids, pw.user_ids, wf.is_complete
  from workflows wf
  left join pathways pw on wf.pathway_id = pw.id 
  left join deployment dep on pw.dep_id = dep.id
  left join leaf_types lef on wf.leaf_type = lef.id
  where wf.id = ${workflow_id}
  `;
  const workflow = await mysql_query(connection, sql);

  const status_sql = `select category_id, role_id, user_id, is_complete from intermidiates_workflow where workflow_id = ${workflow_id};`;
  const status = await mysql_query(connection, status_sql);
  let status_parr = [];
  let a_l = status.length;
  let n = 0;
  while (n < a_l) {
    let status_carr = []; //children_array

    // category part
    const category_query = `select name from pathway_categories where id = ${status[n].category_id};`;
    const category = JSON.parse(
      JSON.stringify(await mysql_query(connection, category_query))
    );
    status_carr.push(category[0].name);

    // role part
    const role_query = `select id, name from pathway_roles where id = ${status[n].role_id};`;
    const role = JSON.parse(
      JSON.stringify(await mysql_query(connection, role_query))
    );
    status_carr.push(role[0].name);

    // user part
    const processor_query = `select name from users where id = ${status[n].user_id};`;
    const processor = JSON.parse(
      JSON.stringify(await mysql_query(connection, processor_query))
    );
    status_carr.push(processor[0].name);

    //is_complete
    status_carr.push(status[n].is_complete);

    status_parr.push(status_carr);
    n++;
  }

  res.render("workflow/receipt_confirm.ejs", {
    errors: [],
    workflow: workflow,
    status: status_parr
  });
}

exports.apiReceiptConfirm = async (req, res) => {
  const confirm_target_id = req.params.id | 0;
  const userId = req.session.userId;
  const sql = `
  update intermidiates_workflow set is_complete = now() where (workflow_id = ${confirm_target_id}) and (user_id = ${userId});
  update workflows set is_complete = 1
  where id = ${confirm_target_id} and not exists (
  select * from intermidiates_workflow
  WHERE (workflow_id = ${confirm_target_id}) and is_complete is null
  );
  `;
  const result = await mysql_query(connection, sql);
  res.end(JSON.stringify({ updates: result }));
}