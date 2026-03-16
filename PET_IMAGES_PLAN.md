# 宠物等级图片生成操作指南

> 目标：为班级宠物园系统中的所有宠物生成8个等级的图片
> 技术：SiliconFlow FLUX.1-dev
> 核心：每种宠物独立设计装饰，严格统一画风

---

## 一、设计理念

### 核心原则
- **一宠一设计**：每种宠物独立设计装饰，符合宠物特性
- **严格画风统一**：所有图片使用完全相同的风格描述词
- **装饰升级体现成长**：从简单到华丽，体现等级提升

### 画风规范（严格统一，不可更改）
```
STYLE = "flat cartoon illustration, kawaii chibi style, consistent character design,
cute friendly expression, big round sparkling eyes with white highlights,
soft rounded shapes, smooth clean outlines, no sharp edges,
bright saturated warm colors, soft shading, 2D vector art style,
children book illustration style, standing pose, front facing,
white background, masterpiece, best quality"

NEGATIVE = "3D, realistic, photograph, scary, dark, complex background,
busy background, text, watermark, signature, blurry, low quality,
different style, inconsistent design"
```

**关键：**
- 使用 `flat cartoon illustration` 确保扁平风格
- 使用 `consistent character design` 确保一致性
- 使用 `white background` 或简单背景，避免背景干扰
- 使用 `2D vector art style` 确保矢量感

---

## 二、当前系统宠物清单

### 普通动物

| ID | 名称 | 装饰设计状态 |
|----|------|-------------|
| cat | 🐱 小猫 | ✅ 已完成 |
| dog | 🐶 小狗 | ⏳ 待设计 |
| rabbit | 🐰 兔子 | ⏳ 待设计 |
| hamster | 🐹 仓鼠 | ⏳ 待设计 |
| bird | 🐦 小鸟 | ⏳ 待设计 |
| fish | 🐠 小鱼 | ⏳ 待设计 |
| turtle | 🐢 小龟 | ⏳ 待设计 |
| frog | 🐸 青蛙 | ⏳ 待设计 |
| duck | 🦆 小鸭 | ⏳ 待设计 |
| penguin | 🐧 企鹅 | ⏳ 待设计 |
| bear | 🐻 小熊 | ⏳ 待设计 |
| fox | 🦊 狐狸 | ⏳ 待设计 |
| deer | 🦌 小鹿 | ⏳ 待设计 |
| squirrel | 🐿️ 松鼠 | ⏳ 待设计 |
| panda | 🐼 熊猫 | ⏳ 待设计 |
| koala | 🐨 考拉 | ⏳ 待设计 |
| hedgehog | 🦔 刺猬 | ⏳ 待设计 |
| owl | 🦉 猫头鹰 | ⏳ 待设计 |

### 神兽

| ID | 名称 | 装饰设计状态 |
|----|------|-------------|
| dragon | 🐲 小龙 | ⏳ 待设计 |
| phoenix | 🔥 凤凰 | ⏳ 待设计 |
| unicorn | 🦄 独角兽 | ⏳ 待设计 |
| kirin | 🦌 麒麟 | ⏳ 待设计 |
| pegasus | 🐴 飞马 | ⏳ 待设计 |
| nine_tailed_fox | 🦊 九尾狐 | ⏳ 待设计 |
| qilin | 🐉 青龙 | ⏳ 待设计 |

---

## 三、宠物装饰设计

### 设计原则
1. **符合宠物特性**：猫用猫相关装饰，狗用狗相关装饰
2. **等级递进清晰**：Lv.1简单 → Lv.8华丽神圣
3. **装饰可见性**：一眼可见，不模糊
4. **风格统一性**：所有宠物使用相同画风描述

### 设计模板

每种宠物需要设计8个等级的装饰：

| 等级 | 主题 | 设计要点 |
|------|------|---------|
| Lv.1 | 婴儿期 | 最简单的小装饰，突出可爱 |
| Lv.2 | 幼年期 | 添加宠物喜欢的元素 |
| Lv.3 | 成长期 | 开始添加身份标识 |
| Lv.4 | 少年期 | 华丽版宠物元素 |
| Lv.5 | 青年期 | 小皇冠+宠物印记 |
| Lv.6 | 成熟期 | 皇冠+翅膀，天使形象 |
| Lv.7 | 王者期 | 大翅膀+光环，强大气场 |
| Lv.8 | 传说期 | 完全神圣化+漂浮+符号环绕 |

### 示例：小猫装饰设计

