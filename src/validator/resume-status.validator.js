import Joi from 'joi';

const resumeStatusSchema = Joi.object({
  applyStatus: Joi.string()
    .valid('APPLY', 'DROP', 'PASS', 'INTERVIEW1', 'INTERVIEW2', 'FINAL_PASS')
    .required()
    .empty('')
    .messages({
      'any.required': '변경하고자 하는 지원 상태를 입력해 주세요.',
      'any.only': '유효하지 않은 지원 상태입니다.',
    }),
  reason: Joi.string().required().messages({
    'string.empty': '지원 상태 변경 사유를 입력해 주세요.',
  }),
});

export const StatusValidator = async (req, res, next) => {
  try {
    await resumeStatusSchema.validateAsync(req.body);
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
