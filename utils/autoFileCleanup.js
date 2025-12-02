const fs = require("fs");
const path = require("path");

module.exports = function autoFileCleanup(schema) {
    // 1️⃣ On trouve tous les champs avec autoCleanup activé
    const cleanupFields = [];
    schema.eachPath((fieldName, schemaType) => {
        const options = schemaType.options;
        if (options.autoCleanup && options.basePath) {
            cleanupFields.push({
                field: fieldName,
                basePath: options.basePath,
            });
        }
    });

    if (cleanupFields.length === 0) return; // rien à faire

    // 2️⃣ Quand on save : si un fichier change → supprimer l'ancien
    schema.pre("save", async function (next) {
        if (this.isNew) return next();

        const oldDoc = await this.constructor.findById(this._id).select(
            cleanupFields.map((f) => f.field).join(" ")
        );

        if (oldDoc) {
            this._oldFiles = [];
            for (const { field, basePath } of cleanupFields) {
                if (this.isModified(field) && oldDoc[field]) {
                    this._oldFiles.push({
                        path: path.join(basePath, oldDoc[field]),
                    });
                }
            }
        }

        next();
    });

    schema.post("save", function () {
        if (!this._oldFiles) return;
        for (const file of this._oldFiles) {
            fs.unlink(file.path, () => { });
        }
    });

    // 3️⃣ Quand on supprime : supprimer tous les fichiers déclarés
    schema.pre(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, async function (next) {
        const doc = await this.model.findOne(this.getFilter()).select(
            cleanupFields.map((f) => f.field).join(" ")
        );
        this._docToDelete = doc;
        next();
    });

    schema.post(/^findOneAndDelete$|^deleteOne$|^findByIdAndDelete$/, function () {
        const doc = this._docToDelete;
        if (!doc) return;

        for (const { field, basePath } of cleanupFields) {
            if (doc[field]) {
                fs.unlink(path.join(basePath, doc[field]), () => { });
            }
        }
    });
};
