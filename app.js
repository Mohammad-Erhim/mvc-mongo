require("dotenv").config();
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const schedule = require("node-schedule");

const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const adminRoutes = require("./routes/admin");
const User = require("./models/user");
const { removeUnSubmitedFiles } = require("./util/scheduling");

const MONGODB_URI =  process.env.MONGODB_URI;
  

const rule = new schedule.RecurrenceRule();
rule.second = 0;
// rule.hour = 1;
schedule.scheduleJob(rule, removeUnSubmitedFiles);
const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",

  expires: 1000 * 500,
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    let ext = file.originalname.substring(
      file.originalname.lastIndexOf("."),
      file.originalname.length
    );

    cb(null, new Date().getTime() + Math.random() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: { maxAge: 500000 * 1000 },
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use(shopRoutes);
app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use(function (  req, res, next) {
 
  res.status(404).render("err", { status: 404 });
});
app.use(function (err, req, res, next) {
  res.status(500).render("err", { status: 500 });
 
});
mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    app.listen(process.env.PORT ||3000);
  })
  .catch((err) => {
    console.log(err);
  });
