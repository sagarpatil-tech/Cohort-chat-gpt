const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    fullName:{
        firstname:{
        type: String,
        required: true 
    },
    lastname:{
        type: String,
        required: true
    }
    },
    password: {
        type: String
    }
}
,
{
    timestamps: true
}
);
const userModel =  mongoose.model('User', userSchema)
module.exports = userModel;