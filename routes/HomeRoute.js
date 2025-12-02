const express = require('express');
const homeRouter = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const { BanMiddleware } = require('../middlewares/Ban');
const { validateBody } = require('../utils/validateBody');
const CustomError = require('../utils/customError');
const Book = require('../models/BooksModel');
const Author = require('../models/AuthorModel');
const Publisher = require('../models/PublisherModel');

homeRouter.get("/search/:query", async (req, res, next) => {
    const books = await Book.find({ is_active: true, $or: [{ title: { $regex: req.params.query, $options: 'i' } }, { description: { $regex: req.params.query, $options: 'i' } }] }).setOptions({ skipPopulate: true });
    const authors = await Author.find({ $or: [{ name: { $regex: req.params.query, $options: 'i' } }, { description: { $regex: req.params.query, $options: 'i' } }] }).setOptions({ skipPopulate: true });
    const publishers = await Publisher.find({ $or: [{ name: { $regex: req.params.query, $options: 'i' } }, { description: { $regex: req.params.query, $options: 'i' } }] }).setOptions({ skipPopulate: true });
    res.status(200).send({ success: true, books, authors, publishers });
});

module.exports = homeRouter;