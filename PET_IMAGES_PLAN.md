# 宠物等级图片生成操作指南

> 目标：为班级宠物园系统中的所有宠物品种生成8个等级的图片
> 技术：SiliconFlow FLUX.1-dev
> 核心：每个品种独立设计装饰，严格统一画风

---

## 一、设计理念

### 核心原则
- **一品种一设计**：每个犬种/猫种独立设计装饰，符合品种特性
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

---

## 二、系统宠物品种清单

### 普通动物（18种）

| ID | 名称 | 品种特征 | 状态 |
|----|------|---------|------|
| west-highland | 西高地 | 白色梗犬，立耳 | ⏳ 待生成 |
| bichon | 比熊 | 白色卷毛，圆脸 | ✅ 已生成 |
| border-collie | 边牧 | 黑白/三色，聪明 | ⏳ 待生成 |
| shiba | 柴犬 | 日本柴犬，卷尾 | ⏳ 待生成 |
| golden-retriever | 金毛 | 金色长毛，温顺 | ⏳ 待生成 |
| samoyed | 萨摩耶 | 白色长毛，微笑 | ⏳ 待生成 |
| husky | 哈士奇 | 蓝眼，狼-like | ⏳ 待生成 |
| tabby-cat | 虎斑猫 | 条纹毛发，灵动 | ⏳ 待生成 |
| persian-cat | 波斯猫 | 扁脸，长毛 | ⏳ 待生成 |
| ragdoll-cat | 布偶猫 | 蓝眼，长毛，温顺 | ⏳ 待生成 |
| orange-cat | 橘猫 | 橘色毛发，圆润 | ⏳ 待生成 |
| lop-rabbit | 垂耳兔 | 下垂长耳，可爱 | ⏳ 待生成 |
| angora-rabbit | 安哥拉兔 | 长毛，蓬松 | ⏳ 待生成 |
| hamster | 仓鼠 | 圆滚滚，小体型 | ⏳ 待生成 |
| winter-hamster | 银狐仓鼠 | 银白毛发 | ⏳ 待生成 |
| call-duck | 柯尔鸭 | 圆润，黄白羽毛 | ⏳ 待生成 |
| alpaca | 羊驼 | 长颈，卷毛，呆萌 | ⏳ 待生成 |
| red-panda | 小熊猫 | 红棕毛，大尾巴 | ⏳ 待生成 |

### 神兽（7种）

| ID | 名称 | 特征 | 状态 |
|----|------|------|------|
| white-tiger | 白虎 | 白色虎纹，威严 | ⏳ 待生成 |
| unicorn | 独角兽 | 独角，马身，纯洁 | ⏳ 待生成 |
| pixiu | 貔貅 | 中国神兽，招财 | ⏳ 待生成 |
| azure-dragon | 青龙 | 东方龙形，青色 | ⏳ 待生成 |
| vermilion-bird | 朱雀 | 火鸟，红色羽毛 | ⏳ 待生成 |
| suanni | 狻猊 | 龙子，狮形，香炉 | ⏳ 待生成 |
| succulent-spirit | 多肉精灵 | 植物精灵，可爱 | ⏳ 待生成 |

---

## 三、工作流程（重要！）

### 第一步：设计装饰方案

为每个品种创建设计文件：`scripts/pet_designs/{pet_id}.json`

```json
{
  "id": "bichon",
  "name": "比熊",
  "description": "白色卷毛，圆脸，看起来像棉花糖",
  "features": "round fluffy white fur, cotton-ball like appearance, black eyes",
  "theme": "云朵/棉花糖/天使",
  "levels": [
    {
      "level": 1,
      "name": "棉花糖宝宝",
      "accessories": "粉色小蝴蝶结",
      "elements": "small pink bow on head",
      "background": "soft white gradient",
      "description": "简单可爱的入门装饰"
    },
    ...
  ]
}
```

### 第二步：生成图片

**手动生成，逐个等级生成，确保质量：**

```bash
# 生成单个等级（推荐方式）
python3 -c "
import requests, json, time
from pathlib import Path

# 配置
PET_ID = 'bichon'
LEVEL = 1
MODEL = 'black-forest-labs/FLUX.1-dev'
STYLE = 'flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing'
NEGATIVE = '3D, realistic, photograph, scary, dark, complex background, busy background, text, watermark, signature, blurry, low quality'

# 加载设计
with open(f'scripts/pet_designs/{PET_ID}.json') as f:
    design = json.load(f)

level_config = next(l for l in design['levels'] if l['level'] == LEVEL)
prompt = f\"A cute {design['name']} with {design['features']}, wearing {level_config['accessories']}, {level_config['elements']}, {STYLE}, {level_config['background']}, masterpiece, best quality, 8k\"

print(f'Prompt: {prompt}')
print(f'\n请复制以上prompt到SiliconFlow生成图片')
"
```

