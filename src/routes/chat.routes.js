const express = require('express');
const authMiddleware = require('../middleware/auth.middleware')
const chatController = require('../controller/chat.controller')

const router = express.Router();

router.post('/', authMiddleware.authUser, chatController.createChat);

module.exports = router;