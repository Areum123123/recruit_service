import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { resumeValidator } from '../validator/resume.validator.js';
import { prisma } from '../utils/prisma.util.js';

const resumeRouter = express();

//이력서 생성 API ( AccessToken 인증 필요)

resumeRouter.post(
  '/',
  resumeValidator,
  authMiddleware,
  async (req, res, next) => {
    //- 사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
    //**제목, 자기소개**를 **Request Body**(**`req.body`**)
    const { userId } = req.user;
    const { title, introduction } = req.body;
    try {
      const resume = await prisma.resume.create({
        data: {
          UserId: +userId,
          title,
          introduction,
        },
      });
      return res.status(201).json({ status: 201, data: resume });
    } catch (err) {
      next(err);
    }
  },
);

//이력서 목록 조회 API (accessToken인증 필요)
resumeRouter.get('/', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  // Query Parameters**(**`req.query`**)으로 **정렬** 조건을 받습니다.
  //  생성일시 기준 정렬은 `과거순(ASC),` `최신순(DESC)`으로 전달 받습니다. 값이 없는 경우 `최신순(DESC)` 정렬을 기본으로 합니다. 대소문자 구분 없이 동작해야 합니다.
  //const { sort = 'DESC' } = req.query;  /api/resumes?sort=DESC
  const { sort } = req.query;
  const sortOrder = sort
    ? sort.toUpperCase() === 'ASC'
      ? 'asc'
      : 'desc'
    : 'desc';

  const resumes = await prisma.resume.findMany({
    where: { UserId: +userId },
    orderBy: {
      createdAt: sortOrder,
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  const result = resumes.map((resume) => ({
    resumeId: resume.resumeId,
    name: resume.user.name,
    title: resume.title,
    introduction: resume.introduction,
    applyStatus: resume.applyStatus,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  }));
  if (!resumes) {
    return res.status(200).json({ data: [] });
  }

  return res.status(200).json({ data: result });
});

//이력서 수정 API(accessToken)
export default resumeRouter;
