"use strict";
function dlt_row(obj) {
  const tbody = document.getElementById("pathway_tbody");
  const tr = obj.parentNode.parentNode;
  tbody.rows.length < 3 ? "" : tbody.removeChild(tr);
}

document.addEventListener("DOMContentLoaded", function () {
  const users = JSON.parse(document.getElementById("users").value);
  const deployments = JSON.parse(document.getElementById("deployments").value);
  const roles = JSON.parse(document.getElementById("roles").value);
  const categories = JSON.parse(document.getElementById("categories").value);
  const add = document.getElementById("add");
  const pathway_table = document.getElementById("pathway_table");
  const tbody = document.getElementById("pathway_tbody");
  add_row(pathway_table.rows.length);

  deployments.forEach((deployment) => {
    $("#deployment_all").append(`<option value=${deployment.id}>${deployment.name}</option>`);
  });

  categories.forEach((category) => {
    $("#categories_select").append(`<option value=${category.id}>${category.name}</option>`);
  });

  roles.forEach((role) => {
    $("#roles_select").append(`<option value=${role.id}>${role.name}</option>`);
  });

  users.forEach((user) => {
    $("#employee_all").append(`<option value=${user.id}>${user.name}</option>`);
  });

  add.addEventListener("click", () => {
    add_row(pathway_table.rows.length);
  });

  //行追加
  function add_row(table_length) {
    let tr = document.createElement("tr");
    for (let i = 0; i < 4; i++) {
      let td = document.createElement("td");
      switch (i) {
        case 0:
          td.innerHTML = `<select id="categories_select_${table_length}" class="" name="category"><option value=0>経路種別</option></select>`;
          break;

        case 1:
          td.innerHTML = `<select id="roles_select_${table_length}" name="role"><option value=0>役割</option></select>`;
          roles.forEach((role) => {
            $(`#roles_select_${table_length}`).append(`<option value=${role.id}>${role.name}</option>`);
          });
          break;

        case 2:
          td.innerHTML = `<select id="employee_all_${table_length}" class="" name="processor"><option value=0>-----担当者------</option></select>`;
          users.forEach((user) => {
            $(`#employee_all_${table_length}`).append(`<option value=${user.id}>${user.name}</option>`);
          });
          break;

        case 3:
          td.innerHTML = `<input type="button" value="削除" class="cursor-pointer" id="dlt_" onclick="dlt_row(this)">`;
          break;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);

    // add option
    categories.forEach((category) => {
      $(`#categories_select_${table_length}`).append(`<option value=${category.id}>${category.name}</option>`);
    });
    roles.forEach((role) => {
      $(`#roles_select_${table_length}`).append(`<option value=${role.id}>${role.name}</option>`);
    });
    users.forEach((user) => {
      $(`#employee_all_${table_length}`).append(`<option value=${user.id}>${user.name}</option>`);
    });
  }
});