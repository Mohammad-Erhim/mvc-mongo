const express = require("express");
const { body, check } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");
const isGuest = require("../middleware/is-guest");
const isAuth = require("../middleware/is-auth");
const router = express.Router();

router.get("/login", isGuest, authController.getLogin);
router.post(
  "/login",
  isGuest,
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
    body("password", "Password has to be valid.")
      .isLength({ min: 5, max: 10 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.get("/signup", isGuest, authController.getSignup);
router.post(
  "/signup",
  isGuest,
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "E-Mail exists already, please pick a different one."
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post("/logout", isAuth, authController.postLogout);

router.get("/reset", isGuest, authController.getReset);
router.post("/reset", isGuest, authController.postReset);

router.get("/reset/:token", isGuest, authController.getNewPassword);
router.post(
  "/new-password",
  [
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  isGuest,
  authController.postNewPassword
);

module.exports = router;
