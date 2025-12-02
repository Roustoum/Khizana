const mongoose = require("mongoose");
require("dotenv")

async function ConnectDB() {
    await mongoose.connect(process.env.MONGO_URL+"test")
    console.log("connected to mongoDB !")
}

module.exports = {
    ConnectDB
}