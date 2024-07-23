import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.util.js';

export default async function (req, res, next) {
  try {
    const authorization = req.headers['authorization'];
    if (!authorization) throw new Error('인증 정보가 없습니다.');

    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer')
      throw new Error('지원하지 않는 인증 방식입니다.');

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
    const userId = decodedToken.userId;

    const user = await prisma.user.findFirst({
      where: { userId: +userId },
    });

    if (!user) {
      res.clearCookie('authorization');
      throw new Error('인증 정보와 일치하는 사용자가 없습니다.');
    }

    req.user = user;

    next();
  } catch (err) {
    res.clearCookie('authorization');

    switch (err.name) {
      case 'TokenExpiredError': //토큰이 만료되었을 때 발생하는 에러
        return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
      case 'JsonWebTokenError': // 토큰에 검증이 실패 했을 때, 발생하는 에러
        return res
          .status(401)
          .json({ message: '인증정보가 유효하지 않습니다.' });
      default: //그외에 오류
        return res
          .status(401)
          .json({ message: err.message ?? '인증 정보가 유효하지 않습니다.' });
    }
  }
}
