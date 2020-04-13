'use strict'
require('dotenv').config()
const express     = require('express')
const bodyParser  = require('body-parser')
const fccTesting  = require('./freeCodeCamp/fcctesting.js')
const path        = require('path')
const favicon     = require('serve-favicon')
const session     = require('express-session')
const passport    = require('passport')
const ObjectID    = require('mongodb').ObjectID
const mongo       = require('mongodb').MongoClient

const app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')))
fccTesting(app) //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'pug')
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}))
app.use(passport.initialize())
app.use(passport.session())
// Connect to DB
const mongodbOption = { useUnifiedTopology: true }

mongo.connect(process.env.DATABASE, mongodbOption, (err, db) => {
  if(err) {
    console.log('Database error: ' + err)
  } else {
    console.log('Successful database connection')
    //serialization and app.listen
    passport.serializeUser((user, done) => {
      done(null, user._id)
    })
    passport.deserializeUser((id, done) => {
      const _id = new ObjectID(id)
      db.collection('users').findOne({_id}, (err, user) => {
            done(null, user)
      })
    })
  }
})

// GET Home page
app.get('/', async(req, res, next) => {
    try {
      const view = await path.join(process.cwd(), '/views/pug/index.pug')
      const data = { title: 'Hello', message: 'Please login' }
      res.render(view, data)
    } catch (error) {
      next(error)
    }
})

// Route not found (404)
app.use((req, res, next) => res.status(404).type("text").send("Not Found"))

// 500 - Any server error
app.use((err, req, res, next) => res.status(500).send({ error: err }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Listening on port " + PORT))
