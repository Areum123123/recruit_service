import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma.util.js';

const userRouter = express();

//내정보 조회(AccessToken 인증 필요)
userRouter.get('/me', authMiddleware, async (req, res, next) => {
  //사용자 정보는 인증 Middleware(`req.user`)를 통해서 전달 받습니다.
  const { userId } = req.user;

  // 사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시를 반환합니다.
  const user = await prisma.user.findFirst({
    where: { userId: +userId },
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({ status: 200, data: user });
});
export default userRouter;