| 等级 | 装饰 | 具体元素 | 设计理念 |
|------|------|---------|---------|
| Lv.1 | 粉色小蝴蝶结 | 蝴蝶结 | 最简装饰，突出可爱 |
| Lv.2 | 铃铛项圈+毛线球 | 铃铛、毛线 | 猫喜欢玩毛线 |
| Lv.3 | 星星猫耳发饰 | 星星、猫耳 | 猫耳元素+星星 |
| Lv.4 | 小鱼骨项链 | 鱼骨、项链 | 猫爱吃鱼 |
| Lv.5 | 小皇冠+猫爪印记 | 皇冠、爪印 | 王者气质 |
| Lv.6 | 皇冠+猫耳+小翅膀 | 皇冠、翅膀 | 猫耳天使 |
| Lv.7 | 大翅膀+猫爪光环 | 翅膀、光环 | 强大气场 |
| Lv.8 | 神圣皇冠+大翅膀+漂浮+猫爪符号 | 皇冠、翅膀、符号 | 完全神圣化 |

### 待设计宠物

请按顺序设计以下宠物的装饰：
1. dog - 小狗
2. rabbit - 兔子
3. hamster - 仓鼠
4. bird - 小鸟
5. ...（继续其他宠物）

---

## 四、Prompt模板（严格统一）

### 基础结构
```
A cute [宠物主体描述], [等级装饰描述],
[严格统一风格词],
[背景描述],
masterpiece, best quality, 8k
```

### 风格词（所有宠物完全相同）
```
flat cartoon illustration, kawaii chibi style, consistent character design,
cute friendly expression, big round sparkling eyes with white highlights,
soft rounded shapes, smooth clean outlines, no sharp edges,
bright saturated warm colors, soft shading, 2D vector art style,
children book illustration style, standing pose, front facing
```

### 负面词（所有宠物完全相同）
```
3D, realistic, photograph, scary, dark, complex background,
busy background, text, watermark, signature, blurry, low quality,
different style, inconsistent design, ugly, deformed
```

### 背景词（根据等级）
| 等级 | 背景 |
|------|------|
| Lv.1-2 | simple soft gradient background, pastel colors |
| Lv.3-4 | soft nature background with bokeh effect |
| Lv.5-6 | golden light rays, soft glow background |
| Lv.7-8 | divine golden light, ethereal glow, cosmic stars |

### 完整Prompt示例
```
A cute fluffy orange and white cat with big round eyes and pink nose,
wearing small golden crown with cat paw prints on head,
flat cartoon illustration, kawaii chibi style, consistent character design,
cute friendly expression, big round sparkling eyes with white highlights,
soft rounded shapes, smooth clean outlines, no sharp edges,
bright saturated warm colors, soft shading, 2D vector art style,
children book illustration style, standing pose, front facing,
golden light rays background, soft glow,
masterpiece, best quality, 8k
```

---

## 五、操作流程

### 1. 设计宠物装饰
- 为宠物设计8个等级的装饰
- 记录在 `scripts/pet_designs/{pet_id}.json`

### 2. 生成图片
```bash
python scripts/generate_pets.py --pet [宠物名] --all
```

### 3. 画风检查
- 对比已生成的图片
- 确认风格统一
- 不统一则调整Prompt重新生成

### 4. 装饰审核
- 检查装饰是否清晰可见
- 检查是否符合设计要求
- 不通过则重新生成

### 5. 完成确认
8张图风格统一、装饰清晰后，标记完成

---

## 六、质量把控

### 画风统一策略
1. **使用完全相同的风格词**（复制粘贴，不改动）
2. **先生成Lv.1和Lv.8作为基准**
3. **中间等级与基准对比**，确保一致
4. **发现问题立即调整**，不累积

### 常见问题处理
| 问题 | 原因 | 解决 |
|------|------|------|
| 画风不一致 | 风格词被修改 | 复制粘贴统一风格词 |
| 太写实 | 缺少风格词 | 添加`flat cartoon illustration` |
| 背景太复杂 | 背景描述过多 | 简化背景，使用`simple background` |
| 眼睛不够大 | 缺少眼睛描述 | 添加`big round sparkling eyes` |

---

## 七、文件结构

```
scripts/
├── generate_pets.py       # 生成工具
├── strict_audit.py        # 严格审核
├── auto_regenerate.py     # 自动重生成
├── pet_designs/           # 宠物装饰设计
│   ├── cat.json
│   ├── dog.json
│   └── ...
└── ...

public/pets/
├── cat/
│   ├── lv1.png
│   └── ...
├── dog/
│   └── ...
└── ...
```

---

## 八、成本估算

| 项目 | 数量 | 单价 | 总价 |
|------|------|------|------|
| 宠物数量 | 按系统实际数量 | - | - |
| 等级 | 8 | - | - |
| 单张成本 | - | ¥0.03 | - |
| 总计 | 宠物数 × 8 | ¥0.03 | 约¥0.24/宠物 |

---

**关键：严格使用统一的风格词，确保所有宠物画风一致！**
