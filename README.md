# 班级宠物园 🐾

> 游戏化班级管理工具，让积分评价变得有趣高效

![版本](https://img.shields.io/badge/version-1.0.0-blue)
![测试](https://img.shields.io/badge/tests-63%20passed-brightgreen)
![技术栈](https://img.shields.io/badge/Vue3-TypeScript-blue)

## ✨ 项目简介

班级宠物园是一个面向中小学教师的班级管理工具，将积分评价与电子宠物养成玩法相结合。学生通过良好表现获得积分，让宠物成长升级，最终获得毕业徽章。

### 核心特点

- 🎓 **多班级管理** - 支持创建和管理多个班级
- 🐾 **宠物养成** - 24种宠物，8级成长体系
- ⭐ **积分评价** - 83条默认规则，支持自定义
- 📊 **排行榜** - 实时积分排名
- 💾 **数据安全** - SQLite数据库，支持备份恢复
- 📱 **响应式设计** - 适配多端设备

---

## 🚀 快速开始

### 在线演示
https://8.147.56.12/

### 本地开发

```bash
# 安装依赖
npm install

# 启动前端和后端
npm start

# 或分别启动
npm run dev      # 前端 :3001
npm run server   # 后端 :3000
```

### 生产部署

项目使用 Nginx 托管静态文件，后端 API 独立运行。

**部署命令：**
```bash
# 构建并部署到 Nginx 静态目录
npm run deploy

# 查看用户和班级统计
npm run stats
```

**服务管理：**
```bash
# 查看后端服务状态
systemctl status pet-garden

# 重启后端服务
sudo systemctl restart pet-garden

# 查看日志
journalctl -u pet-garden -f
```

**Nginx 配置要点：**
- 静态文件：`/var/www/`
- API 代理：`/api/` → `http://127.0.0.1:3000`
- 已启用 gzip 压缩
- 静态资源缓存 1 年

---

## 🎯 功能概览

### 宠物系统（24种）

| 类型 | 宠物 |
|------|------|
| 🐕 犬类 | 西高地、比熊、边牧、柴犬、金毛、萨摩耶、哈士奇 |
| 🐈 猫类 | 虎斑猫、加菲猫、布偶猫、橘猫 |
| 🐇 其他 | 垂耳兔、安哥拉兔、柯尔鸭、羊驼、小熊猫 |
| 🌟 神兽 | 白虎、独角兽、貔貅、青龙、朱雀、狻猊、多肉精灵 |

### 成长体系

| 等级 | 积分 | 称号 |
|------|------|------|
| Lv.1 | 0 | 初生 |
| Lv.2 | 40 | 成长 |
| Lv.3 | 100 | 优秀 |
| Lv.4 | 180 | 进阶 |
| Lv.5 | 280 | 稀有 |
| Lv.6 | 400 | 精英 |
| Lv.7 | 540 | 史诗 |
| Lv.8 | 700+ | 传说（毕业）|

### 评价规则（83条）

| 分类 | 加分 | 扣分 |
|------|------|------|
| 📚 学习 | 9条 | 7条 |
| 🎯 行为 | 13条 | 19条 |
| 💪 健康 | 7条 | 7条 |
| 📝 其他 | 16条 | 5条 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│                 班级宠物园                    │
├─────────────────────────────────────────────┤
│  Vue 3 + TypeScript + Tailwind CSS          │
│              ↓ REST API                      │
│  Node.js + Express + better-sqlite3         │
│              ↓                               │
│         SQLite (luomor-pet.db)              │
└─────────────────────────────────────────────┘
```

### 技术栈

| 前端 | 后端 |
|------|------|
| Vue 3 | Node.js + Express |
| TypeScript | better-sqlite3 |
| Tailwind CSS | REST API |
| Vite | Vitest |

---

## 📁 项目结构

```
class-pet-garden/
├── src/                        # 前端源码
│   ├── components/             # 组件
│   │   ├── StudentCard.vue    # 学生卡片
│   │   ├── DetailPanel.vue    # 详情面板
│   │   ├── modals/            # 模态框组件
│   │   └── layout/            # 布局组件
│   ├── composables/            # 组合式函数（单例状态）
│   │   ├── useAuth.ts         # 认证
│   │   ├── useClasses.ts      # 班级状态
│   │   ├── useStudents.ts     # 学生状态
│   │   ├── useTags.ts         # 标签状态
│   │   ├── useToast.ts        # 提示
│   │   └── useLevelUp.ts      # 动画
│   ├── utils/                  # 工具函数
│   │   └── pinyin.ts          # 拼音匹配
│   ├── pages/                  # 页面
│   ├── data/                   # 数据配置
│   └── types/                  # 类型定义
│
├── server/                     # 后端源码
│   ├── routes/                 # API 路由
│   │   ├── auth.js            # 认证
│   │   ├── classes.js         # 班级
│   │   ├── students.js        # 学生
│   │   ├── evaluations.js     # 评价
│   │   └── ...
│   ├── middleware/             # 中间件
│   ├── utils/                  # 工具函数
│   └── __tests__/              # 测试
│
├── docs/                       # 文档
├── scripts/                    # 脚本
└── public/                     # 静态资源
```

---

## 🔌 API 接口

```
# 认证
POST   /api/auth/register        # 注册
POST   /api/auth/login           # 登录
GET    /api/auth/me              # 当前用户

# 班级
GET    /api/classes              # 班级列表
POST   /api/classes              # 创建班级
PUT    /api/classes/:id          # 更新班级
DELETE /api/classes/:id          # 删除班级
GET    /api/classes/:id/students # 学生列表
GET    /api/settings/ranking/:id # 排行榜

# 学生
POST   /api/students             # 添加学生
PUT    /api/students/:id         # 更新学生
DELETE /api/students/:id         # 删除学生
POST   /api/students/import      # 批量导入
PUT    /api/students/:id/pet     # 更换宠物

# 评价
GET    /api/rules                # 规则列表
POST   /api/rules                # 添加规则
DELETE /api/rules/:id            # 删除规则
POST   /api/evaluations          # 添加评价
GET    /api/evaluations          # 评价记录
DELETE /api/evaluations/:id      # 删除记录

# 数据
GET    /api/backup               # 导出备份
POST   /api/backup               # 导入恢复
GET    /api/health               # 健康检查
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 测试统计
# - 前端组件测试: 11 个
# - 后端 API 测试: 10 个
# - 工具函数测试: 20 个
# - 宠物配置测试: 22 个
# 总计: 63 个测试
```

---

## 📊 重构成果

### 代码量优化

| 指标 | 重构前 | 重构后 | 改善 |
|------|--------|--------|------|
| Home.vue | 2074 行 | 648 行 | -68% |
| server/index.js | 935 行 | 208 行 | -78% |
| 测试覆盖 | 27 个 | 63 个 | +133% |
| 组件数量 | 5 个 | 15+ 个 | 模块化 |

### 状态管理重构（2026-03）

| 改动 | 说明 |
|------|------|
| `useStudents.ts` | 单例学生状态，多页面共享 |
| `useTags.ts` | 单例标签状态 |
| `utils/pinyin.ts` | 统一拼音匹配工具 |
| 移除 localStorage hack | 数据通过 Vue 响应式自动同步 |
| 死代码清理 | 删除未使用的 `useEvaluations.ts`、`getDeadPetImage` 等 |

### 页面数据同步

重构前：各页面独立维护学生数据，通过 localStorage 时间戳通知同步（hack）

重构后：单例状态管理，一处更新处处同步

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！