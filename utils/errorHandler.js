const fs = require('fs');
module.exports = (err, req, res, next) => {
    // console.error(err);
    if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
            try {
                fs.unlinkSync(file.path);
                console.log(`Fichier supprimé après erreur : ${file.path}`);
            } catch (unlinkErr) {
                console.error("Erreur lors de la suppression du fichier:", unlinkErr);
            }
        }
    }

    let statusCode = err.statusCode = err.statusCode || 500;
    let message = err.message || "Une erreur inconnue s'est produite";
    // console.log(err.message)
    if (err.name === "ValidationError") {
        message = Object.values(err.errors).map(e => e.message).join(", ");
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};