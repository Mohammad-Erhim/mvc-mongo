const express = require('express');

const shopController = require('../controllers/shop');
 
const isAuth = require("../middleware/is-auth");
const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', shopController.getCart);
router.post('/cart', shopController.postCart);

router.post('/delete-product-cart', shopController.postDeleteProductCart);

router.post('/create-order', isAuth, shopController.postOrder);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);
router.post('/delete-order', shopController.postDeleteOrder);

module.exports = router;