export function errorHandler(err, req, res, next) {
    if (err.isOperational) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    console.error({
        method:  req.method,
        url:     req.url,
        userId:  req.user?.id ?? null,
        message: err.message,
        stack:   err.stack,
    });

    res.status(500).json({ error: "Error interno del servidor" });
}
