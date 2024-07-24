import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { resumeValidator } from '../validator/resume.validator.js';
import { prisma } from '../utils/prisma.util.js';
import { updateResumeValidator } from '../validator/update-resume.validator.js';

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

//이력서 상세 조회 API(accessToken)

resumeRouter.get('/:resumeId', authMiddleware, async (req, res, next) => {
  //사용자 정보는 인증 Middleware(`req.user`)를 통해서 전달 받습니다.
  //이력서 ID를 Path Parameters(`req.params`)로 전달 받습니다.
  const { userId } = req.user;
  const { resumeId } = req.params;

  try {
    const resume = await prisma.resume.findFirst({
      where: { resumeId: +resumeId, UserId: +userId },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!resume) {
      return res
        .status(404)
        .json({ status: 404, message: '이력서가 존재하지 않습니다.' });
    }

    //작성자 ID**가 아닌 **작성자 이름**을 반환하기 위해 스키마에 정의 한 Relation을 활용해 조회합니다.
    // 이력서 ID, 작성자 이름, 제목, 자기소개, 지원 상태, 생성일시, 수정일시를 반환합니다.
    const result = {
      resumeId: resume.resumeId,
      name: resume.user.name,
      title: resume.title,
      introduction: resume.introduction,
      applyStatus: resume.applyStatus,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };

    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

//이력서 수정 API(accessToken 인증 필요)
resumeRouter.patch(
  '/:resumeId',
  updateResumeValidator,
  authMiddleware,
  async (req, res, next) => {
    //   - 사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
    //   - **이력서 ID**를 **Path Parameters(`req.params`)**로 전달 받습니다.
    //   - **제목, 자기소개**를 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { userId } = req.user;
    const { resumeId } = req.params;
    const { title, introduction } = req.body;

    try {
      //   - **제목, 자기소개 둘 다 없는 경우** - “수정 할 정보를 입력해 주세요.” --- 되는지 안되는지 꼭 확인
      const resume = await prisma.resume.findFirst({
        where: { resumeId: +resumeId, UserId: +userId },
      });

      if (!resume) {
        return res
          .status(404)
          .json({ status: 404, message: '이력서가 존재하지 않습니다.' });
      }

      const result = await prisma.resume.update({
        where: { resumeId: +resumeId, UserId: +userId },
        data: {
          title,
          introduction,
        },
      });

      return res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default resumeRouter;
