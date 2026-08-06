// Only allow ADMIN role
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admins only.'
        });
    }
    next();
};

module.exports = { isAdmin };