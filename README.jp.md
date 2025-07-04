# ちじぷり配信アシスタント 🧀🍓

きゃー！チジジックの配信者さんのためのAIチャットヘルパーだよ〜！✨
リアルタイムでチャット分析して、完璧な会話スクリプト作っちゃうデスクトップアプリなの〜！(*´▽｀*)

すとぷり大好きな開発者お姉ちゃんが作った、チジジックストリーマーさんのための最高のAI秘書だよ〜！
チャット早すぎて読めない？だいじょうぶ！ちじぷりにおまかせ〜！💕

## 他の言語で見る 🌏
[**日本語**](./README.jp.md), [한국어](./README.md), [English](./README.en.md)

# すごい機能たち ✨
- ✅ チジジック公式APIでリアルタイムチャット連動！はやい〜正確〜！
- ✅ ChatGPT/Claude/Geminiちゃんがチャットの流れをサクサク分析〜！🤖
- ✅ 配信スタイルにぴったりの会話スクリプト作成〜！📝
- ✅ ターゲット視聴者さんに合わせたコーチング機能！🎯
- ✅ リアルタイム感情分析だよ〜（ポジティブ/ネガティブ/普通）😊😐😢
- ✅ 人気キーワードをリアルタイムで追跡〜！📊
- ✅ チャット速度モニタリング＆お知らせ機能！⚡
- ✅ すとぷりテーマスキン対応！（開発者お姉ちゃんの愛がいっぱい🍓）
- ✅ 配信ハイライト自動キャプチャー！📸

