import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import env from "dotenv";
import express from "express";
import passport from "passport";
import pg from "pg";
import session from "express-session";
import { Strategy } from "passport-local";

const app = express();
const port = 5000;
const saltRounds = 10;
env.config();

const { Pool } = pg;
const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 4,
      httpOnly: true,  // Ensure the cookie is only accessible by the server
      secure: false    // Set this to true if you're using https (for production)
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

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
    userData: users_db_data,
  });
});

app.get("/login", (req, res) => {
  res.render("login.ejs"); // Render login page
});

app.get("/register", (req, res) => {
  res.render("register.ejs")
});

app.get("/loggedinpage", (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("loggedinpage.ejs", {
      reportedUsername: req.user.username,  // Pass the username here
      confirmRegistration: heading,         // Pass confirmRegistration if available
    });
  } else {
    res.redirect("/login")
  }
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
            'INSERT INTO users (username, email, password, height, birthdate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [desiredUsername,
                  req.body.email,
                  hash,
                  req.body.height,
                  req.body.birthdate
                ]
              ); 
          const user = result.rows[0];
          heading = "You have been successfully registered!";
          req.login(user, (err) => {
            console.log(err);
            // Pass both `reportedUsername` and `confirmRegistration` here
            res.render("loggedinpage.ejs", {
              reportedUsername: user.username,
              confirmRegistration: heading});
          })
        };
      });
    }
  } catch (err) {
    console.error('Error inserting data:', err);
  }  
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/loggedinpage",
  failureRedirect: "/login"
}));

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

passport.use(
  new Strategy(async function verify(username, password, cb) {
  try {
    const checkUsername = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (checkUsername.rows.length > 0) {
      const user = checkUsername.rows[0];
      const storedHashedPassword = user.password;

      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          return cb(err);
        } else {
          if (result) {
            return cb(null, user);
          } else {
            return cb(null, false);
          }
        }
      })
    // Database data insertion
    } else {
      return cb("User not found.");
    }
  } catch (err) {
    return cb(err);
  }  
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});