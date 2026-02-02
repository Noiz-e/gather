# Gather

> 🚧 项目开发中 / Work in Progress

面向宗教社区的播客创作平台。

## 特色

**多宗教主题风格** — 支持 8 种信仰风格，每种都有独特的视觉设计和图标：
- Christianity (十字架)
- Catholicism (教宗十字)
- Buddhism (法轮)
- Islam (新月星)
- Judaism (大卫之星)
- Hinduism (唵字符)
- Taoism (太极)
- Default (通用)

## 技术栈

- **前端**: React + TypeScript + Vite + TailwindCSS
- **后端**: Express + TypeScript + Gemini API

## 开发

### 启动后端

```bash
cd server
npm install
cp .env.example .env  # 然后编辑 .env 添加你的 GEMINI_API_KEY
npm run dev
```

后端运行在 http://localhost:3001

### 启动前端

```bash
npm install
npm run dev
```

前端运行在 http://localhost:5173，API 请求会自动代理到后端。

## API 接口

### LLM 接口
- `POST /api/llm/generate` - 文本生成
- `POST /api/llm/stream` - 流式文本生成 (SSE)

### 语音接口
- `GET /api/voice/voices` - 获取可用音色列表
- `POST /api/voice/synthesize` - 文本转语音
- `POST /api/voice/preview` - 预览音色

### 音频接口
- `POST /api/audio/batch` - 批量生成音频片段
- `POST /api/audio/batch-stream` - 流式批量生成 (SSE)

### 图片接口
- `POST /api/image/generate` - 生成图片 (Imagen 3)
- `POST /api/image/cover` - 生成播客封面

### 音乐/音效接口
- `GET /api/music/options` - 获取音乐风格和情绪选项
- `POST /api/music/generate` - 生成背景音乐
- `POST /api/music/bgm` - 生成播客背景音乐 (优化设置)
- `POST /api/music/sfx` - 生成音效
- `GET /api/music/sfx-suggestions` - 获取常用音效建议

## 部署

### 后端部署 (Cloud Run)

```bash
cd server

# 方式一：使用部署脚本
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1
export GEMINI_API_KEY=your-api-key
./deploy.sh

# 方式二：手动部署
gcloud run deploy gather-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your-api-key"
```

部署后获取 URL：
```bash
gcloud run services describe gather-api --region us-central1 --format 'value(status.url)'
```

### 前端部署 (Cloud Storage)

```bash
# 设置后端 API 地址
export VITE_API_BASE=https://gather-api-xxx.run.app/api

npm run build
cd dist && gcloud storage cp --recursive ./ gs://gatherin.org
```

---

*数据本地存储，保护隐私*
