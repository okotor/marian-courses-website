import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

const app = express();
const port = 5000;
const saltRounds = 10;

const { Pool } = pg;
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "godbless",
  password: "123456",
  port: 5432,
});

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
  console.log(users_db_data.length)
  res.render("index.ejs", {
    userData: users_db_data,
    confirmRegistration: null, // Ensure confirmRegistration is always passed
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
  const desiredPassword = req.body.password
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
      desiredUsername,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Username already exists. Try logging in.");
    // Database data insertion
    } else {
      //Password Hashing
      bcrypt.hash(desiredPassword, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error hashing password:", err);
        } else {
          const result = await db.query(
            'INSERT INTO users (username, email, password, height, birthdate) VALUES ($1, $2, $3, $4, $5)',
                [desiredUsername,
                  req.body.email,
                  hash,
                  req.body.height,
                  req.body.birthdate
                ]
              ); 
          heading = `${desiredUsername}, you have been
            successfully registered!`;
          res.render("index.ejs", {confirmRegistration: heading});
        };
      });
    }
  } catch (err) {
    console.error('Error inserting data:', err);
  }  
});

app.post("/login", async (req, res) => {
  const reportedUsername = req.body.username
  const attemptedPassword = req.body.password

  try {
    const checkUsername = await db.query("SELECT * FROM users WHERE username = $1", [
    reportedUsername,
  ]);
    if (checkUsername.rows.length > 0) {
      const user = checkUsername.rows[0];
      const storedPassword = user.password;

      if (attemptedPassword === storedPassword) {
        res.render("loggedinpage.ejs", {reportedUsername});
      } else {
        res.send("Incorrect Password");
      }
    // Database data insertion
    } else {
      res.send("User not found!");
    }
  } catch (err) {
  console.error('Error inserting data:', err);
 }
});

// app.post("/submit", async (req, res) => {
//   // Check if the username is unique & less than 25 characters
//   const desiredUsername = req.body["username"];
//   const existingUser = users_db_data.find(
//     user => user.username === desiredUsername
//   );
//   if (existingUser) {
//     console.log("Username is already taken, try a different one.");
//     return res.render("index.ejs", {
//     confirmRegistration: null,
//     userData: users_db_data,
//     error: "Username is already taken, try a different one." 
//   });
//   } 
//   // Check if the username is less than 25 characters 
//   if (desiredUsername.length > 25) {
//     console.log("Username must be less than 25 characters.");
//     return res.render("index.ejs", {
//       confirmRegistration: null,
//       userData: users_db_data,
//       error: "Username must be less than 25 characters." 
//     }); 
//   }
//   // Database data insertion
//   try {
//     const result = await db.query(
//       'INSERT INTO users (username, sex, height, birthdate) VALUES ($1, $2, $3, $4, $5)',
//           [users_db_data.length + 1,
//             desiredUsername,
//             req.body.sex,
//             req.body.height,
//             req.body.birthdate
//           ]
//         ); 
//     heading = `${desiredUsername}, you have been
//        successfully registered!`;
//   } catch (err) {
//     console.error('Error inserting data:', err);
//    }
//   res.redirect("/");
//   console.log(users_db_data[users_db_data.length]);

//   // // Saving form data in USERS list
//   // const { username, sex, height, birthdate } = req.body;
//   // // Add a new user to the array
//   // const newUser = {
//   //   id: users_db_data.length + 1, // Incremental ID
//   //   username: username,
//   //   sex: sex,
//   //   height: height,
//   //   birthdate: birthdate,
//   // };
//   // users_db_data.push(newUser);
//   // heading = `${username}, you have been
//   //      successfully temporarily registered!`;
// });


// PUT method here (replace user data)
  // 1. logic
  // 2. alert box asking the user to rewrite data?

// DELETE method here
// 1. logic
// 2. alert box asking "Are you sure?"

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});