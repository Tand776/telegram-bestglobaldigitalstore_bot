require('dotenv').config()

const TelegramBot=require('node-telegram-bot-api')
const axios=require('axios')
const fs=require('fs')

const TOKEN=process.env.BOT_TOKEN

const PAYSTACK_SECRET=process.env.PAYSTACK_SECRET

const BTC=process.env.BTC_WALLET
const ETH=process.env.ETH_WALLET
const USDT=process.env.USDT_WALLET

const bot=new TelegramBot(TOKEN,{polling:true})

const books=JSON.parse(fs.readFileSync("books.json"))

const categories={
"Fiction":[
"Literary Fiction",
"Historical Fiction",
"Mystery & Thrillers",
"Romance",
"Science Fiction & Fantasy"
],

"Non-Fiction":[
"Biographies & Memoirs",
"Business & Investing",
"Cooking, Food & Wine",
"Health, Fitness & Dieting",
"Politics & Social Sciences"
],

"Children’s Books":[
"Picture Books",
"Chapter Books",
"Young Adult"
],

"Academic & Professional":[],
"Comics & Graphic Novels":[],
"Religion & Spirituality":[],
"Self-Help":[],
"Travel":[],
"Science & Nature":[]
}

bot.onText(/\/start/,msg=>{

bot.sendMessage(msg.chat.id,
`📚 Best Global Digital Bookstore

Choose an option`,
{
reply_markup:{
keyboard:[
["📚 Browse Categories"],
["🔎 Search Books"],
["🔥 Best Sellers"]
],
resize_keyboard:true
}
})

})

bot.on("message",msg=>{

const chatId=msg.chat.id
const text=msg.text

if(text==="📚 Browse Categories"){

let keyboard=Object.keys(categories).map(cat=>[cat])

bot.sendMessage(chatId,"📚 Book Categories",{
reply_markup:{
keyboard:keyboard,
resize_keyboard:true
}
})

}

if(categories[text]){

const subs=categories[text]

if(subs.length===0){

bot.sendMessage(chatId,"No subcategories")

return

}

let keyboard=subs.map(sub=>[sub])

bot.sendMessage(chatId,
`📚 ${text}`,{
reply_markup:{
keyboard:keyboard,
resize_keyboard:true
}
})

}

let results=books.filter(b=>b.subcategory===text)

results.forEach(book=>{

bot.sendPhoto(chatId,book.cover,{
caption:
`📖 ${book.title}

Category: ${book.category}
Price: $${book.price}`,

reply_markup:{
inline_keyboard:[
[
{text:"💳 Paystack",callback_data:"pay_"+book.id},
{text:"🪙 Crypto",callback_data:"crypto_"+book.id}
]
]
}
})

})

})

bot.on("callback_query",async query=>{

const chatId=query.message.chat.id
const data=query.data

if(data.startsWith("pay_")){

const id=data.split("_")[1]

const book=books.find(b=>b.id==id)

const response=await axios.post(
"https://api.paystack.co/transaction/initialize",
{
email:"customer@email.com",
amount:book.price*100
},
{
headers:{
Authorization:`Bearer ${PAYSTACK_SECRET}`,
"Content-Type":"application/json"
}
})

const link=response.data.data.authorization_url

bot.sendMessage(chatId,
`💳 Pay for ${book.title}

Price: $${book.price}`,
{
reply_markup:{
inline_keyboard:[
[
{text:"Pay Now",url:link}
]
]
}
})

}

if(data.startsWith("crypto_")){

const id=data.split("_")[1]

const book=books.find(b=>b.id==id)

bot.sendMessage(chatId,
`🪙 Crypto Payment

Send $${book.price} to:

BTC
${BTC}

ETH
${ETH}

USDT
${USDT}

After payment send transaction hash.`)

}

})

bot.onText(/\/search (.+)/,(msg,match)=>{

const chatId=msg.chat.id
const query=match[1].toLowerCase()

const results=books.filter(b=>
b.title.toLowerCase().includes(query)
)

if(results.length===0){

bot.sendMessage(chatId,"No books found")

return

}

results.forEach(book=>{

bot.sendMessage(chatId,
`${book.title}

Price $${book.price}`)

})

})

console.log("📚 Bookstore bot running")
