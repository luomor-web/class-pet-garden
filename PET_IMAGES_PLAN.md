# 宠物等级图片生成方案

> 面向群体：小学生
> 技术方案：硅基流动 FLUX.1 模型
> 生成方式：预生成图片库

---

## 一、现有工具优化

### 1.1 当前工具问题
- 单张生成，不适合批量
- 无风格统一控制
- 无质量检查机制
- 无版本管理

### 1.2 优化方向
1. **批量生成能力** - 支持宠物×等级矩阵生成
2. **风格统一控制** - 统一的Prompt模板和负面提示词
3. **质量检查** - 自动检查生成结果，失败重试
4. **版本管理** - 支持重新生成特定图片
5. **进度显示** - 实时显示生成进度

---

## 二、风格统一策略

### 2.1 核心原则
**"可爱、统一、有辨识度"**

### 2.2 风格定义

#### 整体风格
- **画风**：扁平化卡通风格（Flat Cartoon Style）
- **线条**：圆润柔和，无尖锐棱角
- **色彩**：明亮饱和，符合小学生审美
- **表情**：开心、友好、有亲和力
- **姿态**：正面站立或45度侧面，易于识别

#### 统一元素
| 元素 | 规范 |
|------|------|
| 眼睛 | 大而圆，高光明显 |
| 身体比例 | 头大身小，Q版比例 |
| 轮廓线 | 深色描边，粗细一致 |
| 阴影 | 简单投影，不复杂 |

---

## 三、等级差异化设计

### 3.1 等级视觉语言

| 等级 | 阶段 | 体型 | 特征 | 特效 |
|------|------|------|------|------|
| Lv.1 | 幼年期 | 最小 | 天真可爱 | 无 |
| Lv.2 | 成长期 | 稍大 | 开始发育 | 无 |
| Lv.3 | 少年期 | 中等 | 有活力 | 轻微光晕 |
| Lv.4 | 青年期 | 较大 | 逐渐成熟 | 光晕增强 |
| Lv.5 | 成熟期 | 大 | 完全发育 | 粒子特效 |
| Lv.6 | 精英期 | 很大 | 威风凛凛 | 光环+粒子 |
| Lv.7 | 王者期 | 巨大 | 霸气外露 | 强光环+粒子 |
| Lv.8 | 传说期 | 最大 | 神圣威严 | 金色光芒+粒子 |

### 3.2 等级描述词

```
Lv.1: "tiny baby, chibi style, innocent big eyes, soft pastel colors"
Lv.2: "young child, playful, energetic, bright colors"  
Lv.3: "teenager, confident, dynamic pose, vibrant"
Lv.4: "young adult, strong, determined, glowing aura"
Lv.5: "mature adult, powerful, majestic, particle effects"
Lv.6: "elite, heroic, commanding presence, golden halo"
Lv.7: "king/queen, legendary, awe-inspiring, intense glow"
Lv.8: "divine, mythical, god-like, radiant golden light"
```

---

## 四、背景设计方案

### 4.1 背景层级

**不是纯色！采用场景化背景**

| 等级 | 背景主题 | 元素 |
|------|---------|------|
| Lv.1-2 | 草地/花园 | 小花、小草、阳光 |
| Lv.3-4 | 森林/丛林 | 树木、蘑菇、小溪 |
| Lv.5-6 | 山脉/云端 | 山峰、云朵、彩虹 |
| Lv.7-8 | 天空/星空 | 星辰、极光、神殿 |

### 4.2 背景Prompt模板

```
Background: [scene] with [elements], soft lighting, dreamy atmosphere,
depth of field, blurred background, warm color palette
```

### 4.3 具体背景

```javascript
const BACKGROUNDS = {
  1: "peaceful meadow with small flowers, morning sunlight, soft green grass",
  2: "colorful garden with butterflies, bright sunny day",
  3: "enchanted forest with glowing mushrooms, dappled sunlight",
  4: "ancient forest with waterfall, magical atmosphere",
  5: "mountain peak above clouds, rainbow in distance",
  6: "floating islands in sky, golden sunset clouds",
  7: "celestial temple in clouds, aurora borealis",
  8: "cosmic realm with stars and nebula, divine golden light"
}
```

---

## 五、Prompt工程

### 5.1 基础Prompt模板

```
A cute {animal_name} in {level_stage}, {level_description}, 
{style_description}, {background},
{pose}, {expression}, {lighting},
high quality, detailed, 8k, masterpiece
```

### 5.2 负面Prompt（统一）

```
ugly, deformed, noisy, blurry, distorted, out of focus,
bad anatomy, extra limbs, poorly drawn face, poorly drawn hands,
realistic, scary, dark, violent, complex background, text, watermark
```

### 5.3 宠物特定描述

