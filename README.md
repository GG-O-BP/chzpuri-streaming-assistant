# 치지푸리 스트리밍 어시스턴트 🧀🍓
치지직 방송인을 위한 AI 채팅 도우미 - 실시간으로 채팅을 분석하고 완벽한 대화 스크립트를 만들어주는 데스크톱 앱이에요! ✨

스토푸리를 사랑하는 개발자가 만든, 치지직 스트리머들을 위한 최고의 AI 비서예요! 채팅창을 못 따라가겠다구요? 걱정 마세요~ 치지푸리가 다 해결해드릴게요! 💕

## 다른 언어로 보기 🌏
[**한국어**](./README.md), [日本語](./README.jp.md), [English](./README.en.md)

# 주요 기능 ✨
- ✅ 치지직 공식 API로 실시간 채팅 연동! 빠르고 정확해요~
- ✅ ChatGPT/Claude/Gemini가 채팅 맥락을 척척 분석해줘요 🤖
- ✅ 방송 스타일에 맞는 완벽한 대화 스크립트 생성 📝
- ✅ 타겟 시청자층 맞춤형 코칭 기능 🎯
- ✅ 실시간 채팅 감정 분석 (긍정/부정/중립) 😊😐😢
- ✅ 인기 키워드 실시간 트래킹 📊
- ✅ 채팅 속도 모니터링 & 알림 ⚡
- ✅ 스토푸리 테마 스킨 지원! (개발자의 사심 200% 🍓)
- ✅ 방송 하이라이트 자동 캡처 📸

