# API명세서 & ERD

[링크 텍스트](https://wistful-manager-71d.notion.site/API-ERD-4fa18f0290cd428bb349946f4e076e5e?pvs=4)


# 나만의 채용서비스 백엔드 서버

- [✔︎] API 명세서 및 ERD 작성
- [✔︎] 프로젝트 기본 세팅
- [✔︎] DB 연결, 스키마 작성, 테이블 생성
- [✔︎] 회원가입, 로그인
- [✔︎] 사용자 인증 :AccessToken / 내 정보 조회 API
- [✔︎] 이력서 관리 :이력서 생성,목록 조회, 상세 조회, 수정, 삭제 API

---

##(선택)사항

- [✔︎] RefreshToken 활용( 로그인API에 기능추가, RefreshToken 인증 Middleware, 토큰 재발급 API, 로그아웃 API)
- [✔︎] 역할에 따른 실행 결과 분기 : 채용담당자가 등록된 모든 이력서 조회(이력서 목록조회 API추가구현), 특정사용자 조회(이력서 상세 조회 API 추가 구현)
- [✔︎] Transaction 활용: 역할인가 미들웨어, 이력서 지원 상태변경 API, 이력서 로그 목록조회 API
