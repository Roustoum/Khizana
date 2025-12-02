const express = require("express");
const cartRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const CustomError = require('../utils/customError');
const Cart = require('../models/CartModel')
const Book = require('../models/BooksModel'); const BookUser = require("../models/BookUserModel");
;

cartRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    const cart = await Cart.find({ user: req.user.id, ispayed: false });
    res.status(200).send({ success: true, cart });
});

cartRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["book"], true, []);

    const userBook = await BookUser.findOne({ user: req.user.id, book: req.body.book });
    if (userBook) throw new CustomError("انت تمتلك هذا الكتاب", 500);

    const book = await Book.findOne({ _id: req.body.book, is_active: true });
    if (!book) throw new CustomError("الكتاب المحدد غير موجود", 404);

    const findCart = await Cart.findOne({ user: req.user._id, book: req.body.book, ispayed: false });
    if (findCart) throw new CustomError("الكتاب موجود بالفعل في السلة", 500);

    req.body.user = req.user._id;
    const cart = new Cart(req.body);
    await cart.save();
    res.status(200).send({ success: true, cart });
});

cartRouter.delete("/id/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    const cart = await Cart.findOne({ _id: req.params.id, user: req.user._id });
    if (!cart) throw new CustomError("السلة المحددة غير موجودة", 404);
    await cart.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف المنتج بنجاح" });
});

cartRouter.delete("/all", authMidleware, BanMiddleware, async (req, res, next) => {
    const cart = await Cart.deleteMany({ user: req.user.id, ispayed: false });
    res.status(200).send({ success: true, message: "تم حذف السلة بنجاح" });
});

module.exports = cartRouter;