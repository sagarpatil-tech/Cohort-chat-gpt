const { Server } = require("socket.io");
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const userModel = require("../model/user.model")
const aiService = require("../services/ai.service")
const messageModel = require("../model/message.model");
const {createMemory, queryMemory} = require("../services/vector.service")
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
       const message =  await messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            content: messagePayload.content,//poiuytr
            role: "user"
        })

        const vectors = await aiService.generateVector(messagePayload.content);

        await createMemory({
            vectors,
            messageId: message._id,
            metadata: {
                chat : messagePayload.chat,
                user : socket.user._id,
                text: messagePayload.content
            }
        })

        const chathistory = (await messageModel.find({
            chat: messagePayload.chat
        }).sort({createdAt: -1}).limit(20).lean()).reverse()
       
        const response = await aiService.generateResponse(chathistory.map(item=>{
            return{
                role: item.role,
                parts : [{text: item.content }]
            }
        }))
         const responseMessage =  await messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            content: response,
            role: "model"
        })
        
        const responseVectors = await aiService.generateVector(response);
        
        await createMemory({
            vectors: responseVectors,
            messageId : responseMessage._id,
            metadata:{
                chat : messagePayload.chat,
                user: socket.user._id,
                text: response
            }
        })

        const memory = await queryMemory({
            queryVector : responseVectors,
            limit : 3,
            metadata: {}
        })
        console.log("memory", memory);

        socket.emit("ai-response",{
            content: response,
            chat : messagePayload.chat,
        })
       })
    
    })
}
module.exports = initSocketServer;