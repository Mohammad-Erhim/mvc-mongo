const fs = require("fs");
const path = require("path");
const Product = require("../models/product");
const FileHelper = require("./file");
const pathHelper = require("./path");
const directoryPath = path.join(pathHelper, "images");
exports.removeUnSubmitedFiles = () =>
  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }

    files.forEach(async function (file) {
      const expectedImageUrl = "images\\" + file;

      const DOB = +file.split(".")[0];
      const TIME = 60 * 60 * 1000;
      if (Date.now() > DOB) {
        const product = await Product.findOne({ imageUrl: expectedImageUrl });
        if (product) return;
        FileHelper.deleteFile(expectedImageUrl);
      }
    });
  });
