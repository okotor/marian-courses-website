import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const { Pool } = pg;
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "godbless",
  password: "123456",
  port: 5432,
});

const app = express();
const port = 5000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
// const URL_API = ...

let heading;
var users_db_data = [];

async function loadAllDBData() {
  try {
    const result = await db.query('SELECT * FROM users');
    return result.rows;
  } catch (err) {
    console.error('Error fetching data:', err);
    return [];
  }
}

app.get("/", async (req, res) => {
  users_db_data = await loadAllDBData();
  res.render("index.ejs", {
    confirmRegistration: heading,
    userData: users_db_data,
  });
});

app.get("/login", (req, res) => {
  res.render("login.ejs"); // Render login page
});

app.get("/loggedinpage", (req, res) => {
  res.render("loggedinpage.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs")
});

app.post("/register", async (req, res) => {
  const desiredUsername = req.body.username
  const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
    desiredUsername,
  ]);

  // Database data insertion
  if (checkResult.rows.length > 0) {
    res.send("Username already exists. Try logging in.");
  } else {
  try {
    const result = await db.query(
      'INSERT INTO users (id, username, email, password, height, birthdate) VALUES ($1, $2, $3, $4, $5, $6)',
          [users_db_data.length + 1,
            desiredUsername,
            req.body.email,
            req.body.password,
            req.body.height,
            req.body.birthdate
          ]
        ); 
    heading = `${desiredUsername}, you have been
       successfully registered!`;
  } catch (err) {
    console.error('Error inserting data:', err);
   }
  res.redirect("/loggedinpage");
  console.log(users_db_data[users_db_data.length]);
  }
});

app.post("/login", async (req, res) => {
  const username = req.body.username
  const password = req.body.password
  console.log(username);
  console.log(password);
});

app.post("/submit", async (req, res) => {
  // Check if the username is unique & less than 25 characters
  const desiredUsername = req.body["username"];
  const existingUser = users_db_data.find(
    user => user.username === desiredUsername
  );
  if (existingUser) {
    console.log("Username is already taken, try a different one.");
    return res.render("index.ejs", {
    confirmRegistration: null,
    userData: users_db_data,
    error: "Username is already taken, try a different one." 
  });
  } 
  // Check if the username is less than 25 characters 
  if (desiredUsername.length > 25) {
    console.log("Username must be less than 25 characters.");
    return res.render("index.ejs", {
      confirmRegistration: null,
      userData: users_db_data,
      error: "Username must be less than 25 characters." 
    }); 
  }
  // Database data insertion
  try {
    const result = await db.query(
      'INSERT INTO users (id, username, sex, height, birthdate) VALUES ($1, $2, $3, $4, $5)',
          [users_db_data.length + 1,
            desiredUsername,
            req.body.sex,
            req.body.height,
            req.body.birthdate
          ]
        ); 
    heading = `${desiredUsername}, you have been
       successfully registered!`;
  } catch (err) {
    console.error('Error inserting data:', err);
   }
  res.redirect("/");
  console.log(users_db_data[users_db_data.length]);

  // // Saving form data in USERS list
  // const { username, sex, height, birthdate } = req.body;
  // // Add a new user to the array
  // const newUser = {
  //   id: users_db_data.length + 1, // Incremental ID
  //   username: username,
  //   sex: sex,
  //   height: height,
  //   birthdate: birthdate,
  // };
  // users_db_data.push(newUser);
  // heading = `${username}, you have been
  //      successfully temporarily registered!`;
});


// PUT method here (replace user data)
  // 1. logic
  // 2. alert box asking the user to rewrite data?

// DELETE method here
// 1. logic
// 2. alert box asking "Are you sure?"

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// var users = [
//   {
//     id: 1,
//     username:
//       "Jeshuillo",
//     sex: "male",
//     height: "250",
//     birthdate: "0014-12-25",
//   },
//   {
//     id: 2,
//     username:
//       "Immaculillo",
//     sex: "female",
//     height: "249",
//     birthdate: "0000-12-08",
//   },
//   {
//     id: 3,
//     username:
//       "Tomadillo",
//     sex: "male",
//     height: "193",
//     birthdate: "1913-02-13",
//   },
//   {
//     id: 4,
//     userame:
//       "Marumillo",
//     sex: "female",
//     height: "173",
//     birthdate: "2002-11-29",
//   }
// ];