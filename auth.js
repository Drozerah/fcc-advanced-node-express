const passport         = require('passport')
const LocalStrategy    = require('passport-local')
const bcrypt           = require('bcrypt')
const ObjectID         = require('mongodb').ObjectID

module.exports = function (app, db) {

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
          // * bcrypt password comparison
          if (!bcrypt.compareSync(password, user.password)) {
            // console.log('Password don\'t math') // !DEBUG
            return done(null, false)
          }
          // * user is authenticated
          // console.log('user is found') // !DEBUG
          return done(null, user)
        })
    })
  )
}