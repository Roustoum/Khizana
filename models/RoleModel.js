const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
    _id: false,
    view: { type: Boolean, required: true, default: false },
    create: { type: Boolean, required: true, default: false },
    edit: { type: Boolean, required: true, default: false },
    delete: { type: Boolean, required: true, default: false },
    manage: { type: Boolean, required: true, default: false },
});

const roleSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, 'اسم الدور مطلوب'], unique: [true, 'اسم الدور موجود بالفعل'] },
        permissions: {
            dashboard: {
                access: { type: Boolean, required: true, default: false },
                view: { type: Boolean, required: true, default: false },
            },
            categories: permissionSchema,
            roles_permissions: permissionSchema,
            users: permissionSchema,
            authors: permissionSchema,
            articles: permissionSchema,
            public_books: permissionSchema,
            publishers: permissionSchema,
            notifications: permissionSchema,
            coupons: permissionSchema,
            subscriptions: permissionSchema,
            currencies: permissionSchema,
            educational_books: permissionSchema,
            quotes: permissionSchema,
            posts: permissionSchema,
            analysis: permissionSchema,
            contactUs: permissionSchema,
            slides: permissionSchema,
        },
        immutable: { type: Boolean, required: true, default: false },
    },
    { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

const initRoles = async function () {
    const existing = await Role.find();

    // Si les rôles n'existent pas, on les crée
    if (!existing.find(r => r.name === "SuperAdmin")) {
        await Role.create({
            name: "SuperAdmin",
            immutable: true,
            permissions: {
                dashboard: { access: true, view: true },
                categories: { view: true, create: true, edit: true, delete: true, manage: true },
                roles_permissions: { view: true, create: true, edit: true, delete: true, manage: true },
                users: { view: true, create: true, edit: true, delete: true, manage: true },
                authors: { view: true, create: true, edit: true, delete: true, manage: true },
                articles: { view: true, create: true, edit: true, delete: true, manage: true },
                public_books: { view: true, create: true, edit: true, delete: true, manage: true },
                publishers: { view: true, create: true, edit: true, delete: true, manage: true },
                notifications: { view: true, create: true, edit: true, delete: true, manage: true },
                coupons: { view: true, create: true, edit: true, delete: true, manage: true },
                subscriptions: { view: true, create: true, edit: true, delete: true, manage: true },
                currencies: { view: true, create: true, edit: true, delete: true, manage: true },
                educational_books: { view: true, create: true, edit: true, delete: true, manage: true },
                // Nouvelles permissions avec tous les droits pour SuperAdmin
                quotes: { view: true, create: true, edit: true, delete: true, manage: true },
                posts: { view: true, create: true, edit: true, delete: true, manage: true },
                analysis: { view: true, create: true, edit: true, delete: true, manage: true },
                contactUs: { view: true, create: true, edit: true, delete: true, manage: true },
                slides: { view: true, create: true, edit: true, delete: true, manage: true },
            },
        });
        console.log("✅ Rôles superAdmin initialisés");
    }

    if (!existing.find(r => r.name === "User")) {
        await Role.create({
            name: "User",
            immutable: true,
            "permissions": {
                "dashboard": {
                    "access": false,
                    "view": false
                },
                "categories": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "roles_permissions": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "users": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "authors": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "articles": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "public_books": {
                    "view": true,
                    "create": true,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "publishers": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "notifications": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "coupons": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "subscriptions": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "currencies": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                },
                "educational_books": {
                    "view": false,
                    "create": false,
                    "edit": false,
                    "delete": false,
                    "manage": false
                }
            }
        });
        console.log("✅ Rôles User initialisés");
    }
}

initRoles();

module.exports = initRoles;
module.exports = Role;