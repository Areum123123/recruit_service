import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': '이메일을 입력해 주세요',
    'string.email': '이메일 형식이 올바르지 않습니다.',
    'string.empty': '이메일을 입력해 주세요',
  }),
  password: Joi.string().required().min(6).messages({
    'any.required': '비밀번호를 입력해 주세요',
    'string.min': '비밀번호는 6자리 이상이어야 합니다.',
    'string.empty': '비밀번호를 입력해 주세요',
  }),
});

export const loginValidator = async (req, res, next) => {
  try {
    await loginSchema.validateAsync(req.body);
    next();
  } catch (error) {
    if (error.isJoi) {
      res.status(400).json({
        status: 400,
        message: error.details.map((detail) => detail.message).join(', '),
      });
    } else {
      next(error);
    }
  }
};
