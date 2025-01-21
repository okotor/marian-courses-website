import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import env from "dotenv";
import express from "express";
import GoogleStrategy from "passport-google-oauth2";
import passport from "passport";
import pg from "pg";
import session from "express-session";
import { Strategy } from "passport-local";

const app = express();
const port = 5000;
const saltRounds = 10;
env.config();

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const { Pool } = pg;
const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

let heading;


app.get("/", (req, res) => {
  res.render("index.ejs", {
    user: req.user
  });
});

app.get("/login", (req, res) => {
  res.render("login.ejs", {
    user: req.user
  });
});

// Make it work
app.get("/adminlogin", (req, res) => {
  res.render("adminlogin.ejs", {
    user: req.user
  });
});

app.get("/register", (req, res) => {
  res.render("register.ejs", {
    user: req.user
  });
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/loggedinpage", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("loggedinpage.ejs", {
      reportedUsername: req.user.username, 
      confirmRegistration: heading,
      user: req.user,         
    });
  } else {
    res.redirect("/login");
  }
});

// Make it work
app.get("/adminloggedin", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("adminloggedin.ejs", {
      adminUsername: req.user.username, 
      confirmRegistration: heading,
      user: req.user,         
    });
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
  scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/loggedinpage",
  passport.authenticate("google", {
    successRedirect: "/loggedinpage",
    failureRedirect: "/login",
  })
);

app.get("/auth/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true,
      username: req.user.username 
      });
  } else {
    res.json({ authenticated: false });
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/loggedinpage",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const desiredUsername = req.body.username;
  const desiredPassword = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE username = $1", [
      desiredUsername,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Username already exists. Try logging in.");
    } else {
      bcrypt.hash(desiredPassword, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
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

// PUT method here (replace user data)
  // 1. logic
  // 2. alert box asking the user to rewrite data?

// DELETE method here
// 1. logic
// 2. alert box asking "Are you sure?"¨

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
  try {
    const checkUsername = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (checkUsername.rows.length > 0) {
      const user = checkUsername.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, valid) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return cb(err);
        } else {
          if (valid) {
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

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/loggedinpage",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    }, 
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
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
