const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user");
const mailgun = require("mailgun-js");

const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: null,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password.",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
      });
    }
    const doMatch = await bcrypt.compare(password, user.password);

    if (doMatch) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      return req.session.save((err) => {
        res.redirect("/");
      });
    }
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: "Invalid email or password.",
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: [],
    });
  } catch (err) {
    next(err);
  }
};
exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Sign Up",
    errorMessage: null,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.postSignup = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  console.log(email);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: hashedPassword,
      cart: [],
    });
    user.save().then((_) => res.redirect("/login"));
  } catch (err) {
    next(err);
  }
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  let oldEmail = req.flash("email");
  if (oldEmail.length > 0) {
    oldEmail = oldEmail[0];
  } else {
    oldEmail = null;
  }
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
    oldInput: {
      email: oldEmail,
    },
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      return res.redirect("/reset");
    }

    const token = buffer.toString("hex");
    try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
        req.flash("error", "No account with that email found.");
        req.flash("email", req.body.email);
        return res.redirect("/reset");
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      user.save();
      mg.messages().send({
        to: req.body.email,
        from: "shop@node-complete.com",
        subject: "Password reset",
        html: `
                <p>You requested a password reset</p>
                <p>Click this <a href="${process.env.APP_URL}/update-password/${token}">link</a> to set a new password.</p>
              `,
      });
      res.redirect("/");
    } catch (error) {
      next(error);
    }
  });
};

exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token,
      oldInput: { password: null },
    });
  } catch (err) {
    next(err);
  }
};

exports.postNewPassword = async (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: errors.array()[0].msg,
      userId: userId,
      passwordToken: passwordToken,
      oldInput: { password: newPassword },
    });
  try {
    const user = await User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId,
    });

    resetUser = user;
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;

    await resetUser.save();

    res.redirect("/login");
  } catch (err) {
    next(err);
  }
};