# リリース版を使う（一般ユーザーさん）🎮
[最新リリース](https://github.com/GG-O-BP/chzpuri-streaming-assistant/releases)からインストールファイルをダウンロードして、すぐ始められるよ〜！

## 必要なもの 💻
- Windows 10以上（Macもすぐ対応するよ〜！）
- Deno 2.3以上
- Rust（開発者さんだけ〜）
- チジジックストリーマーアカウント
- AI APIキー（OpenAI、Claude、またはGoogle Geminiのいずれか）

## インストール方法 🛠️
1. [リリースページ](https://github.com/your-username/chzpuri-streaming-assistant/releases/latest)に行く〜！
2. `.msi`ファイルをダウンロードしてダブルクリック〜！（Tauriで作ったから軽いよ！）
3. チジジックアカウントと連携する〜
4. AI APIキー入力して始めよう！（すとぷりすなーでも割引はないよ〜ｗｗｗ）

# ソースコードからビルドする（開発者さん）👩‍💻

## 開発環境セットアップ
```bash
# リポジトリをクローン！
git clone https://github.com/your-username/chzpuri-streaming-assistant.git
cd chzpuri-streaming-assistant

# Denoインストール
curl -fsSL https://deno.land/install.sh | sh

# Tauri CLIインストール
cargo install tauri-cli --version "^2.0"

# 依存関係インストール
deno task install
```

## 開発モードで実行
```bash
# 開発サーバー起動
deno task tauri dev
```

## プロダクションビルド
```bash
# プロダクションビルド
deno task tauri build
```

# 使い方 📖

## 1. 初期設定 ⚙️
- **チジジック連携**: 「Connect Chzzk」ボタンをポチッ！かんたん〜！
- **AI設定**: 「AI設定」タブで：
  - AIプロバイダー選択（ChatGPT、Claude、Gemini）
  - APIキー入力（安全に保管されるよ〜！）
  - ターゲット視聴者設定（年齢層、性別、興味、コンテンツタイプ）
- **自動分析**: 「チャット分析」タブで自動分析をON（30秒ごとに分析）
- **配信スタイル設定**: ゲーム配信？トーク配信？歌配信？全部OK！
- **ターゲット層設定**: 10代？20代？すとぷりすなー？
- **テーマ選択**: 基本テーマ or すとぷりスペシャルエディション🍓

## 2. リアルタイムチャット分析 💬
- **感情分析**: 視聴者さんの気持ちがひと目でわかる〜！
- **キーワード抽出**: 何がホットなのかすぐチェック！
- **チャット速度**: 早すぎたらお知らせするよ〜
- **スパムフィルタリング**: 悪いチャットは自動でブロック！
- **ハイライト**: 大事な瞬間を自動マーキング！

## 3. AI会話コーチング 🎭
- リアルタイムで「こう答えて〜！」って提案するよ！
- 視聴者さんの質問に完璧な答えを生成〜
- ムードメーカーモード（面白いネタ提案！）
- 癒しモード（優しい言葉を提案〜）

# 技術スタック 🛠️
- **Frontend**: React 18、Vite
- **Backend**: Rust（Tauri 2.0）、Deno
- **AI Integration**: OpenAI API、Anthropic Claude API、Google Gemini API
- **Streaming API**: チジジック公式API
- **State Management**: React Hooks + Rust RwLock
- **Real-time**: WebSocket（Tauriの内蔵機能活用！）
- **Build System**: Tauri 2.0（もっと速くて軽い〜！）
- **Security**: APIキーメモリ保存

# プロジェクト構造 📁
```
chzpuri-streaming-assistant/
├── src/                    # Reactフロントエンド
│   ├── components/        # Reactコンポーネントたち
│   │   ├── ChzzkChat.jsx         # チジジックチャット連携
│   │   ├── AIConfig.jsx          # AI設定画面
│   │   ├── ChatAnalysis.jsx      # チャット分析＆スクリプト提案
│   │   └── ChatHistory.jsx      # チャット履歴ビューアー
│   │   ├── ChzzkChat.css         # チジジックチャットスタイリング
│   ├── utils/             # ユーティリティ
│   │   ├── chatParser.js        # チャットパーシング
│   │   ├── translator.js        # 多言語翻訳
│   │   └── strawberryPrince.js  # すとぷりイースターエッグ🍓
│   ├── App.jsx            # メインアプリ
│   ├── App.css            # スタイル
│   └── main.jsx           # Reactエントリポイント
├── src-tauri/             # Tauriバックエンド
│   ├── src/
│   │   ├── lib.rs         # メインRustロジック
│   │   ├── main.rs        # Tauriエントリポイント
│   │   ├── ai_service.rs  # AI API統合
│   │   └── chzzk/         # チジジックチャットモジュール
│   │   │   └── chat.rs   # チジジックチャットロジック
│   │   │   └── mod.rs   # チジジックチャットモジュール内部モジュール
│   │   │   └── types.rs   # チジジックチャットモジュール内部型定義
│   ├── Cargo.toml         # Rust依存関係
│   └── tauri.conf.json    # Tauri設定
├── public/                # 静的ファイル
│   └── strawberry/        # すとぷりリソース💕
├── dist/                  # ビルド結果
├── deno.json              # Deno設定
└── package.json           # フロントエンド依存関係
```

# 主要機能の実装状況 📊
- [x] チジジックリアルタイムチャット連携
- [x] AIコンテキスト分析（ChatGPT/Claude/Gemini）
- [x] 会話スクリプト自動生成
- [x] ターゲット層カスタムコーチング
- [x] 感情分析＆ビジュアライゼーション
- [ ] STT (koreandolloar - キムドウォン)
- [ ] キーワードトレンド分析
- [ ] すとぷりテーマ（めっちゃかわいい！）
- [x] チャット速度モニタリング
- [ ] ハイライト自動検出
- [x] YouTube曲リクエストプレイリスト
- [x] チャットコマンドシステム
- [ ] 多言語リアルタイム翻訳（もうすぐ！）
- [ ] チジジック全体統計分析
- [ ] 自動配信スケジュール生成
- [ ] 視聴者個別分析
- [ ] コラボ配信サポート
- [ ] モバイルアプリ版
- [ ] 曲リクエスト待機時間予測
- [x] 曲リクエスト数制限設定
- [ ] コマンドクールタイム設定
- [ ] 曲リクエスト時間制限設定
- [ ] プレイリストソート優先順位で同一リクエスターの曲が連続する場合を後回しに
- [ ] プレイリストランダムシャッフル

# トラブルシューティング 🔧

## よくある質問
1. **つながらない〜**: チジジックチャンネルIDが正しいか確認してみて！
2. **AIがヘン**: API使用量チェック！無料枠超えちゃった？
3. **遅い〜**: インターネット接続確認して〜
4. **すとぷりテーマどこ？**: 設定 > テーマ > 🍓をクリック！
5. **APIキーどこで取るの？**：
   - ChatGPT: [OpenAI Platform](https://platform.openai.com/api-keys)
   - Claude: [Anthropic Console](https://console.anthropic.com/)
   - Gemini: [Google AI Studio](https://makersuite.google.com/app/apikey)
6. **チャット分析ができない〜**: 最低5個以上のチャットが必要だよ！

## ログの場所 📝
- Windows: `%APPDATA%\chzpuri-streaming-assistant\logs`

# コントリビュート 🤝

## 開発ガイドライン
コードはきれいに〜！コメントはかわいく〜！ヽ(´▽｀)/

## コントリビュート方法
1. イシュー登録する〜
2. フォークしてブランチ作る〜（`git checkout -b feature/strawberry-feature`）
3. コミットする〜（`git commit -m '🍓 すごい機能追加！'`）
4. プッシュする〜（`git push origin feature/strawberry-feature`）
5. PR出す〜！

# ライセンス 📜
このプログラムは[Mozilla Public License 2.0](/LICENSE)に従ってるよ〜
（すとぷりすなーなら無料...って冗談！みんな無料だよ〜ｗｗｗ）
(스토푸리 팬이면 무료... 는 아니고 다 무료예요 ㅋㅋㅋ)

Copyright © 2025 GG-O-BP. All rights reserved. 🧀🍓

---

**ちじぷり**はすべてのチジジックストリーマーさんの配信をもっと楽しく、スマートにするよ〜！
バグとか機能リクエストは[Issues](https://github.com/your-username/chzpuri-streaming-assistant/issues)に書いてね〜

P.S. 開発者お姉ちゃんのYouTubeですとぷり推し活見に来て〜！（≧▽≦）
[니지노미야 리토](https://www.youtube.com/@%EC%8A%A4%ED%86%A0%ED%91%B8%EB%A6%AC-%ED%81%B4%EB%A6%BD)
