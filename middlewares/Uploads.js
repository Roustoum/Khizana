const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const CustomError = require("../utils/customError");


function createUploader(basePath, expectedFields = [], allowedTypes = [], strict = true, maxSizeMB = 8) {
    // Vérifie si c’est un seul chemin ou plusieurs
    const isMultiPath = Array.isArray(basePath);

    // Crée les dossiers si nécessaires
    if (isMultiPath) {
        basePath.forEach(p => {
            if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
        });
    } else {
        if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const fieldIndex = expectedFields.indexOf(file.fieldname);

            if (strict && fieldIndex === -1) {
                return cb(new CustomError(`Fichier "${file.fieldname}" non attendu !`, 400));
            }

            let targetPath;

            // 🧭 Sélection dynamique du dossier
            if (isMultiPath) {
                // Si basePath est un array → correspondance par index
                targetPath = basePath[fieldIndex] || basePath[0];
            } else {
                targetPath = basePath;
            }

            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            cb(null, targetPath);
        },
        filename: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            const uniqueName = uuidv4() + ext;
            cb(null, uniqueName);
        }
    });

    const upload = multer({
        storage,
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const fieldIndex = expectedFields.indexOf(file.fieldname);

            if (strict && fieldIndex === -1) {
                return cb(new CustomError(`Fichier "${file.fieldname}" non attendu !`, 400));
            }

            if (fieldIndex !== -1 && allowedTypes[fieldIndex]) {
                const allowedCategory = allowedTypes[fieldIndex];
                if (!file.mimetype.includes(allowedCategory)) {
                    return cb(new CustomError(`"${file.fieldname}" doit être un fichier de type ${allowedCategory}`, 400));
                }
            }

            cb(null, true);
        }
    });

    return upload;
}

module.exports = createUploader;