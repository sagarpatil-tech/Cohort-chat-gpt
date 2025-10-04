const chatModel = require('../model/chat.model');

//create chat
async function createChat(req, res){
    const {tittle} = req.body;
    const user = req.user;
    const chat = await chatModel.create({
        user: user._id,
        tittle
    })
    res.status(201).json({
        message: "chat created successfully",
        chat:{
            _id: chat._id,
            tittle: chat.tittle,
            lastActivity: chat.lastActivity,
            user: chat.user
        }
})
}
module.exports = {
    createChat
}