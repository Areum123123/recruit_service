import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import { RegisterValidator } from '../validator/register.validator.js';
import { loginValidator } from '../validator/login.validator.js';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET_KEY } from '../constant/env.constant.js';
import { REFRESH_TOKEN_SECRET_KEY } from '../constant/env.constant.js';
import { requireRefreshToken } from '../middlewares/refresh-token.middleware.js';

const authRouter = express();

//회원가입 API

authRouter.post('/register', RegisterValidator, async (req, res, next) => {
  const { email, password, name } = req.body;

  try {
    //이메일이 중복되는 경우 - “이미 가입 된 사용자입니다.”
    const existEmail = await prisma.user.findFirst({
      where: { email },
    });
    if (existEmail) {
      return res
        .status(409)
        .json({ status: 409, message: '이미 가입 된 사용자입니다.' });
    }

    //보안을 위해 비밀번호는 평문(Plain Text)으로 저장하지 않고 Hash 된 값을 저장합니다.
    const hashedPassword = await bcrypt.hash(password, 10);

    //사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시를 반환합니다.
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        userId: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      status: 201,
      message: '회원가입이 완료 되었습니다.',
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
});

//로그인 API
authRouter.post('/login', loginValidator, async (req, res, next) => {
  const { email, password } = req.body;
  try {
    //이메일로 조회되지 않는 경우- “인증 정보가 유효하지 않습니다.”
    const user = await prisma.user.findFirst({
      where: { email },
    });
    if (!user) {
      return res.status(400).json({
        status: 400,
        message: '인증 정보가 유효하지 않습니다.',
      });
    }
    //비밀번호가 일치하지 않는 경우** - “인증 정보가 유효하지 않습니다.”
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        status: 400,
        message: '인증 정보가 유효하지 않습니다.',
      });
    }

    // AccessToken(Payload**에 **`사용자 ID`**를 포함하고, **유효기한**이 **`12시간`)**을 생성합니다.
    const accessToken = jwt.sign(
      { userId: user.userId },
      ACCESS_TOKEN_SECRET_KEY,
      {
        expiresIn: '12h',
      },
    );

    const refreshToken = jwt.sign(
      { userId: user.userId },
      REFRESH_TOKEN_SECRET_KEY,
      {
        expiresIn: '7d',
      },
    );
    //refreshtoken 평문으로 저장하지 않고 hash된값으로 저장하기
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    console.log(hashedRefreshToken);

    //refreshToken 데이터베이스에 저장하기
    await prisma.refreshToken.upsert({
      where: { UserId: user.userId },
      update: {
        refreshToken: hashedRefreshToken,
      },
      create: {
        UserId: user.userId,
        refreshToken: hashedRefreshToken,
      },
    });

    res.header('accessToken', accessToken);
    res.header('refreshToken', refreshToken);
    // AccessToken 반환
    return res.status(200).json({
      status: 200,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

//refresh토큰 재발급API
authRouter.post(
  '/token/refresh',
  requireRefreshToken,
  async (req, res, next) => {
    //RefreshToken**(JWT)을 **Request Header의 Authorization** 값(**`req.headers.authorization`**)으로 전달 받습니다.
    //사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
    const { userId } = req.user;

    try {
      // 2. **비즈니스 로직(데이터 처리)**
      //     - **AccessToken(Payload**에 **`사용자 ID`**를 포함하고, **유효기한**이 **`12시간`)**을 생성합니다.
      //     - **RefreshToken** (**Payload**: **사용자 ID** 포함, **유효기한**: **`7일`**)을 생성합니다.
      const payload = { userId: userId };
      // AccessToken(Payload**에 **`사용자 ID`**를 포함하고, **유효기한**이 **`12시간`)**을 생성합니다.
      const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET_KEY, {
        expiresIn: '12h',
      });

      const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET_KEY, {
        expiresIn: '7d',
      });

      const hashedRefreshToken = bcrypt.hashSync(refreshToken, 10);
      //     - DB에 저장 된 **RefreshToken을 갱신**합니다.
      // 3. **반환 정보**
      //     - **AccessToken, RefreshToken**을 반환합니다.
      await prisma.refreshToken.upsert({
        where: { UserId: +userId },
        update: {
          refreshToken: hashedRefreshToken,
        },
        create: {
          UserId: +userId,
          refreshToken: hashedRefreshToken,
        },
      });

      return res.status(200).json({
        status: 200,
        message: '토큰 재발급에 성공했습니다.',
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

//로그아웃API
authRouter.post('/logout', requireRefreshToken, async (req, res, next) => {
  const { userId } = req.user;
  try {
    //refreshtoken 삭제
    await prisma.refreshToken.delete({
      where: { UserId: +userId },
    });

    return res
      .status(200)
      .json({ status: 200, message: `(ID:${userId}) 로그아웃 되었습니다.` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 404,
        message: `해당 사용자의 RefreshToken을 찾을 수 없습니다.`,
      });
    }
    next(err);
  }
});
export default authRouter;
