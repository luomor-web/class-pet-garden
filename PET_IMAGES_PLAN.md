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