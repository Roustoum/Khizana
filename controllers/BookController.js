const { PDFParse } = require('pdf-parse');
const path = require('path');
const fs = require("fs/promises");
const CustomError = require('../utils/customError');
const BooksReads = require('../models/BooksReadsModel');
const User = require('../models/UserModel');

module.exports.extractPDFText = async (book) => {
    if (path.extname(book.pdf).toLowerCase() !== ".pdf") throw new CustomError("الملف ليس بصيغة PDF", 400);

    const filePath = path.join(__dirname, '..', 'public', 'books', 'pdfs', book.pdf);
    const dataBuffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();

    return result.text;
};

module.exports.getTopUsersByPeriod = async (days) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const topUsers = await BooksReads.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: "$user",
                booksReadCount: { $sum: 1 }
            }
        },
        {
            $sort: { booksReadCount: -1 }
        },
        {
            $limit: 10
        }
    ]);

    const populatedUsers = await User.populate(topUsers, {
        path: "_id"
    });

    return populatedUsers.map(user => {
        return {
            user: user._id,
            booksReadCount: user.booksReadCount
        }
    });
};