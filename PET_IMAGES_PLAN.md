# 宠物等级图片生成操作指南

> 目标：为25种宠物 × 8个等级生成统一风格的图片
> 技术：SiliconFlow FLUX.1-dev
> 成本：约¥0.03/张

---

## 一、设计理念

### 核心原则
- **装饰变化替代体型变化**：AI难以精确控制体型，用装饰升级体现等级
- **风格严格统一**：所有宠物、所有等级保持相同画风
- **可爱优先**：符合小学生审美，色彩明亮、表情友好

### 视觉规范
| 元素 | 规范 |
|------|------|
| 画风 | 扁平卡通、Kawaii、Chibi比例 |
| 线条 | 圆润柔和，深色描边 |
| 色彩 | 明亮饱和，暖色调为主 |
| 表情 | 开心、友好、大眼睛高光 |
| 姿态 | 正面站立，45度侧面 |

---

## 二、等级装饰设计

### 通用装饰模板（适用于所有宠物）

| 等级 | 装饰名称 | 必需元素 | 特效 | 背景 |
|------|---------|---------|------|------|
| Lv.1 | 粉色丝带 | 蝴蝶结、小装饰 | 柔和色彩 | 草地花丛 |
| Lv.2 | 铃铛项圈 | 金色铃铛、项圈 | 微光 | 花园蝴蝶 |
| Lv.3 | 星星项圈 | 星形吊坠、闪亮 | 魔法光晕 | 魔法森林 |
| Lv.4 | 宝石项链 | 宝石、金色链条 | 金色 aura | 古森林瀑布 |
| Lv.5 | 小皇冠 | 小皇冠、珠宝 | 粒子效果 | 云端山峰 |
| Lv.6 | 皇冠+翅膀 | 皇冠+小翅膀+halo | 金色光环 | 天空浮岛 |
| Lv.7 | 华丽皇冠+大翅膀 | 华丽皇冠+大翅膀 | 强烈光芒 | 云中神殿 |
| Lv.8 | 神圣皇冠+天使翅膀 | 皇冠+大翅膀+漂浮+神圣符号 | 金色光束+符号环绕 | 星空神殿 |

### 宠物特定装饰（可选差异化）

| 宠物类型 | Lv.1-4差异化 | Lv.5-8差异化 |
|---------|-------------|-------------|
| 猫科 | 铃铛、毛线球 | 猫耳皇冠、猫爪符号 |
| 犬科 | 骨头项圈、球 | 狗耳皇冠、忠诚符号 |
| 鸟类 | 羽毛装饰 | 羽冠、飞翔光环 |
| 水生 | 贝壳、珊瑚 | 三叉戟、波浪光环 |
| 神兽 | 宝石、符文 | 神冠、元素光环 |

---

## 三、Prompt模板

### 基础模板
```
A cute [宠物描述], wearing [等级装饰], [特效],
flat cartoon style, kawaii, chibi proportions, cute and friendly,
big round eyes with highlights, soft rounded shapes, smooth outlines,
vibrant colors, masterpiece, standing pose, front view, happy expression,
[背景], 8k, highly detailed
```

### 负面Prompt（统一）
```
ugly, deformed, noisy, blurry, realistic, scary, dark, violent,
text, watermark, bad anatomy, extra limbs, poorly drawn
```

### 强调词（用于重生成）
- 装饰不可见 → `prominently displayed`, `clearly visible`
- 元素缺失 → `must have`, `essential element`
- 位置错误 → `on the head`, `around the neck`
- 不够华丽 → `ornate`, `intricate details`, `shiny`

---

## 四、操作流程

### 一键生成
```bash
cd /root/.openclaw/workspace/projects/class-pet-garden

# 生成单个宠物所有等级
python scripts/generate_pets.py --pet cat --all

# 自动生成 + 自动审核 + 自动重生成（直到达标）
python scripts/auto_pipeline.py --pet cat --all
```