# 릴리즈 실행하기 (일반 사용자) 🎮
[최신 릴리즈](https://github.com/GG-O-BP/chzpuri-streaming-assistant/releases)에서 설치 파일 다운받고 바로 시작하세요!

## 시스템 요구사항 💻
- Windows 10 이상 (곧 Mac도 지원할거예요!)
- Deno 1.40 이상
- Rust
- 치지직 스트리머 계정
- AI API 키 (OpenAI, Claude, 또는 Google Gemini 중 하나)

## 설치 방법 🛠️
1. [릴리즈 페이지](https://github.com/your-username/chzpuri-streaming-assistant/releases/latest)
2. 치지직 계정이랑 연동하기
3. AI API 키 입력하고 시작! (스토푸리 팬이면 특별 할인...은 없어요 ㅋㅋ)

# 소스코드를 빌드하여 실행하기 (개발자) 👩‍💻

## 개발 환경 설정
```bash
# 저장소 클론
git clone https://github.com/your-username/chzpuri-streaming-assistant.git
cd chzpuri-streaming-assistant

# Deno 설치
curl -fsSL https://deno.land/install.sh | sh

# Tauri CLI 설치
cargo install tauri-cli --version "^2.0"

# 의존성 설치
deno task install
```

## 개발 모드 실행
```bash
# 개발 서버 시작
deno task tauri dev
```

## 프로덕션 빌드
```bash
# 프로덕션 빌드
deno task tauri build
```

# 사용 방법 📖

## 1. 초기 설정 ⚙️
- **치지직 연동**: "채팅" 탭에서 채널 ID 입력하고 연결 버튼 클릭!
- **AI 설정**: "AI 설정" 탭에서:
  - AI 제공자 선택 (ChatGPT, Claude, Gemini)
  - API 키 입력 (안전하게 보관됩니다!)
  - 타겟 시청자 설정 (연령대, 성별, 관심사, 컨텐츠 유형)
- **자동 분석**: "채팅 분석" 탭에서 자동 분석 켜기 (30초마다 분석)
- **테마 선택**: 기본 테마 or 스토푸리 스페셜 에디션 🍓

## 2. 실시간 채팅 분석 💬
- **감정 분석**: 시청자들 기분이 어떤지 한눈에!
- **키워드 추출**: 뭐가 핫한지 바로바로 체크
- **채팅 속도**: 너무 빠르면 알려드려요
- **스팸 필터링**: 나쁜 채팅은 자동으로 걸러요
- **하이라이트**: 중요한 순간 자동 마킹!

## 3. AI 대화 코칭 🎭
- 실시간으로 "이렇게 대답하세요!" 추천
- 시청자 질문에 대한 완벽한 답변 생성
- 분위기 메이커 모드 (재밌는 드립 추천!)
- 위로 모드 (따뜻한 말 추천)

# 기술 스택 🛠️
- **Frontend**: React 18, Vite
- **Backend**: Rust (Tauri 2.0), Deno
- **AI Integration**: OpenAI API, Anthropic Claude API, Google Gemini API
- **Streaming API**: 치지직 공식 API
- **State Management**: React Hooks + Rust RwLock
- **Real-time**: WebSocket (Tauri의 내장 기능 활용!)
- **Build System**: Tauri 2.0 (더 빠르고 가벼워요~)
- **Security**: API 키 메모리 저장

# 프로젝트 구조 📁
```
chzpuri-streaming-assistant/
├── src/                    # React 프론트엔드
│   ├── components/        # 리액트 컴포넌트들
│   │   ├── ChzzkChat.jsx         # 치지직 채팅 연결
│   │   ├── AIConfig.jsx          # AI 설정 화면
│   │   ├── ChatAnalysis.jsx      # 채팅 분석 & 스크립트 추천
│   │   └── ChatHistory.jsx      # 채팅 기록 뷰어
│   │   ├── ChzzkChat.css         # 치지직 채팅 스타일링
│   ├── utils/             # 유틸리티
│   │   ├── chatParser.js        # 채팅 파싱
│   │   ├── translator.js        # 다국어 번역
│   │   └── strawberryPrince.js  # 스토푸리 이스터에그 🍓
│   ├── App.jsx            # 메인 앱
│   ├── App.css            # 스타일
│   └── main.jsx           # React 엔트리포인트
├── src-tauri/             # Tauri 백엔드
│   ├── src/
│   │   ├── lib.rs         # 메인 Rust 로직
│   │   ├── main.rs        # Tauri 엔트리포인트
│   │   ├── ai_service.rs  # AI API 통합
│   │   └── chzzk/         # 치지직 채팅 모듈
│   │   │   └── chat.rs   # 치지직 채팅 로직
│   │   │   └── mod.rs   # 치지직 채팅 모듈 내부 모듈
│   │   │   └── types.rs   # 치지직 채팅 모듈 내부 타입 정의
│   ├── Cargo.toml         # Rust 의존성
│   └── tauri.conf.json    # Tauri 설정
├── public/                # 정적 파일
│   └── strawberry/        # 스토푸리 리소스 💕
├── dist/                  # 빌드 결과물
├── deno.json              # Deno 설정
└── package.json           # 프론트엔드 의존성
```

# 주요 기능 구현 상태 📊
- [x] 치지직 실시간 채팅 연동
- [x] AI 맥락 분석 (ChatGPT/Claude/Gemini)
- [x] 대화 스크립트 자동 생성
- [x] 타겟층 맞춤 코칭
- [x] 감정 분석 & 시각화
- [ ] 키워드 트렌드 분석
- [ ] 스토푸리 테마 (완전 귀여워요!)
- [x] 채팅 속도 모니터링
- [ ] 하이라이트 자동 감지
- [ ] 다국어 실시간 번역 (곧 나와요!)
- [ ] 치지직 전체 통계 분석
- [ ] 자동 방송 일정 생성
- [ ] 시청자 개인별 분석
- [ ] 콜라보 방송 지원
- [ ] 모바일 앱 버전

# 문제 해결 🔧

## 자주 묻는 질문
1. **연결 안됨**: 치지직 채널 ID가 맞는지 확인해보세요!
2. **AI가 이상해요**: API 사용량 체크! 무료 한도 넘었나봐요
3. **너무 느려요**: 인터넷 연결 상태 확인하기
4. **스토푸리 테마 어디있어요?**: 설정 > 테마 > 🍓 클릭!
5. **API 키 어디서 받아요?**:
   - ChatGPT: [OpenAI Platform](https://platform.openai.com/api-keys)
   - Claude: [Anthropic Console](https://console.anthropic.com/)
   - Gemini: [Google AI Studio](https://makersuite.google.com/app/apikey)
6. **채팅 분석이 안돼요**: 최소 5개 이상의 채팅이 필요해요!

## 로그 위치 📝
- Windows: `%APPDATA%\chzpuri-streaming-assistant\logs`

# 기여하기 🤝

## 개발 가이드라인

## 기여 방법
1. 이슈 등록
2. 포크하고 브랜치 만들기 (`git checkout -b feature/strawberry-feature`)
3. 커밋하기 (`git commit -m '🍓 Add 수퍼 멋진 기능'`)
4. 푸시하기 (`git push origin feature/strawberry-feature`)
5. PR 올리기

# License 📜
이 프로그램은 [Mozilla Public License 2.0](/LICENSE)를 따라요.
(스토푸리 팬이면 무료... 는 아니고 다 무료예요 ㅋㅋㅋ)

Copyright © 2025 GG-O-BP. All rights reserved. 🧀🍓

---

**치지푸리**는 모든 치지직 스트리머들의 방송을 더 재밌고 스마트하게 만들어드려요!
버그나 기능 요청은 [Issues](https://github.com/your-username/chzpuri-streaming-assistant/issues)에 남겨주세요~

P.S. 개발자 유튜브에서 스토푸리 덕질하는 거 구경하러 오세요!
[니지노미야 리토](https://www.youtube.com/@%EC%8A%A4%ED%86%A0%ED%91%B8%EB%A6%AC-%ED%81%B4%EB%A6%BD)
