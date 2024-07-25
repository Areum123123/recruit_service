export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          status: 401,
          message: '인증 정보가 없습니다.',
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          status: 403,
          message: '접근 권한이 없습니다.',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
