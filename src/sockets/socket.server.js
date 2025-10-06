const { Server } = require("socket.io"); // socket.io se realtime connection ke liye import
const cookie = require('cookie'); // cookie parse karne ke liye
const jwt = require('jsonwebtoken'); // JWT verify karne ke liye (user authentication)
const userModel = require("../model/user.model") // User data ke liye MongoDB model
const aiService = require("../services/ai.service") // AI related services (vector, response, etc.)
const messageModel = require("../model/message.model"); // Message schema/model
const {createMemory, queryMemory} = require("../services/vector.service") // Vector DB functions (memory store/query)

function initSocketServer(httpServer){
    const io = new Server(httpServer, {}) // Socket.IO server initialize karna
 
    // --- Authentication Middleware ---
    io.use(async(socket, next)=>{
        const cookies = cookie.parse(socket.handshake.headers?.cookie || ""); // Client se cookies lena
        if(!cookies.token){
            next (new Error("Authentication error: token not found")) // Token na ho to error
        }
        try{
            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET); // JWT verify karna
            const user = await userModel.findById(decoded.id); // Token se user find karna
            socket.user = user; // Socket object me user attach karna
            next();  // Authentication success hone par aage badhna
        }catch(err){
            next(new Error("Authentication error: invalid token")); // Invalid token error
        }
    })

    // --- Connection Event ---
    io.on("connection", (socket)=>{
        // Jab client message bheje (ai-message)
        socket.on("ai-message", async (messagePayload)=>{
            console.log(messagePayload);

            // User ka message DB me save karna
            const message =  await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: messagePayload.content,
                role: "user"
            })

            // User ke message ka vector (embedding) banana
            const vectors = await aiService.generateVector(messagePayload.content);

            // Memory me similar vectors (pichle related messages) khojna
            const memory = await queryMemory({
                queryVector : vectors,
                limit : 3,
                metadata: {}
            })
            console.log("memory", memory);

            // User ke message ko memory (vector DB) me store karna
            await createMemory({
                vectors,
                messageId: message._id,
                metadata: {
                    chat : messagePayload.chat,
                    user : socket.user._id,
                    text: messagePayload.content
                }
            })

            // Chat history nikalna (pichle 20 messages)
            const chathistory = (await messageModel.find({
                chat: messagePayload.chat
            }).sort({createdAt: -1}).limit(20).lean()).reverse()
           
            // Short-term memory (STM): Recent messages ko AI format me convert karna
            const stm = (chathistory.map(item=>{
                return{
                    role: item.role,
                    parts : [{text: item.content }]
                }
            }))
            
            // Long-term memory (LTM): Similar old messages memory se lana
            const ltm = [
                {
                   role: "user",
                   parts:[{
                    text: 
                    `there are some previous message from chat , use them to generate response
                    
                    ${memory.map(item=> item.metadata.text).join("\n")}`
                   }] 
                }
            ]
            console.log(stm[0]);
            console.log(ltm)

            // AI se response generate karwana (STM + LTM dono mila ke)
            const response = await aiService.generateResponse([...ltm, ...stm]);

            // AI ka response message DB me save karna
            const responseMessage =  await messageModel.create({
                chat: messagePayload.chat,
                user: socket.user._id,
                content: response,
                role: "model"
            })
            
            // AI ke response ka vector banana
            const responseVectors = await aiService.generateVector(response);
            
            // Response vector ko memory me store karna
            await createMemory({
                vectors: responseVectors,
                messageId : responseMessage._id,
                metadata:{
                    chat : messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }
            })

            // Response client ko bhejna (emit karna)
            socket.emit("ai-response",{
                content: response,
                chat : messagePayload.chat,
            })
       })
    
    })
}
module.exports = initSocketServer;