### 第三步：严格审核（关键！）

**审核标准（必须全部通过）：**

| 审核项 | 通过标准 | 不通过处理 |
|--------|---------|-----------|
| **画风一致性** | 与其他已生成宠物画风一致，扁平卡通、Q版、大眼睛、白背景 | 重新生成，检查STYLE词是否完全一致 |
| **品种特征** | 能一眼认出是什么品种（比熊=白色卷毛、柴犬=日本狗特征） | 增加品种特征描述词重新生成 |
| **装饰正确性** | 装饰物清晰可见，与设计文档一致 | 强调装饰词（prominently displayed）重新生成 |
| **美观度** | 可爱、精致、符合儿童审美 | 调整描述词重新生成 |
| **等级递进** | 从Lv.1到Lv.8装饰明显升级 | 调整装饰描述重新生成 |

**审核流程：**
1. 查看生成的图片
2. 对照审核表逐项检查
3. 有任何一项不通过 → 标记该等级需重新生成
4. 重新生成后再次审核
5. 重复直到全部8张通过

### 第四步：保存图片

通过审核后保存到：`public/pets/{pet_id}/lv{level}.png`

---

## 四、Prompt模板（严格统一）

### 基础结构
```
A cute [品种名称] with [品种特征], wearing [等级装饰], [装饰元素], [严格统一风格词], [背景], masterpiece, best quality, 8k
```

### 风格词（所有品种完全相同，复制粘贴）
```
flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing
```

### 负面词（所有品种完全相同）
```
3D, realistic, photograph, scary, dark, complex background, busy background, text, watermark, signature, blurry, low quality, different style, inconsistent design
```

### 完整Prompt示例（比熊 Lv.5）
```
A cute 比熊 with round fluffy white fur, cotton-ball like appearance, black eyes, small black nose, wearing 天使光环+中等翅膀+云朵披风, golden halo, medium white wings, cloud-patterned cape, flat cartoon illustration, kawaii chibi style, consistent character design, cute friendly expression, big round sparkling eyes with white highlights, soft rounded shapes, smooth clean outlines, no sharp edges, bright saturated warm colors, soft shading, 2D vector art style, children book illustration style, standing pose, front facing, heavenly clouds with golden light, masterpiece, best quality, 8k
```

---

## 五、品种装饰设计参考

### 设计原则
1. **符合品种特性**：柯基用皇室元素（英国女王），柴犬用日本元素
2. **等级递进清晰**：Lv.1简单 → Lv.8华丽神圣
3. **装饰可见性**：一眼可见，不模糊
4. **风格统一性**：所有品种使用相同画风描述

### 示例：比熊装饰设计（已完成）

| 等级 | 名称 | 装饰 | 元素 |
|------|------|------|------|
| Lv.1 | 棉花糖宝宝 | 粉色小蝴蝶结 | small pink bow on head |
| Lv.2 | 云朵精灵 | 云朵项圈+小铃铛 | cloud-shaped collar with tiny bell |
| Lv.3 | 天使学徒 | 小光环+迷你翅膀 | small golden halo, tiny white wings |
| Lv.4 | 云朵贵族 | 云朵皇冠+珍珠项链 | crown made of fluffy clouds, pearl necklace |
| Lv.5 | 小天使 | 天使光环+翅膀+云朵披风 | golden halo, medium white wings, cloud-patterned cape |
| Lv.6 | 云朵守护者 | 大翅膀+魔法云朵法杖 | large fluffy wings, staff with cloud orb |
| Lv.7 | 棉花糖天使长 | 华丽光环+巨大翅膀+云朵王座 | ornate golden halo, huge cloud-like wings, floating cloud throne |
| Lv.8 | 棉花糖之神 | 神圣皇冠+超大翅膀+漂浮+光芒 | divine crown, massive angelic wings, floating pose, cloud symbols glowing, radiant light |

### 待设计品种优先级

1. **golden-retriever** - 金毛（温顺，适合温暖/阳光装饰）
2. **shiba** - 柴犬（日本元素：樱花、武士、天狗）
3. **husky** - 哈士奇（蓝眼，狼-like，冰雪主题）
4. **ragdoll-cat** - 布偶猫（蓝眼，长毛，优雅主题）
5. **samoyed** - 萨摩耶（微笑天使，白色主题）
6. **west-highland** - 西高地（白色梗犬，可爱主题）
7. **border-collie** - 边牧（聪明工作犬，智慧主题）
8. ...（继续其他品种）

