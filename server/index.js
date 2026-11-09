//import crypto for password hashing
import crypto from "crypto";

//import express
import express from "express";

//import cors
import cors from "cors";

//store login sessions on the server
import session from "express-session";
import { fileURLToPath } from "url";

//import the database connection
import db from "./db.js";

//create the express application
const app = express();

//allow express to read html form data
app.use(express.urlencoded({ extended: true }));

//allow react to communicate with the backend
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

//allow the server to read json data
app.use(express.json());

//use a browser-session cookie and keep passwords out of the session
app.use(session({
  name: "shelter.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }
}));

//share the account page theme with the backend profile page
app.get("/account.css", (req, res) => {
  res.sendFile(fileURLToPath(new URL("../public/account.css", import.meta.url)));
});

//escape account text before including it in html
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

//let the homepage display the current session's username
app.get("/api/session", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ user: req.session.user || null });
});

//only logged-in users can open their profile
app.get("/profile", (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!req.session.user) return res.redirect("http://localhost:5173/login.html");
  const username = escapeHtml(req.session.user.username);
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your profile | Animal Shelter</title>
  <link rel="stylesheet" href="/account.css" />
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <div class="header-inner page-width">
      <a class="brand" href="http://localhost:5173/">
        <span class="brand-mark" aria-hidden="true">AS</span>
        <span>Animal Shelter<small>Placeholder shelter name</small></span>
      </a>
      <nav class="main-nav" aria-label="Main navigation">
        <a href="http://localhost:5173/">Home</a>
        <a href="http://localhost:5173/#find-an-animal">Find an Animal</a>
      </nav>
      <nav class="account-links" aria-label="Account">
        <a href="/profile" aria-current="page">My profile</a>
        <a href="/logout">Logout</a>
      </nav>
    </div>
  </header>
  <main id="main-content" class="account-main page-width">
    <section class="account-card" aria-labelledby="profile-heading">
      <p class="eyebrow">Your account</p>
      <h1 id="profile-heading">Welcome, ${username}!</h1>
      <p>You are logged in as <strong>${username}</strong>.</p>
      <p><a href="http://localhost:5173/#find-an-animal">Find an animal</a></p>
      <p><a href="/logout">Logout</a></p>
    </section>
  </main>
</body>
</html>`);
});

//destroy the server session and remove its browser cookie
app.get("/logout", (req, res) => {
  res.set("Cache-Control", "no-store");
  req.session.destroy((error) => {
    if (error) return res.status(500).send("Logout failed. Please try again.");
    res.clearCookie("shelter.sid", {
      path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production"
    });
    res.redirect("http://localhost:5173/login.html");
  });
});

//create the home route
app.get("/", (req, res) => {
  //send a message to the browser
  res.send("My backend is working!");
});

//create a route to get all animals
app.get("/api/animals", async (req, res) => {
  try {
    //return only public fields so future staff notes stay private
    const [rows] = await db.query("SELECT id, name, species, age, breed_type FROM animals");

    //send the animals to react
    res.json(rows);
  } catch (error) {
    //display the error
    console.error(error);

    //send an error response
    res.status(500).json({ error: "Database connection failed" });
  }
});

//get one animal using a parameterized query
app.get("/api/animals/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ error: "Invalid animal ID" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, name, species, age, breed_type, description, ideal_home, care_needs FROM animals WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Animal not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Animal profile request failed:", error.code);
    res.status(500).json({ error: "Could not load animal profile" });
  }
});

 //handle user registration
app.post("/register", async (req, res) => {

  //get the values submitted by the form
  const { username, email, password } = req.body;

  //check that all fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    //check whether the username or email already exists
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    //stop registration if the account already exists
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Username or email already exists." });
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

    //let the registration form show a popup and return home
    res.status(201).json({ message: "You have successfully registered! You can now log in." });

  } catch (error) {
    //display the error in the terminal
    console.error(error);

    //send an error message
    res.status(500).json({ error: "Registration failed" });
  }
});

 //handle user login
app.post("/login", async (req, res) => {

  //get the username and password from the form
  const { username, password } = req.body;

  //check that both fields were provided
  if (!username || !password) {
    return res.status(401).json({ error: "The login credentials were incorrect." });
  }

  try {
    //find the user in the database
    const [users] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    //check if the username exists
    if (users.length === 0) {
      return res.status(401).json({ error: "The login credentials were incorrect." });
    }

    //get the saved password hash and salt
    const savedHash = users[0].password_hash;
    const salt = users[0].salt;

    //check if the user has a valid saved salt
    if (!salt) {
      return res.status(401).json({ error: "The login credentials were incorrect." });
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
      return res.status(401).json({ error: "The login credentials were incorrect." });
    }

    //replace any previous session after checking the password
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: "Login failed. Please try again." });

      //save only the user's id and username
      req.session.user = { id: users[0].id, username: users[0].username };
      req.session.save((error) => {
        if (error) return res.status(500).json({ error: "Login failed. Please try again." });
        res.json({ message: `Welcome, ${users[0].username}!`, user: req.session.user });
      });
    });

  } catch (error) {
    //display the error in the terminal
    console.error(error);

    //send an error response
    res.status(500).json({ error: "Login failed" });
  }
});


//start the server on port 3001
app.listen(3001, () => {
  //display a message when the server starts
  console.log("Server running on http://localhost:3001");
});
