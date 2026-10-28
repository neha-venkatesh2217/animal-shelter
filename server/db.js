//import the mysql library
import mysql from "mysql2/promise";

//load the environment variables
import "dotenv/config";

//create a connection pool for the database
const db = mysql.createPool({
  //get the database host
  host: process.env.DB_HOST,

  //get the database username
  user: process.env.DB_USER,

  //get the database password
  password: process.env.DB_PASSWORD,

  //get the database name
  database: process.env.DB_NAME,

  //get the database port
  port: Number(process.env.DB_PORT || 3306)
});

//export the database connection
export default db;