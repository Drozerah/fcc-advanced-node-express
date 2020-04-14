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
const cors          = require('cors')

const app = express()
fccTesting(app) //For FCC testing purposes
// require https
app.use((req, res, next) => {
  if (req.hostname !== 'localhost' && req.get('X-Forwarded-Proto') !== 'https') {
    return res.redirect(`https://${req.hostname}${req.url}`)
  }
  return next()
})
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')))
app.use(cors())
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

mongo.connect(process.env.DATABASE, mongodbOption, (err, client) => {
  if (err) {
    
    console.log('Database error: ' + err)
    
  } else {
    console.log('Successful database connection')
    const db =  client.db()

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
        // * find user by username in db
        .findOne({ username: username }, (err, user) => {
          console.log('User '+ username +' attempted to log in.')
          if (err) { return done(err) }
          if (!user) { return done(null, false) }
          // * check for the password to match
          if (password !== user.password) {
            console.log('Password don\'t math') // !DEBUG
            return done(null, false) 
          }
          // * user is authenticated
          return done(null, user)
        })
    }))

    // app.use((req, res, next) => {
    //   const { method, url } = req
    //   console.log(`[request] ${method} - ${url}`) // !DEBUG
    //   next()
    // })

    // GET Home page
    app.get('/', (req, res, next) => {
      // try {
      //   const view = await path.join(process.cwd(), '/views/pug/index.pug')
      //   const data = { title: 'Hello', message: 'Please login', showLogin: true }
      //   return res.render(view, data)
      // } catch (error) {
      //   return next(error)
      // }
      // const view = path.join(process.cwd(), '/views/pug/index.pug')
      // const data = { title: 'Hello', message: 'Please login', showLogin: true }
      res.render(
        path.join(process.cwd(), '/views/pug/index.pug'),
        { 
          title: 'Home Page',
          message: 'Please login',
          showLogin: true
        }
      )
    })

    // POST Login page
    app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
      // try {
      //   const user = await req.user
      //   console.log(user) // !DEBUG
      //   res.redirect('/profile')
      // } catch (error) {
      //   return next(error)
      // }
      res.redirect('/profile')
    })

    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) {
        return next()
      }
      res.redirect('/')
    }

    // GET Profile
    app.route('/profile')
      .get(ensureAuthenticated, (req, res) => {
        res.render(process.cwd() + '/views/pug/profile')
    })
    
    // 404 - not found
    app.use((req, res, next) => res.status(404).type("text").send("Not Found"))
    // 500 - Any server error
    app.use((error, req, res, next) => res.status(500).send({ error }))
    // Start server
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => console.log("Listening on port " + PORT))
  }
})
