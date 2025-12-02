const CustomError = require("./customError");

exports.validateBody = (obj, requiredFields = [], strict = false, fields = null) => {
    const bodyKeys = Object.keys(obj);

    // 1) Vérifier les champs manquants
    const missing = requiredFields.filter(field => !bodyKeys.includes(field));

    // 2) Déterminer la liste des champs autorisés
    let allowedFields = [...requiredFields];
    if (fields && Array.isArray(fields)) {
        allowedFields = [...allowedFields, ...fields];
    }

    // 3) Vérifier les champs en trop si strict
    const extra = strict ? bodyKeys.filter(field => !allowedFields.includes(field)) : [];

    // 4) Si problème => erreur
    if (missing.length > 0 || (strict && extra.length > 0)) {
        let message = '';

        if (missing.length > 0) {
            message += `Champs manquants: ${missing.join(', ')}. `;
        }
        if (strict && extra.length > 0) {
            message += `Champs en trop: ${extra.join(', ')}.`;
        }

        throw new CustomError(message.trim(), 400);
    }
};

