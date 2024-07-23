import express from 'express';
import userRouter from './users.router.js';
import resumeRouter from './resumes.router.js';
import authRouter from './auth.router.js';

const apiRouter = express();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/resumes', resumeRouter);

export default apiRouter;
