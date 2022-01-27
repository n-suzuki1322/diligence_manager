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
.get('/daily', checkSession, dailyController.getDaily)
.get('/daily_edit', checkSession, dailyController.getDailyEdit)
.get('/daily_comp', dailyController.getDailyComp)
.post('/api/excel_output', dailyController.excelOutput)

module.exports = router;