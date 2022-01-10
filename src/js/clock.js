'use strict';

function clock() {
  var myDay = new Array("日","月","火","水","木","金","土");
  var now  = new Date();
  var year = now.getFullYear(); // 年
  var month = now.getMonth()+1; // 月
  var date = now.getDate(); // 日
  var day = now.getDay();
  var hour = now.getHours(); // 時
  var min  = now.getMinutes(); // 分
  var sec  = now.getSeconds(); // 秒
  
  // 数値が1桁の場合、頭に0を付けて2桁で表示する指定
  if(hour < 10) { hour = "0" + hour; }
  if(min < 10) { min = "0" + min; }
  if(sec < 10) { sec = "0" + sec; }
  
  // フォーマット①
  var clock1 = `${year}年${month}月${date}日 (${myDay[day]}) `;
  
  document.getElementById('clock_01').innerHTML= clock1.toLocaleString(); // div id="clock-01"
  
  // フォーマット②
  var clock2 = `${hour}時${min}分${sec}秒`;
  
  document.getElementById('clock_02').innerHTML= clock2.toLocaleString(); // div id="clock-02"

  // 1000ミリ秒ごとに処理を実効
  window.setTimeout( "clock()", 1000);
}
window.onload = clock;