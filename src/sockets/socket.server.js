const { Server } = require("socket.io");
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require("../model/user.model")
const aiService = require("../services/ai.service")
const messageModel = require("../model/message.model");
function initSocketServer(httpServer){
    const io = new Server(httpServer, {})
 
io.use(async(socket, next)=>{
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
    if(!cookies.token){
        next (new Error("Authentication error: token not found"))
    }
    try{
       const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
       const user = await userModel.findById(decoded.id);
       socket.user = user;
       next();  
    }catch(err){
         next(new Error("Authentication error: invalid token"));
    }
})

    io.on("connection", (socket)=>{
       socket.on("ai-message", async (messagePayload)=>{
        console.log( messagePayload);
        await messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            content: messagePayload.content,
            role: "user"
        })
        const chathistory = await messageModel.find({
            chat: messagePayload.chat
        })
       
        const response = await aiService.generateResponse(chathistory.map(item=>{
            return{
                role: item.role,
                parts : [{text: item.content }]
            }
        }))
          await messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            content: response,
            role: "model"
        })
        socket.emit("ai-response",{
            content: response,
            chat : messagePayload.chat,
        })
       })
    
    })
}
module.exports = initSocketServer;