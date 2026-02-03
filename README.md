
# Lumina Fashion Studio

AI搭載のファッションモデル生成アプリケーション。アップロードした服の画像から、プロフェッショナルなファッション撮影画像を自動生成します。

## 主な機能

- **服画像のアップロード**: トップス、パンツ、アウター、インナー、シューズを個別にアップロード
- **AIモデル生成**: Gemini 3 Pro Imageを使用して、リアルなファッションモデル画像を生成
- **詳細なカスタマイズ**:
  - モデル設定（性別、体型、年齢層、雰囲気）
  - ポーズ選択（10種類以上）
  - ライティングプリセット（スタジオ、ゴールデンアワー、ネオン等）
  - カメラ設定（ショットタイプ、焦点距離）
  - 服のサイズ指定（肩幅、着丈、ウエスト等）
- **画像編集機能**: 生成後の画像を構造化フォームで編集（色、スタイル、素材、パターン変更）

## デプロイ手順 (Vercel)

1. GitHubにこのリポジトリをプッシュします。
2. [Vercel](https://vercel.com) にログインし、`New Project` からこのリポジトリを選択します。
3. **重要**: 環境変数の設定は不要です。ユーザーが各自のGemini API Keyを入力する仕様になっています。
4. `Deploy` ボタンをクリックして完了です。

## ローカル開発

```bash
npm install
npm run dev
```

アプリケーション起動後、ブラウザで `http://localhost:5174` にアクセスし、Gemini API Keyを入力してください。

API Keyは [Google AI Studio](https://aistudio.google.com/apikey) から取得できます。

## 技術スタック

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI Engine**: Gemini 3 Pro Image (画像生成), Gemini 2.0 Flash (画像解析)
- **Authentication**: Mock認証 (localStorage)
- **Deployment**: Vercel

## アーキテクチャ

- `App.tsx`: メインアプリケーションロジック、状態管理
- `components/ControlPanel.tsx`: 左サイドバーの設定パネル
- `components/RefinementForm.tsx`: 画像編集用の構造化入力フォーム
- `components/RefinementConfirmation.tsx`: 編集内容の確認ダイアログ
- `services/geminiService.ts`: Gemini API連携、プロンプト生成
- `types.ts`: TypeScript型定義

