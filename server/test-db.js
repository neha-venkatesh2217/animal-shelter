//import the database connection
import db from "./db.js";

try {
  //get the users from mysql
  const [rows] = await db.query(
    "SELECT id, username, email FROM users"
  );

  //display a success message
  console.log("Connected to MySQL successfully!");

  //display the users in a table
  console.table(rows);

} catch (error) {
  //display an error if the query fails
  console.error("Database connection failed:", error);

} finally {
  //close the database connections
  await db.end();
}