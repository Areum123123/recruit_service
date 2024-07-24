import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import { RegisterValidator } from '../validator/register.validator.js';
import { loginValidator } from '../validator/login.validator.js';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET_KEY } from '../constant/env.constant.js';

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

    res.header('accessToken', accessToken);
    // res.header('refreshToken', refreshToken);
    // AccessToken 반환
    return res.status(200).json({
      status: 200,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

//로그아웃API

//refresh토큰 재발급

export default authRouter;
