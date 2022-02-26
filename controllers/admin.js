const { validationResult } = require("express-validator");
const Product = require("../models/product");
const fileHelper = require("../util/file");

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })

    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getAddProduct = (req, res, next) => {
  res.render("admin/product-form", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};
exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    return res.status(422).render("admin/product-form", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached file is not an image.",
      validationErrors: [],
    });
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/product-form", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }
  const imageUrl = image.path;
  try {
    const product = new Product({
      title: title,
      price: price,
      description: description,
      imageUrl: imageUrl,
      userId: req.user,
    });
    await product.save();

    res.redirect("/");
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getEditProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/product-form", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: true,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  try {
    const product = await Product.findById(prodId);
    if (!errors.isEmpty()) {
      return res.status(422).render("admin/product-form", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: true,
        hasError: true,
        product: {
          title: updatedTitle,
          price: updatedPrice,
          description: updatedDesc,
          imageUrl: product.imageUrl,
          _id: prodId,
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array(),
      });
    }

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.redirect("/");
    }
    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;
    if (image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }
    await product.save();

    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })

    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        next(new Error("product is not exist"));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      res.redirect("/admin/products");
    })
    .catch((err) => {
      next(err);
    });
};
