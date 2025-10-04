require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB(){
    try{
       mongoose.connect(process.env.MONGO_URI)
       console.log("Database connected successfully");
   }
   catch(err){
    console.log("Database connection failed" , err);
}

}
module.exports = connectDB;