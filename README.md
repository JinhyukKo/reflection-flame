# Request Log Server

요청을 그대로 로그 파일에 저장하고, 저장된 로그를 웹에서 확인하는 간단한 Node.js 서버입니다.

## 로컬 실행

```bash
npm start
```

3000번 포트가 이미 사용 중이면 다른 포트로 실행할 수 있습니다.

```bash
PORT=4001 npm start
```

서버 주소:

```text
http://localhost:4000
```

## 사용

아무 요청이나 보내면 `requests.log` 파일에 저장됩니다.

```bash
curl -X POST http://localhost:4000/test -H "Content-Type: text/plain" --data "hello"
```

사진 다운로드:

```text
http://localhost:4000/photo
```

저장된 로그 확인:

```text
http://localhost:4000/log
```

저장된 로그를 표 형태로 확인:

```text
http://localhost:4000/logs
```

## Vercel 배포

이 폴더를 그대로 Vercel에 배포하면 `api/index.js`가 서버리스 함수로 실행됩니다.

배포 후 사용:

```text
https://배포주소/log
https://배포주소/logs
https://배포주소/photo
```

Vercel은 서버리스 환경이라 `requests.log`를 영구 저장할 수 없습니다. 이 프로젝트는 간단한 테스트용으로 `/tmp`에 임시 저장하며, 재배포되거나 서버리스 인스턴스가 바뀌면 로그가 사라질 수 있습니다.
# reflection-flame
