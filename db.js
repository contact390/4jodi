
const mysql = require('mysql2/promise');


const db = mysql.createPool({
  host: 'localhost',     
  user: 'root',         
  password: '2001',       
  database: 'hitaishi_matrimony',  
  port: 3306
});

module.exports = db;


// const mysql = require("mysql2");

// // Create MySQL connection pool
// const db = mysql.createPool({
//   host: "localhost",   // change if different
//   user: "root",        // your MySQL user
//   password: "2001",    // your MySQL password
//   database: "hitaishi_matrimony",  // make sure database exists
//   port: 3306           // your MySQL port (default is 3306, you said 3307 earlier)
// });

// // Test connection
// db.getConnection((err, connection) => {
//   if (err) {
//     console.error("❌ Database connection failed:", err.message);
//   } else {
//     console.log("✅ Connected to MySQL Database");
//     connection.release();
//   }
// });

// module.exports = db;
