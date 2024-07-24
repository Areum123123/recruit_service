import Joi from 'joi';

const updateResumeSchema = Joi.object({
  title: Joi.string().optional().messages({
    'string.empty': '수정 할 정보를 입력해 주세요.',
  }),
  introduction: Joi.string().min(150).optional().messages({
    'string.min': '자기소개는 150자 이상 작성해야 합니다.',
    'string.empty': '수정 할 정보를 입력해 주세요.',
  }),
});

export const updateResumeValidator = async (req, res, next) => {
  try {
    await updateResumeSchema.validateAsync(req.body);
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
