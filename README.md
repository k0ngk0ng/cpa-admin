# CPA Admin

<p align="center">
  <strong>CLI Proxy API 管理中心</strong>
</p>

<p align="center">
  <a href="https://github.com/k0ngk0ng/cpa-admin/actions/workflows/build.yml">
    <img src="https://github.com/k0ngk0ng/cpa-admin/actions/workflows/build.yml/badge.svg" alt="Build Status">
  </a>
  <a href="https://github.com/k0ngk0ng/cpa-admin/releases">
    <img src="https://img.shields.io/github/v/release/k0ngk0ng/cpa-admin" alt="Release">
  </a>
  <a href="https://github.com/k0ngk0ng/cpa-admin/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/k0ngk0ng/cpa-admin" alt="License">
  </a>
</p>

<p align="center">
  一个现代化的 Web 管理界面，用于管理 <a href="https://github.com/router-for-me/CLIProxyAPIPlus">CLI Proxy API Plus</a> 服务。
</p>

---

## ✨ 特性

- 🎨 **现代化 UI** - 精心设计的用户界面，支持亮色/暗色主题
- 📦 **单文件部署** - 构建输出为单个 HTML 文件，无需服务器即可使用
- 🌍 **多语言支持** - 支持中文和英文界面
- 🔐 **完整的管理功能**
  - API Keys 管理
  - AI 提供商配置 (OpenAI, Claude, Gemini, Codex, Vertex)
  - 认证文件管理
  - OAuth 配置
  - 配额管理
  - 使用统计与分析
  - 日志查看器
  - 模型定价配置

## 📸 截图

<details>
<summary>点击展开截图</summary>

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Usage Statistics
![Usage](docs/screenshots/usage.png)

### API Keys Management
![API Keys](docs/screenshots/api-keys.png)

</details>

## 🚀 快速开始

### 方式一：直接下载使用

1. 前往 [Releases](https://github.com/k0ngk0ng/cpa-admin/releases) 页面
2. 下载最新版本的 `cpa-admin-*.html` 文件
3. 在浏览器中打开该文件
4. 输入您的 CLI Proxy API 服务器地址和管理密钥
5. 开始使用！

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/k0ngk0ng/cpa-admin.git
cd cpa-admin

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

构建完成后，`dist/index.html` 即为可直接使用的单文件版本。

## 🛠️ 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **状态管理**: Zustand
- **样式**: SCSS Modules
- **国际化**: i18next
- **图表**: Chart.js
- **单文件打包**: vite-plugin-singlefile

## 📁 项目结构

```
src/
├── components/       # UI 组件
│   ├── layout/      # 布局组件
│   ├── monitor/     # 监控相关组件
│   ├── quota/       # 配额相关组件
│   ├── ui/          # 通用 UI 组件
│   └── usage/       # 使用统计组件
├── hooks/           # 自定义 Hooks
├── i18n/            # 国际化配置
├── pages/           # 页面组件
├── router/          # 路由配置
├── services/        # API 服务
├── stores/          # 状态管理
├── styles/          # 全局样式
├── types/           # TypeScript 类型定义
└── utils/           # 工具函数
```

## 🔧 配置

### 环境变量

开发时可以创建 `.env.local` 文件：

```env
# API 服务器地址（可选，用于开发）
VITE_API_BASE_URL=http://localhost:8080
```

## 📝 开发命令

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [CLI Proxy API Plus](https://github.com/router-for-me/CLIProxyAPIPlus) - 主项目
- [帮助文档](https://help.router-for.me/) - 使用文档

## 📮 联系

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/k0ngk0ng/cpa-admin/issues)
- 查看 [Discussions](https://github.com/k0ngk0ng/cpa-admin/discussions)
