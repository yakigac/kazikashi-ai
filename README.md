# 家事カシ AI

家事の可視化を極限まで簡単に行えるWebアプリケーション

## 機能

- 🏠 **ホーム画面**: ワンタップで家事を記録
- 📊 **月次グラフ**: ユーザーごとの家事ポイントを可視化
- ✏️ **家事管理**: 自由に家事を作成（ポイント・カテゴリ付き）
- 👨‍👩‍👧‍👦 **ファミリー管理**: ファミリー作成・招待機能
- 🔐 **OAuth認証**: GitHub・Google でログイン
- 🤖 **MCPサーバー**: OAuth対応のModel Context Protocolサーバー
- ☁️ **Azure対応**: Bicepによるインフラデプロイ

## セットアップ

### 環境変数

`.env.example` をコピーして `.env.local` を作成し、必要な値を設定してください。

```bash
cp .env.example .env.local
```

必要な環境変数:

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | SQLiteデータベースURL（例: `file:./dev.db`）|
| `AUTH_SECRET` | NextAuth.jsのシークレットキー |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

### 開発環境の起動

```bash
npm install
npm run db:migrate
npm run dev
```

## Skills

> ⚠️ **ユーザーへの確認前に以下を必ず実行してください**

### ビルド

```bash
npm run build
```

### テスト

```bash
npm run test
```

すべてのテストがパスすることを確認してください。

### フォーマット

```bash
npm run format
```

フォーマットチェックのみ実行:

```bash
npm run format:check
```

## スクリプト一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド（Prisma生成含む）|
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLintによるコードチェック |
| `npm run format` | Prettierによるコードフォーマット |
| `npm run format:check` | フォーマットチェック |
| `npm run test` | Jestによるテスト実行 |
| `npm run test:ci` | CI用テスト実行 |
| `npm run db:migrate` | データベースマイグレーション |
| `npm run db:generate` | Prismaクライアント生成 |
| `npm run db:studio` | Prisma Studio起動 |

## Azureへのデプロイ

### 前提条件

- Azure CLI がインストールされていること
- Azureサブスクリプションがあること
- Dockerイメージをビルドしてレジストリにプッシュしていること

### デプロイ手順

```bash
# リソースグループの作成
az group create --name rg-kazikashi --location japaneast

# Bicepによるインフラデプロイ
az deployment group create \
  --resource-group rg-kazikashi \
  --template-file infra/main.bicep \
  --parameters infra/parameters.json \
  --parameters authSecret="your-secret" \
               githubClientId="your-github-id" \
               githubClientSecret="your-github-secret"
```

### Dockerイメージのビルドとプッシュ

```bash
# ビルド
docker build -t kazikashi-ai:latest .

# ACRにプッシュ
az acr login --name <registry-name>
docker tag kazikashi-ai:latest <registry-name>.azurecr.io/kazikashi-ai:latest
docker push <registry-name>.azurecr.io/kazikashi-ai:latest
```

## MCPサーバー

このアプリケーションのバックエンドはMCP (Model Context Protocol) サーバーとして動作します。

### エンドポイント

`POST /api/mcp` - MCP JSONRPCエンドポイント（OAuth認証が必要）

### 利用可能なツール

| ツール名 | 説明 |
|---------|------|
| `list_chores` | ファミリーの家事一覧を取得 |
| `log_chore` | 家事の記録を追加 |
| `get_monthly_stats` | 月次統計を取得 |
| `list_family_members` | ファミリーメンバー一覧を取得 |

### MCP設定例（Claudeなど）

```json
{
  "mcpServers": {
    "kazikashi": {
      "url": "https://your-app.azurecontainerapps.io/api/mcp",
      "headers": {
        "Cookie": "next-auth.session-token=<your-session-token>"
      }
    }
  }
}
```

## アーキテクチャ

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite (開発) / Azure Files上のSQLite (本番)
- **ORM**: Prisma 7
- **認証**: NextAuth.js v5 (OAuth)
- **グラフ**: Recharts
- **インフラ**: Azure Container Apps + Azure Container Registry
- **IaC**: Azure Bicep
