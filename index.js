const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Sequelize = require('sequelize');

// Create an Express application
const app = express();

// This secret will be used to sign and encrypt cookies
const COOKIE_SECRET = 'cookie secret';

//connexion a la base de donnée
const db = new Sequelize('test', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = db.define('user', {
    username : { type: Sequelize.STRING } ,
    password : { type: Sequelize.STRING }
});

const Review = db.define('review', {
    game : { type: Sequelize.STRING } ,
    description : { type: Sequelize.STRING }
});

const Comment = db.define('comment', {
    avis: { type: Sequelize.STRING },
});

Review.hasMany(Comment);
Comment.belongsTo(Review);


db.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

// Use Pug for the views
app.set('view engine', 'pug');
// Parse form data content so it's available as an object through
// request.body
app.use(bodyParser.urlencoded({ extended: true }));
// Parse cookies so they're attached to the request as
// request.cookies
app.use(cookieParser(COOKIE_SECRET));

passport.use(new LocalStrategy((username, password, done) => {
    User
        .findOne({
            where: {username, password}
        }).then(function (user) {
        if (user) {
            return done(null, user)
        } else {
            return done(null, false, {
                message: 'Invalid credentials'
            });
        }
    })
        .catch(done);
}));

passport.serializeUser((user, cookieBuilder) => {
    cookieBuilder(null, user.username);
});

passport.deserializeUser((username, cb) => {
    console.log("AUTH ATTEMPT",username);
    // Fetch the user record corresponding to the provided email address
    User.findOne({
        where : { username }
    }).then(r => {
        if(r) return cb(null, r);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

// Parse cookies so they're attached to the request as
// request.cookies
app.use(cookieParser(COOKIE_SECRET));

// Parse form data content so it's available as an object through
// request.body
app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize passport, it must come after Express' session() middleware
app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
    if (req.user) {
        Review.findAll({include:[Comment]}).then((reviews) => {
            res.render('home', {
                reviews: reviews,
                user: req.user
            });
        });



    } else {
        User.findAll().then((users) => {
            res.render('home', {
                users: users
            });
        });
    }
});


app.get('/login', (req, res) => {
    // Render the login page
    res.render('login');
});




app.post('/login',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/login'
    })
);
app.get('/com', (req, res) => {
    // Render the login page
    res.render('com');
});

app.post('/com', (req, res) => {
    const game = req.body.game;
    const description = req.body.description;
    Review
        .create({
            game: game,
            description: description
        })
        .then((review) => {
            req.login(review, () => {
                res.redirect('/');
            })
        })
});




app.get('/inscription', (req, res) => {
    // Render the login page
    res.render('inscription');
});

app.post('/inscription', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    User
        .create({
            username: username,
            password: password
        })
        .then((user) => {
            req.login(user, () => {
                res.redirect('/');
            })
        })
});

app.get('/comment',(req,res) => {
    res.render('comment');
});

app.post('/comment/:reviewId', (req, res) => {
    const { avis } = req.body;
    Comment
        .sync()
        .then(() => Comment.create({ avis, reviewId: req.params.reviewId, userId: req.user.id }))
        .then(() => res.redirect('/'));
});



app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});



app.listen(3000);