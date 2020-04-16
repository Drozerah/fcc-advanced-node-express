'use strict'
require('dotenv').config()
const express          = require('express')
const bodyParser       = require('body-parser')
const fccTesting       = require('./freeCodeCamp/fcctesting.js')
const path             = require('path')
const favicon          = require('serve-favicon')
const session          = require('express-session')
const passport         = require('passport')
const mongo            = require('mongodb').MongoClient
const routes           = require('./routes.js')
const auth             = require('./auth.js')
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

      auth(app, db)

      routes(app, db)
      
      // 404 - not found
      app.use((req, res, next) => res.status(404).type("text").send("Not Found"))

      // 500 - Any server error
      app.use((error, req, res, next) => res.status(500).send({ error }))

      // Start server
      const PORT = process.env.PORT || 3000
      app.listen(PORT, () => console.log("Listening on port " + PORT))
    }
  }
)