```javascript
const PET_DESCRIPTIONS = {
  cat: "fluffy fur, pink nose, whiskers, tail curled",
  dog: "floppy ears, wagging tail, tongue out, friendly",
  rabbit: "long ears, cotton tail, hopping pose, carrot nearby",
  // ... 其他宠物
}
```

---

## 六、生成工具设计

### 6.1 工具架构

```
generate_pets.py
├── config/
│   ├── pets.json      # 宠物定义
│   ├── levels.json    # 等级定义
│   └── prompts.json   # Prompt模板
├── output/            # 生成图片
│   ├── cat/
│   ├── dog/
│   └── ...
├── logs/              # 生成日志
└── temp/              # 临时文件
```

### 6.2 配置文件

**pets.json**
```json
{
  "pets": [
    {
      "id": "cat",
      "name": "小猫",
      "category": "normal",
      "base_prompt": "fluffy cat with pink nose",
      "colors": ["orange", "white", "gray"]
    }
  ]
}
```

**levels.json**
```json
{
  "levels": {
    "1": {
      "stage": "baby",
      "description": "tiny and adorable",
      "background": "meadow",
      "effects": "none"
    }
  }
}
```

### 6.3 命令行接口

```bash
# 生成所有宠物所有等级
python generate_pets.py --all

# 生成特定宠物
python generate_pets.py --pet cat

# 生成特定等级
python generate_pets.py --level 5

# 重新生成失败项
python generate_pets.py --retry-failed

# 预览Prompt（不生成）
python generate_pets.py --pet cat --level 3 --preview
```

### 6.4 核心功能

1. **智能重试**
   - 失败自动重试3次
   - 更换随机种子
   - 记录失败原因

2. **质量检查**
   - 检查图片尺寸
   - 检查文件大小
   - 可选：AI视觉检查

3. **断点续传**
   - 记录已生成项
   - 支持中断后继续

4. **并行生成**
   - 支持并发请求
   - 控制API速率

---

## 七、数据结构设计

### 7.1 前端数据结构

```typescript
// src/data/petImages.ts
export const PET_IMAGES: Record<string, Record<number, string>> = {
  cat: {
    1: '/pets/cat/lv1.png',
    2: '/pets/cat/lv2.png',
    // ...
  },
  dog: {
    1: '/pets/dog/lv1.png',
    // ...
  }
}

export function getPetImage(petType: string, level: number): string {
  return PET_IMAGES[petType]?.[level] || '/pets/default.png'
}
```

### 7.2 文件命名规范

```
public/pets/
├── {pet_id}/
│   ├── lv1.png
│   ├── lv2.png
│   ├── lv3.png
│   ├── lv4.png
│   ├── lv5.png
│   ├── lv6.png
│   ├── lv7.png
│   └── lv8.png
```

---

## 八、实施计划

### 阶段1：工具开发（1-2天）
- [ ] 优化 generate_pets.py 工具
- [ ] 编写配置文件
- [ ] 测试单张生成

### 阶段2：Prompt调优（2-3天）
- [ ] 为每种宠物测试Prompt
- [ ] 确定最佳参数
- [ ] 建立风格基准

### 阶段3：批量生成（3-5天）
- [ ] 分批生成（避免API限流）
- [ ] 人工审核质量
- [ ] 重新生成不合格项

### 阶段4：集成上线（1天）
- [ ] 更新前端代码
- [ ] 测试所有等级显示
- [ ] 部署上线

---

## 九、成本估算

| 项目 | 数量 | 单价 | 总价 |
|------|------|------|------|
| 宠物种类 | 25 | - | - |
| 等级 | 8 | - | - |
| 总图片 | 200 | ¥0.02 | ¥4 |
| 重试/测试 | 100 | ¥0.02 | ¥2 |
| **总计** | | | **约¥6** |

---

## 十、风险与应对

| 风险 | 应对 |
|------|------|
| 风格不一致 | 严格的Prompt模板 + 人工审核 |
| 生成失败 | 自动重试 + 备用Prompt |
| 成本超支 | 先测试10张，确定参数后再批量 |
| 小学生不喜欢 | 提前找小学生试看，收集反馈 |

---

## 十一、测试进展

### 2026-03-16 首次测试

**测试宠物**: cat (小猫)
**测试等级**: Lv.1, Lv.2, Lv.4, Lv.8
**生成数量**: 4张

**效果评估**:
- ✅ 整体风格统一，符合卡通可爱风格
- ✅ Lv.1 幼年期效果良好，小巧可爱
- ✅ Lv.8 传说期有神圣感，背景星空效果
- ⚠️ 体型变化不够明显，需要加强描述
- ⚠️ 背景差异化需要更明显

