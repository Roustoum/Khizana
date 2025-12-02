const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const CustomError = require("../utils/customError");
const asyncHandler =  require("../utils/asyncErrorHandler");

exports.authMidleware = asyncHandler(async (req, res, next) => {
    // console.log(req.cookies)
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    const decodertoken = jwt.verify(token, process.env.JWT_SECRET_STRING)
    // console.log(decodertoken)

    const user = await User.findOne({ _id: decodertoken._id })
    //console.log(user)

    if (!user) throw new CustomError("المستخدم غير مصرح له !", 401)
    req.user = user
    next()
})