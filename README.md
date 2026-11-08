# 달려라, 챠챠! 테스트 사이트

사이트: https://dreamingchick.github.io/run-chacha-test/

공식 게임 저장소와 분리된 공개 테스트 환경입니다. 실제 랭킹 등록 및 오프라인 캐시 설치를 사용하지 않습니다. 최고 기록은 테스트 전용 키로 저장합니다.

## 확인 항목
- Space / ↑ / 화면 터치로 무·배추를 넘어보세요.
- 속도가 올라가도 장애물이 겹치거나 대형 장애물 직후 다른 장애물이 나오지 않는지 확인하세요.
- 배경은 흐릿한 시골 풍경이며 장애물의 테두리와 그림자는 선명해야 합니다.
- 휴대폰 세로/가로 모드, 일시정지, 재시작을 확인하세요.

## 로컬 실행 및 자동 검증
`npm run build` → `npm test` → `npm run check:release`

`python -m http.server 8783 --directory dist` 실행 후 http://localhost:8783 에 접속합니다.

main에 변경을 올리면 테스트 검증 후 이 저장소의 GitHub Pages에 배포됩니다. 공식 run-chacha 저장소에는 영향을 주지 않습니다.
