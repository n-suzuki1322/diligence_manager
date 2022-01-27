'use strict'
const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');

//ルーティングでセッション確認分岐
const checkSession = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect("/");
  } else {
    next();
  }
}

router
.get('/workflow', checkSession, workflowController.getWorkflow)
.get('/workflow/config', checkSession, workflowController.getWorkflowConfig)
.get('/workflow/create_pathway', checkSession, workflowController.getCreatePathway)
.post('/api/create_pathway', workflowController.postCreatePathway)
.get('/workflow/apply', checkSession, workflowController.getWorkflowApply)
.get('/workflow/:id', checkSession, workflowController.getWorkflowApplication)
.post('/api/create_workflow', workflowController.postCreateWorkflow)
.get('/sendls', checkSession, workflowController.getSendls)
.get('/send_confirm/:id', checkSession, workflowController.getSendConfirm)
.get('/api/delete_sendthisis/:id', workflowController.deleteSendThisis)
.get('/receiptls', checkSession, workflowController.getReceiptls)
.get('/receipt_confirm/:id', checkSession, workflowController.getReceiptConfirm)
.get('/api/receipt_confirm/:id', workflowController.apiReceiptConfirm)

module.exports = router;