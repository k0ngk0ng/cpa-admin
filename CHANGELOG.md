# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

- 🎉 初始版本发布
- 📊 **Dashboard** - 系统概览和快速状态查看
- 🔑 **API Keys 管理** - 管理代理认证密钥，支持别名设置
- 🤖 **AI 提供商配置**
  - OpenAI 兼容提供商
  - Claude API
  - Gemini API
  - Codex API
  - Vertex AI
- 📁 **认证文件管理** - 上传和管理 OAuth 认证文件
- 🔐 **OAuth 配置** - 配置 OAuth 提供商和模型映射
- 📈 **配额管理** - 查看和管理各提供商的配额使用情况
- 📊 **使用统计**
  - 请求统计和趋势图表
  - 模型使用分布
  - API 详情分析
  - 成本估算
- 📝 **日志查看器**
  - 系统日志
  - 请求日志
  - 错误日志
- ⚙️ **系统配置** - 管理系统设置和配置文件
- 🎨 **API 模型** - 查看可用模型和配置模型定价
- 💾 **本地数据管理** - 导入/导出本地存储数据
- 🌍 **多语言支持** - 中文和英文界面
- 🌓 **主题切换** - 亮色/暗色/跟随系统

### Technical

- React 19 + TypeScript
- Vite 7 构建
- 单文件输出 (vite-plugin-singlefile)
- Zustand 状态管理
- SCSS Modules 样式
- Chart.js 图表
- i18next 国际化
