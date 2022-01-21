'use strict';

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

function app() {
  return {
    showDatepicker: false,
    datepickerValue: '',
    month: '',
    year: '',
    no_of_days: [],
    blankdays: [],
    days: ['日', '月', '火', '水', '木', '金', '土'],
    initDate() {
      let today = new Date();
      this.year = today.getFullYear();
      this.month = today.getMonth();
      this.datepickerValue = new Date(this.year, this.month, today.getDate()).toDateString();
    },
    isToday(date) {
      const today = new Date();
      const d = new Date(this.year, this.month, date);
      return today.toDateString() === d.toDateString() ? true : false;
    },
    getDateValue(date) {
      let selectedDate = new Date(this.year, this.month, date);
      this.datepickerValue = selectedDate.toDateString();
      this.$refs.date.value = selectedDate.getFullYear() +"-"+ ('0'+ selectedDate.getMonth()).slice(-2) +"-"+ ('0' + selectedDate.getDate()).slice(-2);
      this.showDatepicker = false;
    },
    getNoOfDays() {
      let daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
      let dayOfWeek = new Date(this.year, this.month).getDay();
      let blankdaysArray = [];
      for ( var i=1; i <= dayOfWeek; i++) { blankdaysArray.push(i); };
      let daysArray = [];
      for ( var i=1; i <= daysInMonth; i++) { daysArray.push(i); };
      this.blankdays = blankdaysArray;
      this.no_of_days = daysArray;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const st_date = document.getElementById('st_date');
  const ed_date = document.getElementById('ed_date');
  const duration = document.getElementById('duration');
  hoge();
  
  st_date.addEventListener('focusout', hoge);
  ed_date.addEventListener('focusout', hoge);

  function hoge() {
    const regex = /\d{2}/;
    const from = st_date.value.match(regex)[0] | 0;
    const to = ed_date.value.match(regex)[0] | 0;
    const diff = to - from + 1;
    duration.value = diff;
  }
});