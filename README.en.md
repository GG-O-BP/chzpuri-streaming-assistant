# Chzpuri Streaming Assistant 🧀🍓

omggg!! it's like the most brilliant AI chat helper for Chzzk streamers everrr!! ✨
analyses chats in real-time & makes perfect convo scripts for your desktop!! absolutely brill!! (*´▽｀*)

made by a developer who's totally obsessed with SutoPuri!! for all the Chzzk streamers out there~
can't keep up with chat?? no worries hun!! Chzpuri's got you covered!! 💕

## View in Other Languages 🌏
[**English**](./README.en.md), [한국어](./README.md), [日本語](./README.jp.md)

# Super Cool Features ✨
- ✅ real-time chat sync with official Chzzk API!! sooo fast & accurate~
- ✅ ChatGPT/Claude/Gemini analyses chat context like magic!! 🤖
- ✅ creates perfect convo scripts for your streaming style!! 📝
- ✅ custom coaching for your target audience!! 🎯
- ✅ real-time emotion analysis (positive/negative/neutral) 😊😐😢
- ✅ tracks trending keywords live!! 📊
- ✅ chat speed monitoring & alerts!! ⚡
- ✅ SutoPuri theme skins!! (developer's totally biased hehe 🍓)
- ✅ auto capture stream highlights!! 📸

# Running the Release (Normal Users) 🎮
download the installer from [latest release](https://github.com/GG-O-BP/chzpuri-streaming-assistant/releases) & start right away!!

## What You Need 💻
- Windows 10 or higher (Mac coming soon yay!!)
- Deno 2.3+
- Rust (developers only~)
- Chzzk streamer account
- AI API key (OpenAI, Claude, or Google Gemini)

## How to Install 🛠️
1. go to [releases page](https://github.com/your-username/chzpuri-streaming-assistant/releases/latest)
2. download the `.msi` file & double-click!! (made with Tauri so it's super light!!)
3. connect your Chzzk account~
4. enter AI API key & start!! (no special discount for SutoPuri fans sorry lol)

# Building from Source (Developers) 👩‍💻

## Dev Environment Setup
```bash
# clone the repo!!
git clone https://github.com/your-username/chzpuri-streaming-assistant.git
cd chzpuri-streaming-assistant

# install Deno
curl -fsSL https://deno.land/install.sh | sh

# install Tauri CLI
cargo install tauri-cli --version "^2.0"

# install dependencies
deno task install
```

## Running in Dev Mode
```bash
# start dev server
deno task tauri dev
```

## Production Build
```bash
# production build
deno task tauri build
```

# How to Use 📖

## 1. Initial Setup ⚙️
- **Chzzk Connection**: enter channel ID in "Chat" tab & click connect button!!
- **AI Settings**: in "AI Settings" tab:
  - select AI provider (ChatGPT, Claude, Gemini)
  - enter API key (stored securely!!)
  - set target audience (age group, gender, interests, content type)
- **Auto Analysis**: turn on auto analysis in "Chat Analysis" tab (analyses every 30 seconds)
- **Theme Selection**: basic theme or SutoPuri special edition 🍓

## 2. Real-time Chat Analysis 💬
- **Emotion Analysis**: see viewer moods at a glance!!
- **Keyword Extraction**: check what's trending instantly!!
- **Chat Speed**: alerts when it's too fast~
- **Spam Filtering**: blocks nasty chats automatically!!
- **Highlights**: auto-marks important moments!!

## 3. AI Conversation Coaching 🎭
- suggests "say this!!" in real-time!!
- generates perfect answers to viewer questions~
- mood maker mode (suggests funny stuff!!)
- comfort mode (suggests kind words~)

# Tech Stack 🛠️
- **Frontend**: React 18, Vite
- **Backend**: Rust (Tauri 2.0), Deno
- **AI Integration**: OpenAI API, Anthropic Claude API, Google Gemini API
- **Streaming API**: Official Chzzk API
- **State Management**: React Hooks + Rust RwLock
- **Real-time**: WebSocket (using Tauri's built-in features!!)
- **Build System**: Tauri 2.0 (faster & lighter~!!)
- **Security**: API key memory storage

# Project Structure 📁
```
chzpuri-streaming-assistant/
├── src/                    # React frontend
│   ├── components/        # React components
│   │   ├── ChzzkChat.jsx         # Chzzk chat connection
│   │   ├── AIConfig.jsx          # AI settings screen
│   │   ├── ChatAnalysis.jsx      # chat analysis & script recommendation
│   │   └── ChatHistory.jsx      # chat history viewer
│   │   ├── ChzzkChat.css         # Chzzk chat styling
│   ├── utils/             # utilities
│   │   ├── chatParser.js        # chat parsing
│   │   ├── translator.js        # multi-language translation
│   │   └── strawberryPrince.js  # SutoPuri easter eggs 🍓
│   ├── App.jsx            # main app
│   ├── App.css            # styles
│   └── main.jsx           # React entry point
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   ├── lib.rs         # main Rust logic
│   │   ├── main.rs        # Tauri entry point
│   │   ├── ai_service.rs  # AI API integration
│   │   └── chzzk/         # Chzzk chat module
│   │   │   └── chat.rs   # Chzzk chat logic
│   │   │   └── mod.rs   # Chzzk chat module internals
│   │   │   └── types.rs   # Chzzk chat module type definitions
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri config
├── public/                # static files
│   └── strawberry/        # SutoPuri resources 💕
├── dist/                  # build output
├── deno.json              # Deno config
└── package.json           # frontend dependencies
```

# Feature Implementation Status 📊
- [x] Chzzk real-time chat integration
- [x] AI context analysis (ChatGPT/Claude/Gemini)
- [x] auto conversation script generation
- [x] target audience custom coaching
- [x] emotion analysis & visualisation
- [ ] keyword trend analysis
- [ ] SutoPuri theme (sooo cute!!)
- [x] chat speed monitoring
- [ ] auto highlight detection
- [x] YouTube song request playlist
- [x] chat command system
- [ ] multi-language real-time translation (coming soon!!)
- [ ] Chzzk overall stats analysis
- [ ] auto stream schedule generation
- [ ] individual viewer analysis
- [ ] collab stream support
- [ ] mobile app version
- [ ] song request queue time prediction
- [x] song request limit settings
- [ ] command cooldown settings
- [ ] song request time limit settings
- [ ] playlist sorting to avoid consecutive songs from same requester
- [ ] playlist random shuffle

# Troubleshooting 🔧

## FAQs
1. **won't connect**: check your Chzzk channel ID is correct!!
2. **AI acting weird**: check API usage!! exceeded free tier?
3. **too slow**: check internet connection~
4. **where's SutoPuri theme??**: Settings > Theme > click 🍓!!
5. **where to get API keys??**:
   - ChatGPT: [OpenAI Platform](https://platform.openai.com/api-keys)
   - Claude: [Anthropic Console](https://console.anthropic.com/)
   - Gemini: [Google AI Studio](https://makersuite.google.com/app/apikey)
6. **chat analysis not working**: need at least 5 chats!!

## Log Location 📝
- Windows: `%APPDATA%\chzpuri-streaming-assistant\logs`

# Contributing 🤝

## Dev Guidelines
keep code tidy!! make comments cute!! (´▽｀)

## How to Contribute
1. create an issue~
2. fork & make a branch (`git checkout -b feature/strawberry-feature`)
3. commit (`git commit -m '🍓 Add brilliant feature!!'`)
4. push (`git push origin feature/strawberry-feature`)
5. submit PR!!

# Licence 📜
this programme follows [Mozilla Public License 2.0](/LICENSE)
(free pass for SutoPuri fans... just kidding!! it's free for everyone lol)

Copyright © 2025 GG-O-BP. All rights reserved. 🧀🍓

---

**Chzpuri** makes all Chzzk streamers' broadcasts more fun & smart!!
bugs or feature requests? drop them in [Issues](https://github.com/your-username/chzpuri-streaming-assistant/issues)~

P.S. come watch the developer fangirl over SutoPuri on YouTube!! xx
[니지노미야 리토](https://www.youtube.com/@%EC%8A%A4%ED%86%A0%ED%91%B8%EB%A6%AC-%ED%81%B4%EB%A6%BD)
