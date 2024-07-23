import Joi from 'joi';

const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': '이름을 입력해 주세요.',
    'string.empty': '이름을 입력해 주세요.',
  }),
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
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': '비밀번호 확인이 필요합니다.',
    'any.only': '입력 한 두 비밀번호가 일치하지 않습니다.',
    'string.empty': '비밀번호 확인이 필요합니다.',
  }),
});

export const RegisterValidator = async (req, res, next) => {
  try {
    await registerSchema.validateAsync(req.body);
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
