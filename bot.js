require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const axios = require('axios')
const fs = require('fs')

const TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = process.env.ADMIN_ID

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET

const BTC = process.env.BTC_WALLET
const ETH = process.env.ETH_WALLET
const USDT = process.env.USDT_WALLET

const bot = new TelegramBot(TOKEN,{polling:true})

let books = JSON.parse(fs.readFileSync("books.json"))

const pageSize = 5

/* CATEGORY STRUCTURE */

const categories = {
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

/* ADMIN CHECK */

function isAdmin(id){
return id == ADMIN_ID
}

/* START COMMAND */

bot.onText(/\/start/,msg=>{

bot.sendMessage(msg.chat.id,
`📚 Best Global Digital Bookstore

Choose an option`,
{
reply_markup:{
keyboard:[
["📚 Browse Categories"],
["🔥 Best Sellers"],
["🔎 Search Books"]
],
resize_keyboard:true
}
})

})

/* CATEGORY MENU */

bot.on("message",msg=>{

const chatId = msg.chat.id
const text = msg.text

if(text==="📚 Browse Categories"){

let keyboard = Object.keys(categories).map(cat=>[cat])

bot.sendMessage(chatId,"📚 Book Categories",{
reply_markup:{
keyboard:keyboard,
resize_keyboard:true
}
})

}

/* SUBCATEGORY */

if(categories[text]){

const subs = categories[text]

if(subs.length===0){

bot.sendMessage(chatId,"No subcategories")

return

}

let keyboard = subs.map(sub=>[sub])

bot.sendMessage(chatId,
`📚 ${text}`,{
reply_markup:{
keyboard:keyboard,
resize_keyboard:true
}
})

}

/* SHOW BOOKS */

let results = books.filter(b=>b.subcategory===text)

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

/* PAGINATION */

function showPage(chatId,page){

const start = page * pageSize
const end = start + pageSize

const pageBooks = books.slice(start,end)

let text = `📚 Book Store\n\nPage ${page+1}`

pageBooks.forEach((book,i)=>{
text += `\n\n${i+1}. ${book.title} - $${book.price}`
})

bot.sendMessage(chatId,text,{
reply_markup:{
inline_keyboard:[
[
{text:"⬅ Prev",callback_data:`page_${page-1}`},
{text:"Next ➡",callback_data:`page_${page+1}`}
]
]
}
})

}

/* CALLBACK BUTTONS */

bot.on("callback_query",async query=>{

const chatId = query.message.chat.id
const data = query.data

if(data.startsWith("page_")){

const page = parseInt(data.split("_")[1])

if(page < 0) return

showPage(chatId,page)

}

/* PAYSTACK PAYMENT */

if(data.startsWith("pay_")){

const id = data.split("_")[1]

const book = books.find(b=>b.id==id)

const response = await axios.post(
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

const link = response.data.data.authorization_url

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

/* CRYPTO PAYMENT */

if(data.startsWith("crypto_")){

const id = data.split("_")[1]

const book = books.find(b=>b.id==id)

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

/* SEARCH BOOK */

bot.onText(/\/search (.+)/,(msg,match)=>{

const chatId = msg.chat.id
const query = match[1].toLowerCase()

const results = books.filter(b=>
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

/* BESTSELLERS */

bot.onText(/\/bestsellers/,msg=>{

const chatId = msg.chat.id

const top = books
.sort((a,b)=> (b.sales||0)-(a.sales||0))
.slice(0,5)

let text = "🔥 Best Selling Books\n"

top.forEach((book,i)=>{
text += `\n${i+1}. ${book.title} - $${book.price}`
})

bot.sendMessage(chatId,text)

})

/* STORE STATS */

bot.onText(/\/stats/,msg=>{

if(!isAdmin(msg.from.id)) return

const totalBooks = books.length

const totalSales = books.reduce(
(sum,b)=> sum+(b.sales||0),0
)

bot.sendMessage(msg.chat.id,
`📊 Store Dashboard

Total Books: ${totalBooks}
Total Sales: ${totalSales}
`)

})

/* ADMIN ADD BOOK */

bot.onText(/\/addbook (.+)/,(msg,match)=>{

if(!isAdmin(msg.from.id)) return

const data = match[1].split("|")

if(data.length < 6){

bot.sendMessage(msg.chat.id,
"Format:\n/addbook title|category|subcategory|price|cover|file")
return

}

const newBook = {

id: Date.now(),
title: data[0],
category: data[1],
subcategory: data[2],
price: parseFloat(data[3]),
cover: data[4],
file: data[5],
sales:0

}

books.push(newBook)

fs.writeFileSync("books.json",JSON.stringify(books,null,2))

bot.sendMessage(msg.chat.id,"✅ Book added successfully")

})

/* REMOVE BOOK */

bot.onText(/\/removebook (.+)/,(msg,match)=>{

if(!isAdmin(msg.from.id)) return

const id = parseInt(match[1])

books = books.filter(b=>b.id !== id)

fs.writeFileSync("books.json",JSON.stringify(books,null,2))

bot.sendMessage(msg.chat.id,"🗑 Book removed")

})

/* LIST BOOKS */

bot.onText(/\/listbooks/,msg=>{

if(!isAdmin(msg.from.id)) return

let text = "📚 Books in Store\n"

books.forEach(book=>{

text += `\nID: ${book.id}\n${book.title} - $${book.price}\n`

})

bot.sendMessage(msg.chat.id,text)

})

console.log("📚 Bookstore bot running")
