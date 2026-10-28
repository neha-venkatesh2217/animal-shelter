//import crypto for password hashing
import crypto from "crypto";

//import express
import express from "express";

//import cors
import cors from "cors";

//import the database connection
import db from "./db.js";

//create the express application
const app = express();

//allow express to read html form data
app.use(express.urlencoded({ extended: true }));

//allow react to communicate with the backend
app.use(cors({
  origin: "http://localhost:5173"
}));

//allow the server to read json data
app.use(express.json());

//create the home route
app.get("/", (req, res) => {
  //send a message to the browser
  res.send("My backend is working!");
});

//create a route to get all animals
app.get("/api/animals", async (req, res) => {
  try {
    //get all animals from mysql
    const [rows] = await db.query("SELECT * FROM animals");

    //send the animals to react
    res.json(rows);
  } catch (error) {
    //display the error
    console.error(error);

    //send an error response
    res.status(500).json({ error: "Database connection failed" });
  }
});

 //handle user registration
app.post("/register", async (req, res) => {

  //get the values submitted by the form
  const { username, email, password } = req.body;

  //check that all fields are provided
  if (!username || !email || !password) {
    return res.status(400).send("All fields are required");
  }

  try {
    //check whether the username or email already exists
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    //stop registration if the account already exists
    if (existingUsers.length > 0) {
      return res.status(409).send(
        'Username or email already exists. <a href="http://localhost:5173/register.html">Try again</a>'
      );
    }

    //generate a random salt for the password
    const salt = crypto.randomBytes(16).toString("hex");

    //hash the password using pbkdf2
    const hashedPassword = crypto.pbkdf2Sync(
      password,
      salt,
      600000,
      64,
      "sha512"
    ).toString("hex");

    //insert the new user into the database
    await db.query(
      "INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, salt]
    );

    //send a success message and login link
    res.send(
      'You have successfully registered. <a href="http://localhost:5173/login.html">Login here</a>'
    );

  } catch (error) {
    //display the error in the terminal
    console.error(error);

    //send an error message
    res.status(500).send("Registration failed");
  }
});

 //handle user login
app.post("/login", async (req, res) => {

  //get the username and password from the form
  const { username, password } = req.body;

  //check that both fields were provided
  if (!username || !password) {
    return res.status(401).send(
      'The login credentials were incorrect. <a href="http://localhost:5173/login.html">Try again</a>'
    );
  }

  try {
    //find the user in the database
    const [users] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    //check if the username exists
    if (users.length === 0) {
      return res.status(401).send(
        'The login credentials were incorrect. <a href="http://localhost:5173/login.html">Try again</a>'
      );
    }

    //get the saved password hash and salt
    const savedHash = users[0].password_hash;
    const salt = users[0].salt;

    //check if the user has a valid saved salt
    if (!salt) {
      return res.status(401).send(
        'The login credentials were incorrect. <a href="http://localhost:5173/login.html">Try again</a>'
      );
    }

    //hash the entered password using the saved salt
    const hashedPassword = crypto.pbkdf2Sync(
      password,
      salt,
      600000,
      64,
      "sha512"
    ).toString("hex");

    //compare the entered password hash with the saved hash
    const passwordMatches =
      savedHash.length === hashedPassword.length &&
      crypto.timingSafeEqual(
        Buffer.from(savedHash, "hex"),
        Buffer.from(hashedPassword, "hex")
      );

    //check if the password is incorrect
    if (!passwordMatches) {
      return res.status(401).send(
        'The login credentials were incorrect. <a href="http://localhost:5173/login.html">Try again</a>'
      );
    }

    //send the successful login message
    res.send("You have logged in successfully");

  } catch (error) {
    //display the error in the terminal
    console.error(error);

    //send an error response
    res.status(500).send("Login failed");
  }
});


//start the server on port 3001
app.listen(3001, () => {
  //display a message when the server starts
  console.log("Server running on http://localhost:3001");
});