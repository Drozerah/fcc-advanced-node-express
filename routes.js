const passport = require('passport')
const bcrypt   = require('bcrypt')

// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect("/")
}

module.exports = function (app, db) {

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
            // hash password with bcrypt
            const hash = bcrypt.hashSync(req.body.password, 12)
            db.collection("users").insertOne({
                username: req.body.username,
                password: hash
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
}