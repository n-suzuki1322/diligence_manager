'use strict'
const express = require('express');
const router = express.Router();
const dailyController = require('../controllers/dailyController');

//ルーティングでセッション確認分岐
const checkSession = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect("/");
  } else {
    next();
  }
}

router
.get('/daily/year=:year/month=:month', checkSession, dailyController.getDaily)
.get('/daily_edit/year=:year/month=:month', checkSession, dailyController.getDailyEdit)
.post('/daily_comp/year=:year/month=:month', checkSession, dailyController.getDailyComp)
.post('/api/excel_output/year=:year/month=:month', checkSession, dailyController.excelOutput)

module.exports = router;