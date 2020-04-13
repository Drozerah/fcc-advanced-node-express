'use strict'
require('dotenv').config()
const express       = require('express')
const bodyParser    = require('body-parser')
const fccTesting    = require('./freeCodeCamp/fcctesting.js')
const path          = require('path')
const favicon       = require('serve-favicon')
const session       = require('express-session')
const passport      = require('passport')
const ObjectID      = require('mongodb').ObjectID
const mongo         = require('mongodb').MongoClient
const LocalStrategy = require('passport-local')

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

mongo.connect(process.env.DATABASE, mongodbOption)
  .then(connection => {
    console.log('Successful database connection')
    return connection.db()
  })
  .then(db => {

    // Serialization
    passport.serializeUser((user, done) => {
      done(null, user._id)
    })

    // Deserialize user
    passport.deserializeUser((id, done) => {
      const _id = new ObjectID(id)
      db.collection('users').findOne({_id}, (err, user) => {
            done(null, user)
      })
    })

    // Use passport local strategy
    passport.use(new LocalStrategy((username, password, done) => {
      db.collection('users')
        .findOne({ username: username }, (err, user) => {
          console.log('User '+ username +' attempted to log in.')
          if (err) { return done(err) }
          if (!user) { return done(null, false) }
          if (password !== user.password) { return done(null, false) }
          return done(null, user)
        })
    }))

    // GET Home page
    app.get('/', async(req, res, next) => {
      try {
        const view = await path.join(process.cwd(), '/views/pug/index.pug')
        const data = { title: 'Hello', message: 'Please login', showLogin: true }
        return res.render(view, data)
      } catch (error) {
        return next(error)
      }
    })
    
    // POST Login page
    app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), async(req, res, next) => {
      try {
        const user = await req.user
      } catch (error) {
        return next(error)
      }
    })
    
    // 404 - not found
    app.use((req, res, next) => res.status(404).type("text").send("Not Found"))
    // 500 - Any server error
    app.use((error, req, res, next) => res.status(500).send({ error }))
    // Start server
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => console.log("Listening on port " + PORT))

  })
  .catch(err => {
    console.log('Error in connecting to mongoDb: ' + err)
  })