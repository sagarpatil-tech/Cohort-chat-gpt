const { GoogleGenAI } = require('@google/genai');
require('dotenv').config(); 
const ai = new GoogleGenAI({});

async function generateResponse(content){
    const response =  await ai.models.generateContent({
        model : 'gemini-2.5-flash',
        contents : content
    })
    return response.text;
}
module.exports = {
    generateResponse
}