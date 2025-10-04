const userModel = require("../model/user.model");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
async function registerUser(req, res){
    const {fullName: {firstname, lastname} , email , password} = req.body
  
    const  isUserAlreadyExists = await userModel.findOne({email})

    if(isUserAlreadyExists){
        res.status(400).json({
            message: "User already exists"
        })
    }
   
    const hashPassword = await bcrypt.hash(password, 10);
    const user =  await userModel.create({
        fullName:{
            firstname, lastname
        },
        email,
        password: hashPassword
    })

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET,)
    res.cookie("token", token)

    res.status(201).json({
        message: "user registered successfully",
        user:{
            email: user.email,
            id: user._id,
            fullname: user.fullName
        }
    })
}

async function loginUser(req, res){
    const {email , password} = req.body
    const user = await userModel.findOne({email})
    if(!user){
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }
    const isPasswordValid= await bcrypt.compare(password, user.password);
    if(!isPasswordValid){
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)
    res.cookie("token", token)

    res.status(200).json({
        message: " user Logged in successfully",
        user:{
            email: user.email,
            id: user._id,
            fullname: user.fullname
        }
    })
    
}

module.exports = {
    registerUser , loginUser
}