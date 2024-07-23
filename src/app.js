import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { PORT_NUMBER } from './constant/env.constant.js';
import apiRouter from './routers/index.js';

const app = express();
const PORT = PORT_NUMBER;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  return res.status(200).send('서버가 실행중');
});

app.use('/api', [apiRouter]);

app.use(errorHandler); //error미들웨어

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸습니다!');
});
