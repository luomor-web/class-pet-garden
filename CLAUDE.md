# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中操作代码提供指引。

## 项目概述

班级宠物园是一个游戏化班级管理系统，将积分追踪与虚拟宠物养成相结合。教师可以管理多个班级、评价学生，学生通过累积积分让宠物成长升级。

## 构建与开发命令

```bash
# 安装依赖
npm install

# 开发模式（同时启动前端 :3001 和后端 :3000）
npm start

# 仅前端（Vite 开发服务器）
npm run dev

# 仅后端（Express API）
npm run server

# 生产构建
npm run build        # 类型检查 + 构建前端
npm run preview      # 预览生产构建

# 运行测试
npm test             # Vitest（前端和后端）
npm run test:run     # 运行一次，无监视模式
npm run test:coverage

# 服务器脚本
npm run stats        # 查看用户/班级统计
```

## 架构概览

### 技术栈
- **前端**: Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia + Vue Router
- **后端**: Node.js + Express + better-sqlite3 (ES Modules)
- **测试**: Vitest + happy-dom（前端）, supertest（后端）

### 项目结构

```
class-pet-garden/
├── src/                          # 前端源码
│   ├── composables/              # 共享状态（单例）
│   │   ├── useAuth.ts            # 认证状态
│   │   ├── useClasses.ts         # 班级管理
│   │   ├── useStudents.ts        # 学生数据（跨页面共享）
│   │   ├── useTags.ts            # 标签定义
│   │   └── useToast.ts           # 提示通知
│   ├── components/
│   │   ├── layout/               # PageLayout, Header
│   │   ├── modals/               # 班级/学生/评价/宠物弹窗
│   │   └── *.vue                 # 可复用组件
│   ├── pages/                    # 路由组件（Home, Students, Ranking 等）
│   ├── data/pets.ts              # 宠物定义与等级配置
│   ├── router/index.ts           # Vue Router 配置
│   └── types/index.ts            # TypeScript 类型定义
│
├── server/
│   ├── index.js                  # Express 入口
│   ├── db.js                     # SQLite 初始化
│   ├── routes/                   # API 路由
│   │   ├── auth.js               # 登录/注册
│   │   ├── classes.js            # 班级 CRUD
│   │   ├── students.js           # 学生 CRUD + 批量导入
│   │   ├── evaluations.js        # 评价记录
│   │   ├── rules.js              # 自定义规则
│   │   ├── backup.js             # 备份/恢复
│   │   └── settings.js           # 应用设置
│   ├── middleware/               # 认证、所有权检查
│   └── utils/                    # 密码哈希、令牌工具
│
└── public/pets/                  # 宠物图片（按品种/等级）
```

### 核心模式

**状态管理**: 使用 composable 单例而非 Pinia 存储。`useStudents.ts` 维护跨页面共享的学生状态——一处更新，处处同步。

**路径别名**: `@/` 在 Vite 和 Vitest 配置中均解析为 `src/`。

**API 代理**: Vite 代理 `/api` → `http://localhost:3000/api`

**后端结构**: Express 模块路由，每个路由文件处理一个领域（班级、学生、评价）。使用 `better-sqlite3` 进行同步数据库操作。

### 宠物系统

- **25 种宠物**: 18 种普通 + 7 种神兽
- **8 个等级**: 经验阈值 `[40, 60, 80, 100, 120, 140, 160]`
- **图片**: 每只宠物有 8 张等级图片，位于 `public/pets/{pet-id}/lv{1-8}.png`
- **状态逻辑**: 积分 < -20 = 死亡，< 0 = 受伤，否则为健康

### 数据库结构

单个 SQLite 文件 (`server/luomor-pet.db`)，包含表：
- `users` - 教师账号（游客 + 管理员）
- `classes` - 班级
- `students` - 学生记录（含宠物分配）
- `evaluations` - 评价记录
- `evaluation_rules` - 评价规则
- `tags` - 自定义标签
- `settings` - 应用配置

## 测试

前端测试使用 Vitest + @vue/test-utils + happy-dom：
```bash
# 运行特定测试文件
npm test -- src/components/__tests__/StudentCard.test.ts

# 监视模式运行
npm test
```

后端测试使用 Vitest + supertest：
```bash
# 运行服务器测试
cd server && npm test
```

## 重要注意事项

1. **后端使用 ES Modules** - 所有服务器文件使用 `import/export` 语法，非 CommonJS
2. **中文注释** - 代码注释为中文，保持此约定
3. **严格 TypeScript** - 启用 `noUnusedLocals`, `noUnusedParameters`
4. **仅 Tailwind 样式** - 无自定义 CSS，使用 Tailwind 工具类
5. **宠物图片** - 存储于 `public/pets/{pet-id}/lv{level}.png`；提交前使用 `pngquant` 压缩

## 相关文档

- `AGENTS.md` - 详细编码规范和 API 参考
- `README.md` - 用户文档和功能概览
- `docs/PET_IMAGES_GUIDE.md` - 宠物图片生成工作流
