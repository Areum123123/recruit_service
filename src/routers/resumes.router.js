import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { resumeValidator } from '../validator/resume.validator.js';
import { prisma } from '../utils/prisma.util.js';
import { updateResumeValidator } from '../validator/update-resume.validator.js';
import { requireRoles } from '../middlewares/require-role.middleware.js';
import { StatusValidator } from '../validator/resume-status.validator.js';

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
  // Query Parameters**(**`req.query`**)으로 **정렬** 조건을 받습니다.
  //  생성일시 기준 정렬은 `과거순(ASC),` `최신순(DESC)`으로 전달 받습니다. 값이 없는 경우 `최신순(DESC)` 정렬을 기본으로 합니다. 대소문자 구분 없이 동작해야 합니다.
  //const { sort = 'DESC' } = req.query;  /api/resumes?sort=DESC
  const { userId, role } = req.user;
  const { sort, status } = req.query;
  const sortOrder = sort
    ? sort.toUpperCase() === 'ASC'
      ? 'asc'
      : 'desc'
    : 'desc';

  const whereObject = {};
  //지원 상태 별 필터링 조건을 받습니다. 값이 없는 경우 모든 상태의 이력서를 조회합니다.
  //지원상태 apply 끼리, pass끼리, status가 따로 없으면 모든 상태이력서 조회
  if (status) {
    whereObject.applyStatus = status.toUpperCase();
  }

  //역할이 RECRUITER 인 경우 모든 사용자의 이력서를 조회할 수 있습니다.
  if (role !== 'RECRUITER') {
    whereObject.UserId = +userId;
  }

  const resumes = await prisma.resume.findMany({
    where: whereObject,
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
  const { userId, role } = req.user;
  const { resumeId } = req.params;

  const whereObject = { resumeId: +resumeId };
  //(추가구현)역할이 RECRUITER 인 경우 이력서 작성 사용자와 일치하지 않아도 이력서를 조회할 수 있습니다.
  if (role !== 'RECRUITER') {
    whereObject.UserId = +userId;
  }

  try {
    const resume = await prisma.resume.findFirst({
      where: whereObject,
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

// 이력서 수정 API(accessToken 인증 필요)

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

//이력서 삭제 API(accesstoken 인증필요)

resumeRouter.delete('/:resumeId', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { resumeId } = req.params;
  try {
    const resume = await prisma.resume.findFirst({
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });

    if (!resume) {
      return res
        .status(404)
        .json({ status: 404, message: '이력서가 존재하지 않습니다.' });
    }

    const deleteResume = await prisma.resume.delete({
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });

    return res.status(200).json({
      status: 200,
      message: `이력서 ID:${resumeId} 삭제 되었습니다.`,
    });
  } catch (err) {
    next(err);
  }
});

//이력서 지원 상태 변경 API(accesstoken인증, 역할인가 필요)
resumeRouter.patch(
  '/:resumeId/status',
  authMiddleware,
  requireRoles(['RECRUITER']),
  StatusValidator,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { resumeId } = req.params;
      const { applyStatus, reason } = req.body;

      // 이력서 정보 확인
      const resume = await prisma.resume.findUnique({
        where: { resumeId: +resumeId },
      });

      if (!resume) {
        return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });
      }

      // 이력서 상태 변경 로직
      const resumeLog = await prisma.$transaction(async (prisma) => {
        // 이력서 applyStatus 수정
        await prisma.resume.update({
          where: { resumeId: +resumeId },
          data: { applyStatus },
        });

        // 로그 생성
        const createResumeLog = await prisma.resumeLog.create({
          data: {
            UserId: userId,
            ResumeId: resume.resumeId,
            previousStatus: resume.applyStatus,
            newStatus: applyStatus,
            reason,
          },
        });

        return createResumeLog;
      });

      return res.status(200).json(resumeLog);
    } catch (error) {
      next(error);
    }
  },
);

//이력서 로그 목록 조회 API(accessToken 인증, 역할인가 필요)
resumeRouter.get(
  '/:resumeId/logs',
  authMiddleware,
  requireRoles(['RECRUITER']),
  async (req, res, next) => {
    const { resumeId } = req.params;
    try {
      const resumeLog = await prisma.resumeLog.findMany({
        where: { ResumeId: +resumeId },
        orderBy: { createdAt: 'desc' },
        select: {
          resumeLogId: true,
          recruiter: {
            select: {
              name: true,
            },
          },
          ResumeId: true,
          previousStatus: true,
          newStatus: true,
          reason: true,
          createdAt: true,
        },
      });
      if (!resumeLog) {
        return res.status(200).json({ data: [] });
      }

      // 반환 정보 구성 : 검색결과가 다수일때 map으로 돌리기
      const logs = resumeLog.map((log) => ({
        resumeLogId: log.resumeLogId,
        recruiterName: log.recruiter.name,
        resumeId: log.ResumeId,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        reason: log.reason,
        createdAt: log.createdAt,
      }));
      return res.status(200).json({ data: logs });
    } catch (err) {
      next(err);
    }
  },
);
export default resumeRouter;