### 分步操作
```bash
# 1. 生成
python scripts/generate_pets.py --pet cat --level 5

# 2. 基础检查
python scripts/check_images.py --pet cat

# 3. 严格审核
python scripts/strict_audit.py --pet cat

# 4. 自动重生成（如有失败）
python scripts/auto_regenerate.py --pet cat

# 5. 再次审核（循环直到全部通过）
```

---

## 五、质量检查

### 自动检查项
- [x] 文件存在（8张）
- [x] 尺寸正确（512×512）
- [x] 格式正确（PNG）
- [x] 文件大小合理（100KB-2MB）
- [x] 图片可读（无损坏）

### AI严格审核项
- [x] 装饰可见性（一眼可见）
- [x] 装饰完整性（所有必需元素）
- [x] 位置正确性（正确部位）
- [x] 等级区分度（比低等级华丽）

### 人工最终审核
- [x] 可爱度达标
- [x] 风格统一
- [x] 无变形/错误

---

## 六、重生成策略

### 自动重生成规则
- AI审核不通过 → 自动重生成（无需确认）
- 单张最多重试3次
- Prompt自动优化（添加强调词）
- 超过3次仍失败 → 标记人工处理

### Prompt优化示例
**原始**：`wearing small crown`
**优化**：`wearing prominently displayed small golden crown on head with clearly visible jewels`

---

## 七、宠物清单

### 普通动物（18种）
| 宠物 | 基础描述 | 特色装饰 |
|------|---------|---------|
| cat | cute fluffy cat, big eyes, pink nose | 猫耳、毛线球 |
| dog | cute friendly dog, floppy ears | 骨头、球 |
| rabbit | cute rabbit, long ears, cotton tail | 胡萝卜、蝴蝶结 |
| hamster | cute hamster, round body | 瓜子、轮子 |
| bird | cute bird, colorful feathers | 音符、羽毛 |
| ... | ... | ... |

### 神兽（7种）
| 宠物 | 基础描述 | 特色装饰 |
|------|---------|---------|
| dragon | cute baby dragon, wings | 火焰、宝石 |
| phoenix | cute phoenix, fiery feathers | 火焰光环 |
| unicorn | cute unicorn, horn, rainbow mane | 彩虹、星星 |
| ... | ... | ... |

---

## 八、文件结构

```
public/pets/
├── cat/
│   ├── lv1.png
│   ├── lv2.png
│   ├── ...
│   └── lv8.png
├── dog/
│   ├── lv1.png
│   └── ...
└── ...

scripts/
├── generate_pets.py      # 基础生成
├── check_images.py       # 基础检查
├── strict_audit.py       # AI严格审核
├── auto_regenerate.py    # 自动重生成
└── auto_pipeline.py      # 一键自动化
```

---

## 九、成本估算

| 项目 | 数量 | 单价 | 总价 |
|------|------|------|------|
| 宠物种类 | 25 | - | - |
| 等级 | 8 | - | - |
| 总图片 | 200 | ¥0.03 | ¥6 |
| 重试/测试 | 50 | ¥0.03 | ¥1.5 |
| **总计** | | | **约¥7.5** |

---

## 十、常见问题

**Q: 装饰不清晰怎么办？**
A: 自动重生成会添加 `prominently displayed`, `clearly visible` 等强调词

**Q: 风格不一致怎么办？**
A: 统一使用 STYLE_TEMPLATE，确保所有Prompt包含相同风格描述

**Q: 某张图重试3次仍失败？**
A: 标记为人工处理，可能需要调整装饰设计或改用其他方案

**Q: 如何确保背景不喧宾夺主？**
A: 背景描述放在Prompt末尾，使用 `blurred background` 等词

---

## 十一、快速开始

```bash
# 1. 进入项目
cd /root/.openclaw/workspace/projects/class-pet-garden

# 2. 生成测试（cat）
python scripts/generate_pets.py --pet cat --all

# 3. 自动审核+重生成
python scripts/auto_regenerate.py

# 4. 查看结果
ls -la public/pets/cat/

# 5. 在bridge中预览
# 访问 http://localhost:5000 -> 图片 -> pet-garden-pets
```

---

**下一步：确认cat的8张图片后，开始生成dog或其他宠物**