**Prompt调优方向**:
1. 增加体型描述词：tiny/small/medium/large/huge/massive
2. 强调身体比例变化：chibi比例 vs 正常比例
3. 背景增加更多特征元素

**下一步**:
- 优化Prompt模板
- 生成dog测试跨宠物一致性
- 确定最终参数后批量生成
## 十一、测试进展

### 2026-03-16 第二次测试（Prompt优化后）

**优化内容**:
- 添加详细的体型描述（head-to-body ratio从1:1到1:4.5）
- 强化每个等级的特征描述
- 增加表情变化描述
- 优化负面提示词

**Prompt对比**:

**Lv.1（幼年期）**:
```
tiny body, smallest size, chibi proportions 1:1 head-to-body ratio,
round baby face, oversized head, tiny limbs, fluffy baby fur,
innocent curious eyes, small smile
```

**Lv.8（传说期）**:
```
massive body, divine proportions, 1:4.5 head-to-body ratio, largest size,
god-like majestic build, ultimate form, divine radiance, floating above ground,
divine all-knowing eyes, transcendent presence, benevolent smile
```

**新生成的图片**:
- `public/pets/cat/lv1.png` - 优化后的幼年期
- `public/pets/cat/lv8.png` - 优化后的传说期

**待确认**:
- 查看bridge预览页面中的对比效果
- 确认形态变化是否明显
- 决定是否继续生成其他等级

## 十二、工作流程与检查项

### 完整工作流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1.准备阶段  │ -> │  2.生成阶段  │ -> │  3.检查阶段  │ -> │  4.审核阶段  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       v                  v                  v                  v
  ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐
  │Prompt检查│       │批量生成 │       │自动检查 │       │人工审核 │
  │环境检查 │       │进度监控 │       │问题标记 │       │确认入库 │
  └─────────┘       └─────────┘       └─────────┘       └─────────┘
```

### 检查项清单

#### 阶段1：生成前检查（自动化）

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| ✅ Prompt完整性 | 脚本验证 | 所有占位符已填充 |
| ✅ API Key有效 | 调用测试接口 | 返回200状态码 |
| ✅ 输出目录可写 | 权限检查 | 有写入权限 |
| ✅ 磁盘空间充足 | df命令 | 剩余空间 > 1GB |
| ✅ 网络连接正常 | ping测试 | 能访问硅基流动API |

#### 阶段2：生成中检查（自动化）

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| ✅ API返回成功 | 检查response | 包含images字段 |
| ✅ 图片下载成功 | HTTP 200 | 文件存在且非空 |
| ✅ 图片尺寸正确 | PIL读取 | 512x512像素 |
| ✅ 文件大小合理 | os.stat | 100KB ~ 2MB |
| ✅ 格式正确 | 文件头检查 | PNG格式 |

#### 阶段3：生成后自动检查（自动化）

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| ✅ 图片可正常打开 | PIL加载 | 无异常抛出 |
| ✅ 非纯色/空白图 | 像素方差检查 | 方差 > 阈值 |
| ✅ 包含宠物主体 | 视觉检查（可选AI） | 主体占比 > 30% |
| ✅ 风格一致性 | 对比基准图 | 色调/风格相似 |
| ✅ 等级差异化 | 文件名检查 | 8个等级文件都存在 |

#### 阶段4：人工审核检查（人工）

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| ✅ 可爱度达标 | 人工判断 | 符合小学生审美 |
| ✅ 风格统一 | 人工对比 | 8张图风格一致 |
| ✅ 装饰可见 | 人工查看 | 装饰元素清晰可辨 |
| ✅ 背景合适 | 人工判断 | 背景不喧宾夺主 |
| ✅ 无明显瑕疵 | 人工查看 | 无变形/模糊/错误 |
| ✅ 等级区分明显 | 人工对比 | 能区分不同等级 |

#### 阶段5：集成检查（自动化）

| 检查项 | 方法 | 通过标准 |
|--------|------|---------|
| ✅ 前端能正常显示 | 浏览器查看 | 图片加载成功 |
| ✅ 缓存已刷新 | 查看响应头 | 有新时间戳 |
| ✅ 路径配置正确 | API测试 | /api/images/返回正确 |
| ✅ 所有等级可访问 | 遍历测试 | 8个URL都200 |

### 检查工具脚本

```bash
# 自动生成后检查
python scripts/check_images.py --pet cat

# 检查项：
# - 文件存在性
# - 尺寸正确性
# - 文件大小合理性
# - 图片可读性
# - 生成报告
```

### 问题处理流程

```
生成失败/检查不通过
       │
       ├─> 自动重试（最多3次）
       │
       ├─> 记录到失败列表
       │
       ├─> 人工查看失败原因
       │
       └─> 决定是否：
           ├─> 调整Prompt重新生成
           ├─> 更换种子重试
           └─> 标记为需人工绘制
