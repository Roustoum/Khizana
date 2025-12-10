const express = require('express');
const roleRoute = express.Router();
const { authMidleware } = require('../middlewares/Protected');
const CustomError = require('../utils/customError');
const { validateBody } = require('../utils/validateBody');
const Role = require('../models/RoleModel');

roleRoute.get('/', authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.roles_permissions.view) throw new CustomError("غير مصرح لك بمشاهدة الأدوار", 403);

    const roles = await Role.find();
    res.status(200).send({ success: true, roles });
});

roleRoute.post('/', authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.roles_permissions.create) throw new CustomError("غير مصرح لك بإنشاء الأدوار", 403);
    validateBody(req.body, ["name", "permissions"], true, []);

    const role = new Role(req.body);
    await role.save();

    res.status(201).send({ success: true, role });
});

roleRoute.put("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.roles_permissions.edit) throw new CustomError("غير مصرح لك بتعديل الأدوار", 403);
    validateBody(req.body, [], false, []);

    const role = await Role.findById(req.params.id);
    if (!role) {
        throw new CustomError("الدور المطلوب غير موجود", 404);
    }
    if (role.immutable) {
        throw new CustomError("لا يمكن تعديل هذا الدور", 403);
    }

    Object.keys(req.body).forEach(key => { role[key] = req.body[key]; });
    await role.save();

    res.status(200).send({ success: true, role });
});

roleRoute.delete("/:id", authMidleware, async (req, res, next) => {
    if (!req.user.role) throw new CustomError("المستعمل غير مصرح به", 404);
    if (!req.user.role.permissions.roles_permissions.delete) throw new CustomError("غير مصرح لك بحذف الأدوار", 403);

    const role = await Role.findById(req.params.id);
    if (!role) throw new CustomError("الدور المطلوب غير موجود", 404);
    if (role.immutable) throw new CustomError("لا يمكن حذف هذا الدور", 403);

    await role.deleteOne();
    res.status(200).send({ success: true, message: "تم حذف الدور بنجاح" });
});

module.exports = roleRoute;