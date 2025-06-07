const mysql = require('mysql2/promise')
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
  
});


const testConnection = async () => {

    try {
        const result = await pool.getConnection();
        // console.log(result)
        console.log("DB Connection Successfully")

    } catch (err) {
        console.log(err)
        console.log("DB Connection Faild")
    }

}

testConnection()


module.exports=pool;