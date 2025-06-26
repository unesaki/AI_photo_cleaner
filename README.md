# 📸 AI Photo Cleaner

> スマートフォンの写真整理を自動化するAI搭載アプリケーション

[![CI](https://github.com/unesaki/AI_photo_cleaner/workflows/CI/badge.svg)](https://github.com/unesaki/AI_photo_cleaner/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0-000020)](https://expo.dev/)

## 🌟 概要

**AI Photo Cleaner**は、「写真整理の悩みを5分で解決する、AI搭載スマートクリーナー」をコンセプトとした、写真ライブラリの自動整理アプリです。

### 🎯 主要な価値提案
- 🔍 **重複・類似・低品質写真をAIが自動検出**
- ⚡ **平均2GBの容量を5分で節約**
- 🛡️ **安全な削除確認システム**

## ✨ 主要機能

### 📱 MVP機能（実装済み）
- [x] 📂 写真ライブラリアクセス（権限管理）
- [x] 🔄 重複写真検出（完全一致）
- [x] 🎨 直感的なユーザーインターフェース
- [x] ✅ 安全な削除確認システム
- [x] 📊 効果レポート表示

### 🚀 プレミアム機能（開発予定）
- [ ] 🤖 AI類似写真検出
- [ ] 📈 写真品質評価
- [ ] 🔄 無制限処理
- [ ] 📵 広告非表示

## 🏗️ 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| **フロントエンド** | React Native + Expo | iOS/Android同時開発、開発効率 |
| **AI処理** | TensorFlow Lite | 端末内処理、高速化、プライバシー保護 |
| **ローカルDB** | SQLite | 軽量、高速、オフライン対応 |
| **認証・分析** | Firebase | 迅速な導入、スケーラビリティ |
| **言語** | TypeScript | 型安全性、開発効率 |

## 🚀 クイックスタート

### 📋 前提条件
- Node.js 18以上
- npm または yarn
- Expo CLI
- iOS Simulator（iOS開発）
- Android Studio（Android開発）

### 🔧 セットアップ

1. **リポジトリをクローン**
   ```bash
   git clone https://github.com/unesaki/AI_photo_cleaner.git
   cd AI_photo_cleaner
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   ```

3. **開発サーバーを起動**
   ```bash
   npm start
   ```

4. **アプリを実行**
   - iOS: `i` キーまたは iOS Simulator
   - Android: `a` キーまたは Android Emulator
   - Web: `w` キー

### 📱 利用可能なコマンド

```bash
npm start          # Expo開発サーバー起動
npm run android    # Android向けビルド
npm run ios        # iOS向けビルド  
npm run web        # Web向けビルド
npm run lint       # ESLintチェック
npx tsc --noEmit   # TypeScriptチェック
```

## 🏗️ プロジェクト構造

```
AI_photo_cleaner/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard screen
│   │   └── explore.tsx    # Results screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   └── ui/               # Design system components
├── src/
│   ├── services/         # Business logic
│   │   ├── DatabaseService.ts
│   │   ├── PhotoService.ts
│   │   └── DuplicateDetectionService.ts
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utilities and constants
├── docs/                # Design documents
│   ├── detail_design/   # Technical specifications
│   └── TODO.adoc        # Development roadmap
└── .github/             # CI/CD and templates
```

## 🧪 開発・テスト

### コード品質
```bash
npm run lint              # ESLint実行
npx tsc --noEmit         # TypeScript型チェック
```

### CI/CD
GitHub Actionsを使用して以下を自動化：
- ✅ ESLintチェック  
- ✅ TypeScript型チェック
- ✅ セキュリティ監査
- ✅ ビルドチェック

## 🐳 Docker環境

開発環境のコンテナ化が可能です：

```bash
docker-compose build     # 環境構築
docker-compose up       # 開発サーバー起動
```

**利用可能なポート:**
- 8081: Metro bundler
- 19000: Expo Dev Tools  
- 19001-19002: Expo Dev Server

## 📋 開発ロードマップ

### ✅ Phase 1: MVP実装（完了）
- [x] 基本UI実装
- [x] 重複検出エンジン
- [x] 写真ライブラリアクセス
- [x] 削除確認システム

### 🚧 Phase 2: AI機能追加（開発中）
- [ ] TensorFlow.js統合
- [ ] AI類似写真検出
- [ ] 写真品質評価エンジン
- [ ] パフォーマンス最適化

### 📅 Phase 3: リリース準備（予定）
- [ ] ユニットテスト実装
- [ ] UI/UXアニメーション
- [ ] アクセシビリティ対応
- [ ] ストア申請準備

## 🤝 貢献

プロジェクトへの貢献を歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### 🐛 バグ報告・機能要望
- [Issues](https://github.com/unesaki/AI_photo_cleaner/issues) でバグ報告
- [Feature Request](https://github.com/unesaki/AI_photo_cleaner/issues/new?template=feature_request.md) で機能要望

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 📞 サポート

- 📖 [詳細設計書](docs/detail_design/project_design.adoc)
- 📋 [開発TODO](docs/TODO.adoc)
- 🐛 [Issue報告](https://github.com/unesaki/AI_photo_cleaner/issues)

---

<p align="center">
  <strong>📸 AI Photo Cleaner - スマートな写真整理をあなたの手に</strong>
</p>
