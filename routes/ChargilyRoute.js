require("dotenv").config({ quiet: true });
const express = require('express');
const chargilyRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const CustomError = require('../utils/customError');
const { validateBody } = require("../utils/validateBody");
const { ChargilyClient } = require('@chargily/chargily-pay');
const Cart = require("../models/CartModel");
const Subscription = require('../models/SubscriptionModel');
const BookUser = require("../models/BookUserModel");
const User = require("../models/UserModel");
const asyncErrorHandler = require('../utils/asyncErrorHandler');

const client = new ChargilyClient({
    api_key: process.env.CHARGILY_SECRET_KEY,
    mode: 'test',
});

chargilyRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    const carts = await Cart.find({ user: req.user.id, ispayed: false });

    if (carts.length === 0) throw new CustomError("سلتك فارغة", 404);
    const amount = carts.reduce((acc, cart) => {
        const book = cart.book;
        if (book.free) return acc;
        if (book.discount > 0) return acc + book.price - (book.price * book.discount / 100);
        return acc + book.price;
    }, 0);

    if (amount < 50) throw new CustomError("السعر يجب ان يكون اكبر من 50 دينار", 400);

    const payload = {
        amount: amount,
        currency: "dzd",
        success_url: `${req.protocol}://${req.get('host')}/success`,
        failure_url: `${req.protocol}://${req.get('host')}/failure`,
        metadata: {
            user_id: req.user.id,
            type: "book"
        }
    };

    const response = await fetch(process.env.CHARGILY_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    for (const cart of carts) {
        console.log(result.id);
        const book = cart.book;
        let price = 0;

        if (!book.free) {
            if (book.discount > 0) {
                price = book.price - (book.price * book.discount / 100);
            } else {
                price = book.price;
            }
        }
        if (cart.chargilyId) {
            try {
                await client.expireCheckout(cart.chargilyId);
            } catch (error) { }
        }

        await Cart.updateOne(
            { _id: cart._id },
            {
                $set: { chargilyId: result.id, price: price },
            }
        );
    }

    res.status(200).send({ success: true, result });
});

chargilyRouter.post("/subscription", authMidleware, BanMiddleware, async (req, res, next) => {
    validateBody(req.body, ["subscription"], true, []);
    if (req.user.subscriptionExipireDate > new Date()) throw new CustomError("انت مشترك حاليا", 404);

    const test = await Subscription.findById(req.body.subscription);

    if (!test) throw new CustomError("الاشتراك غير موجود", 404);
    const amount = test.price;

    const payload = {
        amount: amount,
        currency: "dzd",
        success_url: "http://localhost:3000/success",
        failure_url: "http://localhost:3000/failure",
        metadata: {
            user_id: req.user.id,
            subscription: req.body.subscription,
            type: "subscription"
        }
    };

    const response = await fetch(process.env.CHARGILY_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    res.status(200).send({ success: true, result });
});

chargilyRouter.post("/webhook", express.json(), async (req, res) => {
    const payload = req.body;
    if (payload.type !== 'checkout.paid') {
        res.sendStatus(500);
        return;
    }
    // console.log(payload.data.id);
    const checkout = await client.getCheckout(payload.data.id);
    // console.log(checkout);

    delete checkout.notification_status;
    delete checkout.deposit_transaction_id;

    delete payload.data.notification_status;
    delete payload.data.deposit_transaction_id;

    const isEqual = JSON.stringify(checkout, Object.keys(checkout).sort()) === JSON.stringify(payload.data, Object.keys(payload.data).sort());

    if (isEqual) {
        console.log("✅ Checkout valide");
    } else {
        console.log("❌ Checkout différent");
        console.log("Payload:", payload.data);
        console.log("Checkout:", checkout);
    }

    if (payload.data.metadata.type === "book") {
        console.log("book");
        const carts = await Cart.find({ user: payload.data.metadata.user_id, chargilyId: payload.data.id, ispayed: false });
        await Cart.updateMany({ _id: { $in: carts.map(cart => cart._id) } }, { $set: { ispayed: true } });

        const bookUserDocuments = carts.map(cart => ({ user: cart.user, book: cart.book }));
        await User.findByIdAndUpdate(payload.data.metadata.user_id, { $inc: { buyed_books_number: carts.length } },);
        try { await BookUser.insertMany(bookUserDocuments) } catch (error) { }
    }

    if (payload.data.metadata.type === "subscription") {
        const subscription = await Subscription.findById(payload.data.metadata.subscription);
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + subscription.months);
        await User.updateOne({ _id: payload.data.metadata.user_id }, { $set: { subscription: subscription._id, subscriptionExipireDate: expireDate } });
    }
    res.sendStatus(200);
});

module.exports = chargilyRouter;