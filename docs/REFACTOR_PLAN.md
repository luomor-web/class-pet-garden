# 宠物乐园 - 重构计划

## 当前状态

### 代码规模
| 文件 | 重构前 | 重构后 | 减少 |
|------|--------|--------|------|
| `src/pages/Home.vue` | 2074 行 | 648 行 | 68% |
| `server/index.js` | 935 行 | 208 行 | 78% |

### 测试覆盖
- ✅ 前端 `pets.ts` - 22 个测试
- ✅ 后端等级计算 - 5 个测试
- ❌ API 端点 - 未覆盖
- ❌ Vue 组件 - 未覆盖

---

## 重构阶段

### 阶段 1: 类型统一和工具函数提取 ✅
**已完成**:
- [x] 创建 `src/types/index.ts` 集中定义类型
- [x] 添加 `vitest` 测试框架
- [x] 为 `pets.ts` 添加单元测试
- [x] 为后端等级计算添加测试
- [x] 后端等级计算逻辑提取到 `server/utils/level.js`

---

### 阶段 2: Home.vue 拆分 ✅
**已完成**:
- [x] 抽取 composables（状态逻辑）
  - [x] useStudents.ts - 学生状态管理
  - [x] useClasses.ts - 班级状态管理
  - [x] useEvaluations.ts - 评价逻辑
  - [x] useLevelUp.ts - 升级动画
  - [x] useConfirm.ts - 确认对话框
- [x] 抽取组件
  - [x] StudentCard.vue - 学生卡片
  - [x] BatchActionBar.vue - 批量操作栏
  - [x] LevelUpModal.vue - 升级动画
  - [x] LoadingScreen.vue - 加载动画
  - [x] DetailPanel.vue - 学生详情面板
  - [x] layout/Header.vue - 顶部导航
  - [x] modals/* - 所有模态框组件
- [x] Home.vue 从 2074 行精简至 648 行

---

### 阶段 3: 后端拆分 ✅
**已完成**:
- [x] 创建模块化目录结构
- [x] 提取 routes/ (auth, classes, students, evaluations, rules, backup, settings)
- [x] 提取 middleware/auth.js
- [x] 提取 utils/ (level, password, token)
- [x] 提取 db.js
- [x] index.js 从 935 行精简至 208 行
- [x] 修复游客模式认证
- [x] 修复密码哈希兼容性

---

### 阶段 4: 测试完善
**目标**: 核心业务逻辑测试覆盖率 > 80%

#### 4.1 前端组件测试
```
src/components/__tests__/
├── StudentCard.test.ts
├── ConfirmDialog.test.ts
└── modals/
    └── ClassModal.test.ts
```

#### 4.2 后端 API 测试
```
server/__tests__/
├── auth.test.js      # 登录/注册/游客模式
├── classes.test.js   # 班级 CRUD
├── students.test.js  # 学生 CRUD
└── evaluations.test.js # 评价逻辑
```

#### 4.3 E2E 测试（可选）
- 使用 Playwright 测试完整用户流程
- 登录 → 创建班级 → 添加学生 → 评价

---

### 阶段 5: 其他优化
- [ ] 添加请求参数验证（zod）
- [ ] 统一错误处理
- [ ] 添加日志系统（替代 console.log）
- [ ] API 文档（Swagger/OpenAPI）
- [ ] 性能优化：虚拟滚动（学生列表）
- [ ] 国际化支持（i18n）

---

## 执行顺序

1. ~~阶段 1~~ - 基础设施 ✅
2. ~~阶段 3~~ - 后端拆分 ✅
3. ~~阶段 2~~ - 前端拆分 ✅
4. **阶段 4** - 测试完善 ← 当前
5. 阶段 5 - 锦上添花

---

## 时间估算

| 阶段 | 预计时间 | 状态 |
|------|----------|------|
| 阶段 1 | ✅ 完成 | Done |
| 阶段 3 | ✅ 完成 | Done |
| 阶段 2 | ✅ 完成 | Done |
| 阶段 4 | 2-3 小时 | 进行中 |
| 阶段 5 | 按需 | Pending |