---

## 六、质量把控

### 画风统一策略
1. **使用完全相同的风格词**（复制粘贴，不改动）
2. **先生成Lv.1和Lv.8作为基准**
3. **中间等级与基准对比**，确保一致
4. **发现问题立即调整**，不累积

### 常见问题处理

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 画风不一致 | 风格词被修改 | 复制粘贴统一风格词 |
| 太写实 | 缺少风格词 | 添加`flat cartoon illustration` |
| 品种特征不明显 | 描述不足 | 添加品种特征词 |
| 装饰不清晰 | 描述不够强调 | 添加`prominently displayed, clearly visible` |
| 背景太复杂 | 背景描述问题 | 使用`white background`或`simple background` |
| 不够可爱 | 表情问题 | 强调`cute friendly expression, big round sparkling eyes` |

---

## 七、文件结构

```
projects/class-pet-garden/
├── scripts/
│   └── pet_designs/           # 品种装饰设计
│       ├── bichon.json        # 比熊设计 ✅
│       ├── golden-retriever.json
│       ├── shiba.json
│       └── ...
├── public/
│   └── pets/
│       ├── bichon/            # 比熊图片 ✅
│       │   ├── lv1.png
│       │   ├── lv2.png
│       │   ├── lv3.png
│       │   ├── lv4.png
│       │   ├── lv5.png
│       │   ├── lv6.png
│       │   ├── lv7.png
│       │   └── lv8.png
│       ├── golden-retriever/  # 待生成
│       └── ...
└── PET_IMAGES_PLAN.md         # 本文档
```

---

## 八、成本估算

| 项目 | 数量 | 单价 | 总价 |
|------|------|------|------|
| 品种数量 | 25 | - | - |
| 等级 | 8 | - | - |
| 单张成本 | - | ¥0.03 | - |
| 总计 | 25 × 8 = 200 | ¥0.03 | 约¥6 |

---

## 九、严格审核标准（重要！必须一张一张审核！）

### 审核原则
- **必须一张一张审核，不允许抽检！**
- **必须严格挑刺，发现问题立即标记不通过**
- **不通过就重新生成，直到通过为止**
- **宁可多生成几次，也要保证质量**

### 审核流程
1. 查看图片
2. 对照以下检查清单逐项检查
3. 有任何一项不通过 → ❌ 不通过，重新生成
4. 重新生成后再次审核
5. 重复直到全部通过

### 审核检查清单（每张图必须检查）

#### □ 画风检查（与基准图对比）
- [ ] **线条风格**：是否平滑干净？是否有锯齿/粗糙？
- [ ] **色彩风格**：是否明亮温暖？是否偏暗/偏冷？
- [ ] **眼睛风格**：是否大而圆？是否有白色高光？是否一致？
- [ ] **比例风格**：是否Q版？头身比是否一致？
- [ ] **背景风格**：是否简洁？是否与其他图一致？
- [ ] **整体风格**：与Lv.1和Lv.8基准图对比，是否明显一致？

#### □ 清晰度检查
- [ ] **整体清晰度**：是否清晰不模糊？
- [ ] **边缘清晰度**：轮廓是否清晰？
- [ ] **细节清晰度**：毛发、装饰细节是否可见？

#### □ 品种特征检查
- [ ] **品种识别**：能否一眼认出是什么品种？
- [ ] **特征准确性**：品种特有特征是否体现？（如柯基短腿、哈士奇蓝眼）
- [ ] **颜色准确性**：毛色是否符合品种特征？

#### □ 装饰检查（重点！）
- [ ] **装饰存在性**：装饰物是否存在？
- [ ] **装饰清晰度**：装饰物是否清晰可见？
- [ ] **装饰准确性**：装饰物与设计文档描述是否一致？
- [ ] **装饰美观度**：装饰物是否美观？是否奇怪/丑陋？
- [ ] **等级匹配**：装饰是否与等级匹配？（Lv.1简单，Lv.8华丽）

#### □ 美观度检查
- [ ] **表情**：是否可爱友好？是否表情怪异？
- [ ] **姿态**：站姿是否自然？是否奇怪姿势？
- [ ] **色彩**：是否明亮温暖？是否阴暗？
- [ ] **整体**：是否可爱精致？是否适合儿童？

#### □ 技术检查
- [ ] **尺寸**：是否为512x512？
- [ ] **水印**：是否有水印/文字？
- [ ] **模糊**：是否清晰？

### 常见问题及不通过标准

