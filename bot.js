require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const axios = require('axios')
const fs = require('fs')

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET

const data = JSON.parse(fs.readFileSync("products.json"))

/* START MENU */

bot.onText(/\/start/, (msg)=>{

const chatId = msg.chat.id

let keyboard = data.categories.map(cat => [{
text: cat.name,
callback_data: "cat_" + cat.name
}])

bot.sendMessage(chatId,
"📚 Welcome to the Digital Bookstore\n\nChoose a category:",
{
reply_markup:{
inline_keyboard: keyboard
}
})

})

/* PAYSTACK PAYMENT FUNCTION */

async function createPayment(email, amount){

const response = await axios.post(
"https://api.paystack.co/transaction/initialize",
{
email: email,
amount: amount * 100
},
{
headers:{
Authorization:`Bearer ${PAYSTACK_SECRET}`,
"Content-Type":"application/json"
}
})

return response.data.data.authorization_url

}

/* BUTTON HANDLER */

bot.on("callback_query", async (query)=>{

const chatId = query.message.chat.id
const dataText = query.data

/* OPEN CATEGORY */

if(dataText.startsWith("cat_")){

const category = dataText.replace("cat_","")

const cat = data.categories.find(c => c.name === category)

if(!cat || cat.products.length === 0){

bot.sendMessage(chatId,"No products yet in this category.")
return

}

cat.products.forEach(p => {

bot.sendMessage(chatId,
`📚 ${p.name}

💰 Price: $${p.price}

Click BUY to pay and receive the product.`,
{
reply_markup:{
inline_keyboard:[
[{text:"🛒 Buy", callback_data:"buy_"+p.id}]
]
}
})

})

}

/* BUY PRODUCT */

if(dataText.startsWith("buy_")){

const id = dataText.replace("buy_","")

let product

data.categories.forEach(cat=>{
const found = cat.products.find(p => p.id === id)
if(found) product = found
})

if(!product){
bot.sendMessage(chatId,"Product not found.")
return
}

/* CREATE PAYMENT LINK */

const email = "customer@email.com"

const paymentLink = await createPayment(email, product.price)

bot.sendMessage(chatId,
`💳 Pay for: ${product.name}

Price: $${product.price}

Click the button below to pay.`,
{
reply_markup:{
inline_keyboard:[
[{text:"💳 Pay Now", url: paymentLink}]
]
}
})

}

})

console.log("🚀 Digital Store Bot Running")