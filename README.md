# DeepThink 🧠

> **一款支持无限画布与 DeepSeek R1 思维过程可视化的 AI 对话助手**

## 📖 简介

DeepThink 是一个基于 Next.js 构建的现代化 AI 对话应用。它独特地将 DeepSeek R1 模型的"链式思维"（Chain of Thought）过程可视化，让用户可以观察 AI 的推理过程。同时，应用支持分支对话功能，使用节点式画布（React Flow）展示对话树，实现非线性的思维探索。

## ✨ 核心特性

### 🔍 深度思考可视化
- 解析并展示 DeepSeek R1 模型的 `<think>` 标签内容
- 可折叠的思维过程面板，兼顾阅读体验

### 🌳 无限画布
- 基于 React Flow 的节点式对话展示
- 支持从任意 AI 回复创建分支，探索不同对话路径
- 支持画布/对话两种视图模式切换

### 💾 本地持久化
- 使用 SQLite + Prisma 保存对话历史
- 支持刷新页面后恢复对话

### 🔌 模型灵活性
- 原生支持 DeepSeek API
- 兼容 OpenAI 格式的第三方服务商（如 API Mart）

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| UI 组件 | Shadcn UI + Radix UI |
| 画布 | React Flow + Dagre |
| 数据库 | SQLite + Prisma ORM |
| Markdown | react-markdown + KaTeX + Highlight.js |
| 图标 | Lucide React |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/deepthink.git
cd deepthink
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例环境文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 API 密钥：

```env
# DeepSeek API 密钥（必填）
DEEPSEEK_API_KEY=sk-your-api-key

# 可选：自定义 API 地址（默认使用 DeepSeek 官方）
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 可选：自定义模型名称（默认 gpt-4o）
DEEPSEEK_MODEL=deepseek-reasoner

# 数据库路径（SQLite）
DATABASE_URL="file:./dev.db"
```

### 4. 初始化数据库

```bash
npx prisma db push
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📁 项目结构

```
deepthink/
├── app/                    # Next.js App Router 页面
│   ├── api/                # API 路由
│   │   ├── chat/           # 聊天接口（流式响应）
│   │   ├── threads/        # 对话线程 CRUD
│   │   └── messages/       # 消息保存接口
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 主页面
├── components/             # React 组件
│   ├── chat/               # 聊天相关组件
│   │   ├── message-bubble.tsx
│   │   ├── chat-input.tsx
│   │   └── selection-menu.tsx
│   ├── canvas/             # 画布相关组件
│   └── ui/                 # Shadcn UI 组件
├── contexts/               # React Context
│   └── canvas-context.tsx  # 画布状态管理
├── lib/                    # 工具函数
│   ├── db.ts               # Prisma 客户端
│   └── utils.ts            # 通用工具
├── prisma/                 # Prisma 配置
│   ├── schema.prisma       # 数据库模型
│   └── dev.db              # SQLite 数据库文件
├── types/                  # TypeScript 类型定义
└── public/                 # 静态资源
```

## 📝 使用说明

1. **开始对话**：在输入框输入问题，按 Enter 发送
2. **查看思考过程**：点击 AI 回复上方的"思考过程"展开/收起
3. **创建分支**：在任意 AI 回复上点击分支按钮，开启新的对话方向
4. **切换视图**：使用顶部导航在"对话"和"画布"模式间切换
5. **划词操作**：选中 AI 回复中的文字，可以进行"解释"、"举例"或"引用"操作

## 📄 许可证

MIT License

---

**Made with ❤️ by DeepThink Team**
