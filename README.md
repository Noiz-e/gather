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

React + TypeScript + Vite + TailwindCSS

## 开发

```bash
npm install
npm run dev
```

## 部署

```bash
npm run build
cd dist && gcloud storage cp --recursive ./ gs://gatherin.org
```

---

*数据本地存储，保护隐私*