```

### 质量分级

| 等级 | 描述 | 处理方式 |
|------|------|---------|
| 🟢 优秀 | 完美符合要求 | 直接入库 |
| 🟡 可用 | 有小瑕疵但可接受 | 入库，记录优化点 |
| 🔴 不合格 | 明显问题 | 重新生成或人工绘制 |

### 审核通过标准

**必须全部满足：**
1. 8个等级图片全部生成成功
2. 自动检查100%通过
3. 人工审核无🔴不合格项
4. 风格统一性认可
5. 可爱度达标

**可接受：**
- 个别图片有轻微瑕疵（🟡），但整体风格统一
- 背景细节略有差异，不影响主体

**必须重做：**
- 有明显变形或错误
- 风格与其他图片不一致
- 装饰元素不可见
- 不可爱或 scary

## 十三、完整自动化流程

### 自动化规则

**核心原则：AI审核不通过 → 自动重新生成 → 再次审核，循环直到全部达标**

```
┌─────────────────────────────────────────────────────────────┐
│                    自动化生成流程                            │
├─────────────────────────────────────────────────────────────┤
│  开始                                                        │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────┐                                            │
│  │ 批量生成8张  │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐     ┌─────────────┐                       │
│  │ 自动基础检查 │ --> │ 严格AI审核   │                       │
│  │ (尺寸/格式)  │     │ (装饰/风格)  │                       │
│  └──────┬──────┘     └──────┬──────┘                       │
│         │                   │                               │
│         │         ┌─────────┴─────────┐                     │
│         │         │                   │                     │
│         │    ┌────┴────┐         ┌───┴────┐                │
│         │    │ 通过    │         │ 不通过  │                │
│         │    │ (标记✅)│         │ (标记❌)│                │
│         │    └────┬────┘         └───┬────┘                │
│         │         │                   │                     │
│         │         │                   ▼                     │
│         │         │            ┌─────────────┐              │
│         │         │            │ 自动重新生成 │              │
│         │         │            │ (优化Prompt) │              │
│         │         │            └──────┬──────┘              │
│         │         │                   │                     │
│         │         └───────────────────┘                     │
│         │                          │                        │
│         │                          ▼                        │
│         │                   ┌─────────────┐                 │
│         │                   │ 再次AI审核   │                 │
│         │                   │ (最多重试3次)│                 │
│         │                   └──────┬──────┘                 │
│         │                          │                        │
│         └──────────────────────────┘                        │
│                                    │                        │
│    ┌───────────────────────────────┘                        │
│    │                                                         │
│    ▼                                                         │
│  是否全部通过？                                               │
│    │                                                         │
│    ├─ 是 ─> 生成完成，进入人工最终审核                        │
│    │                                                         │
│    └─ 否 ─> 记录失败项，人工介入处理                          │
└─────────────────────────────────────────────────────────────┘
```

### 自动化脚本使用

```bash
# 一键自动化生成（包含审核和自动重生成）
python scripts/auto_generate.py --pet cat --all

# 流程：
# 1. 生成8张图片
# 2. 自动基础检查
# 3. 严格AI审核
# 4. 不通过的自动重生成（最多3次）
# 5. 生成最终报告
```

### 重生成策略

**Prompt优化规则：**

| 失败原因 | 优化策略 |
|---------|---------|
| 装饰不可见 | 添加 "prominently displayed", "clearly visible" |
| 元素缺失 | 添加 "must have", "essential element" |
| 位置错误 | 明确位置 "on the head", "around the neck" |
| 不够华丽 | 添加 " ornate", "intricate details", "shiny" |

**重生成次数限制：**
- 单张最多重试3次
- 超过3次仍失败，标记为需人工处理
- 记录每次失败原因和优化策略

### 质量阈值

**通过标准（必须全部满足）：**
- ✅ 基础检查：尺寸512x512，格式PNG，可读
- ✅ 装饰可见性：一眼可见，不模糊
- ✅ 装饰完整性：所有必需元素都存在
- ✅ 位置正确：在正确的身体部位
- ✅ 等级区分：比低等级明显更华丽

**失败处理：**
- 1-2项轻微问题：自动重生成
- 3项以上问题或重试3次失败：人工介入

### 日志记录

每次自动化流程生成完整日志：
```
logs/
├── generate_2026-03-16_174030.log    # 生成日志
├── audit_2026-03-16_174130.json      # 审核结果
├── retry_2026-03-16_174230.log       # 重生成记录
└── final_report_2026-03-16_174330.md # 最终报告
```

### 人工介入条件

以下情况需要人工处理：
1. 单张图片重试3次仍失败
2. 同一宠物超过3张图片失败
3. AI审核无法确定（模糊情况）
4. 风格严重不一致

