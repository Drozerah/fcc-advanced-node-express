'use strict'
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const fccTesting = require('./freeCodeCamp/fcctesting.js')
const path = require('path')
const favicon = require('serve-favicon')
const session = require('express-session')
const passport = require('passport')
const ObjectID = require('mongodb').ObjectID
const mongo = require('mongodb').MongoClient
const LocalStrategy = require('passport-local')
// const cors          = require('cors')

const app = express()
fccTesting(app) //For FCC testing purposes
app.set('view engine', 'pug')
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')))
// app.use(cors())
app.use('/public', express.static(process.cwd() + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}))
app.use(passport.initialize())
app.use(passport.session())

mongo.connect(
  process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  (err, connection) => {
    if (err) console.log("Database error: " + err)
    else {
      console.log("Successful database connection")

      const db = connection.db()

      // Serialization
      passport.serializeUser((user, done) => {
        return done(null, user._id)
      })

      // Deserialize user
      passport.deserializeUser((id, done) => {
        const _id = new ObjectID(id)
        db.collection("users").findOne({
          _id
        }, (err, doc) => {
          done(null, doc)
        })
      })

      // Use passport local strategy
      passport.use(new LocalStrategy((username, password, done) => {
          db.collection("users")
            // * find user by username in db
            .findOne({ username: username }, (err, user) => {
              console.log("User " + username + " attempted to log in.")
              if (err) {
                return done(err)
              }
              if (!user) {
                return done(null, false)
              }
              // * check for the password to match
              if (password !== user.password) {
                // console.log('Password don\'t math') // !DEBUG
                return done(null, false)
              }
              // * user is authenticated
              return done(null, user)
            })
        })
      )

      // Check if user is authenticated
      function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
          return next()
        }
        res.redirect("/")
      }

      // GET Home page
      app.route("/").get((req, res) =>
        res.render(process.cwd() + "/views/pug/index.pug", {
          title: "Hello",
          message: "Please login",
          showLogin: true,
          showRegistration: true
        })
      )

      // POST Login page
      app.route("/login").post(
        passport.authenticate("local", {
          failureRedirect: "/"
        }),
        (req, res) => {
          res.redirect("/profile")
        }
      )

      // GET Profile
      app.route("/profile").get(ensureAuthenticated, (req, res) =>
        res.render(process.cwd() + "/views/pug/profile", {
          username: req.user.username
        })
      )

      // POST Register
      app.route("/register").post((req, res, next) => {
          // Query database with a findOne command
          db.collection("users").findOne({username: req.body.username}, (err, user) => {
              // console.log('[query database]') // !DEBUG
              if (err) {
                next(err)
              } else if (user) {
                // if user is returned then it exists and redirect back to home
                // console.log(`[obj already exists in db]\n${JSON.stringify(user, null, ' ')} `) // !DEBUG
                // console.log('[redirect to home page]') // !DEBUG
                res.redirect("/")
              } else {
                // const newUser = JSON.stringify(req.body, null, ' ')
                // console.log(`[obj is a new user]\n${newUser}`) // !DEBUG
                // if user is undefined and no error occurs then 'insertOne' into the database
                // with the username and password and as long as no errors occur then call next to go to step 2
                // console.log('[insert new user in db]') // !DEBUG
                db.collection("users").insertOne({
                    username: req.body.username,
                    password: req.body.password
                  },
                  (err, doc) => {
                    if (err) {
                      // console.log('[error insert redirection]') // !DEBUG
                      // console.log('[redirect to home page]') // !DEBUG
                      res.redirect("/")
                    } else {
                      // console.log(`[callback - db insert done]\n[status = ${user.result.ok}]`) // !DEBUG
                      next(null, user)
                    }
                  }
                )
              }
            }
          )
        },
        passport.authenticate("local", { failureRedirect: "/" }),
        (req, res, next) => {
          // console.log('[authenticate success]') // !DEBUG
          // console.log('[redirect to user profile]') // !DEBUG
          res.redirect("/profile")
        }
      )

      // Get logout
      app.route("/logout").get((req, res) => {
        req.logout()
        res.redirect("/")
      })

      // 404 - not found
      app.use((req, res, next) => res.status(404).type("text").send("Not Found"))
      // 500 - Any server error
      app.use((error, req, res, next) => res.status(500).send({
        error
      }))
      // Start server
      const PORT = process.env.PORT || 3000
      app.listen(PORT, () => console.log("Listening on port " + PORT))
    }
  }
)