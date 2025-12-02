const express = require('express');
const currencyRouter = express.Router();
const Currency = require('../models/CurrenciesModel');
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const CustomError = require('../utils/customError');

currencyRouter.get("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.currencies?.view) {
        throw new CustomError("غير مصرح لك بمشاهدة العملات", 403);
    }
    const currencies = await Currency.find();
    res.status(200).send({ success: true, currencies });
});

currencyRouter.get("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.currencies?.view) {
        throw new CustomError("غير مصرح لك بمشاهدة العملات", 403);
    }
    const currency = await Currency.findById(req.params.id);
    if (!currency) throw new CustomError("العملة غير موجودة", 404);
    res.status(200).send({ success: true, currency });
});

currencyRouter.post("/", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.currencies?.create) {
        throw new CustomError("غير مصرح لك بإنشاء العملات", 403);
    }
    validateBody(req.body, ["code", "name", "rate_to_dz"], true, []);

    const currency = new Currency(req.body);
    await currency.save();
    res.status(201).send({ success: true, currency });
});

currencyRouter.put("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.currencies?.edit) {
        throw new CustomError("غير مصرح لك بتعديل العملات", 403);
    }
    validateBody(req.body, ["code", "name", "rate_to_dz"], true, []);

    const currency = await Currency.findById(req.params.id);
    if (!currency) throw new CustomError("العملة غير موجودة", 404);

    const updateInfo = Object.keys(req.body);
    updateInfo.forEach(update => (currency[update] = req.body[update]));
    await currency.save();
    res.status(200).send({ success: true, currency });
});

currencyRouter.delete("/:id", authMidleware, BanMiddleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions?.currencies?.delete) {
        throw new CustomError("غير مصرح لك بحذف العملات", 403);
    }

    const currency = await Currency.findById(req.params.id);
    if (!currency) throw new CustomError("العملة غير موجودة", 404);
    await currency.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف العملة بنجاح" });
});

module.exports = currencyRouter;