| 问题类型 | 不通过标准 | 重新生成策略 |
|---------|-----------|-------------|
| **画风不一致** | 与基准图风格明显不同（线条、色彩、眼睛） | 检查STYLE词，复制粘贴统一风格词 |
| **模糊** | 整体或边缘模糊，细节不清 | 增加"sharp, clear, high quality"，调整seed |
| **装饰缺失** | 装饰物完全没出现 | 强调"prominently wearing, clearly visible" |
| **装饰怪异** | 装饰物形状奇怪、丑陋 | 简化装饰描述，明确具体形状 |
| **品种特征不明显** | 看不出是什么品种 | 增加品种特征词 |
| **表情怪异** | 表情不友好、不可爱 | 强调"cute friendly expression" |
| **背景不一致** | 背景风格与其他图不同 | 统一背景描述 |

### 审核记录表

每次审核必须记录：

```
宠物: [名称]
等级: Lv.[X]
文件名: [lvX.png]

检查项:
□ 画风一致性: [通过/不通过，说明]
□ 清晰度: [通过/不通过，说明]
□ 品种特征: [通过/不通过，说明]
□ 装饰清晰度: [通过/不通过，说明]
□ 装饰准确性: [通过/不通过，说明]
□ 美观度: [通过/不通过，说明]

审核结果: [✅ 通过 / ❌ 不通过]
不通过原因: [具体原因]
重新生成次数: [X]
```

### 强制重新生成的情况（以下任何一项）

- ❌ 画风与基准图明显不一致
- ❌ 图片模糊
- ❌ 装饰物缺失
- ❌ 装饰物形状怪异/丑陋
- ❌ 品种特征不明显
- ❌ 表情怪异/不友好
- ❌ 背景与其他图不一致

**全部通过 = ✅ 保存**
**任何不通过 = ❌ 重新生成并再次审核**

---

## 十、经验总结（来自实战教训）

### 1. 我的问题
- **审核放水严重**：一开始抽检，没有一张一张严格审核
- **观察能力弱**：看不清细节（模糊、半身、披风形状）
- **prompt优化慢**：同一个问题要生成3-4次才解决

### 2. 关键教训

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| **模糊** | seed不好、风格词冲突 | 换seed、加"sharp, crisp lines" |
| **脸黑** | 面具遮脸、特征词不够 | 强调"face clearly visible"、面具放头顶 |
| **红日** | 背景描述触发（日本主题） | 完全换背景（樱花）、负面词加"red sun" |
| **半身** | 姿态描述不清 | 强调"full body visible, standing pose" |
| **等级递进不明显** | 装饰描述相似 | Lv.8要加"divine, massive, floating, glowing" |
| **画风不一致** | STYLE词被改 | 严格复制粘贴，不改动 |

### 3. Prompt优化技巧

**负面词要全：**
```
NEGATIVE = "3D, realistic, photograph, scary, dark, complex background, 
busy background, text, watermark, signature, blurry, low quality, 
different style, inconsistent design, missing accessories, 
black face, dark face, face covered, red sun, red circle, 
half body, partial body, weird cape, ugly cape"
```

**强调词要重复：**
- prominently wearing
- clearly visible  
- sharp details
- full body visible
- face clearly visible and not covered

**背景要统一：**
- 大部分用 `pure white background`
- 避免复杂背景描述（山脉、洞穴等）
- 日本主题可用樱花，但要小心红日

### 4. 重新生成记录（参考）

| 宠物 | 等级 | 问题 | 次数 |
|------|------|------|------|
| golden-retriever | Lv.1 | 模糊 | 4次 |
| golden-retriever | Lv.5 | 半身+披风怪 | 1次 |
| orange-cat | Lv.1 | 模糊 | 4次 |
| shiba | Lv.6 | 翅膀怪+脸黑 | 4次 |
| shiba | Lv.7 | 脸黑+红日 | 4次 |
| persian-cat | Lv.1 | 画风不一致 | 2次 |
| husky | Lv.4 | 背景复杂+装饰怪 | 2次 |
| ragdoll-cat | Lv.8 | 等级递进不明显 | 1次 |

**平均每个问题要生成2-3次才能解决**

### 5. 下一步改进
1. **prompt模板化**：每个宠物提前写好优化过的prompt
2. **负面词库**：建立完整的负面词库，按需选用
3. **审核清单**：打印出来，逐项打勾
4. **用户确认**：关键图生成后先给用户确认再继续

---

**关键：严格审核，质量第一！必须一张一张审核，严格挑刺！宁可多生成几次，也要确保画风统一、装饰正确、美观可爱！**