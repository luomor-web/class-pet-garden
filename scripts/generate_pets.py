#!/usr/bin/env python3
"""
宠物图片批量生成工具 - 使用 SiliconFlow FLUX.1-schnell 模型

用法:
    python generate_pets.py --preview --pet cat --level 3    # 预览Prompt
    python generate_pets.py --pet cat --level 3              # 生成单张
    python generate_pets.py --pet cat                       # 生成某宠物所有等级
    python generate_pets.py --all                           # 生成所有

"""

import argparse
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional


# ============ 配置 ============

MODELS = {
    "flux": "black-forest-labs/FLUX.1-schnell",
    "flux-dev": "black-forest-labs/FLUX.1-dev", 
    "flux-pro": "black-forest-labs/FLUX.1-pro",
}

DEFAULT_MODEL = "flux"
DEFAULT_SIZE = "512x512"
OUTPUT_DIR = Path("/root/.openclaw/workspace/projects/class-pet-garden/public/pets")

# ============ 宠物定义（测试用：cat, dog） ============

PETS = {
    "cat": {
        "name": "小猫",
        "base_prompt": "cute fluffy cat with big round eyes, pink nose, soft fur",
        "color": "orange and white",
        "features": "fluffy tail, whiskers"
    },
    "dog": {
        "name": "小狗",
        "base_prompt": "cute friendly dog with floppy ears, wagging tail",
        "color": "golden brown",
        "features": "floppy ears, shiny eyes"
    }
}

# ============ 等级定义 ============

LEVELS = {
    1: {"stage": "baby", "description": "tiny baby, chibi style, innocent big eyes", "background": "peaceful meadow with flowers, morning sunlight"},
    2: {"stage": "child", "description": "young child, playful, energetic", "background": "colorful garden with butterflies"},
    3: {"stage": "teen", "description": "teenager, confident, vibrant", "background": "enchanted forest with glowing mushrooms"},
    4: {"stage": "youth", "description": "young adult, strong, determined", "background": "ancient forest with waterfall"},
    5: {"stage": "adult", "description": "mature adult, powerful, majestic", "background": "mountain peak above clouds, rainbow"},
    6: {"stage": "elite", "description": "elite, heroic, commanding", "background": "floating islands in sky, golden clouds"},
    7: {"stage": "master", "description": "king, legendary, awe-inspiring", "background": "celestial temple in clouds, aurora"},
    8: {"stage": "legend", "description": "divine, mythical, god-like", "background": "cosmic realm with stars and nebula"},
}

STYLE = "flat cartoon style, kawaii, chibi proportions, cute and friendly, big round eyes, soft rounded shapes, vibrant colors, masterpiece"
NEGATIVE = "ugly, deformed, noisy, blurry, realistic, scary, dark, text, watermark"

def build_prompt(pet_id: str, level: int) -> str:
    pet = PETS[pet_id]
    lvl = LEVELS[level]
    return f"A {pet['base_prompt']}, {lvl['description']}, {pet['features']}, {pet['color']}, {STYLE}, standing pose, front view, happy expression, {lvl['background']}, 8k, highly detailed"

def get_api_key():
    with open("/root/.openclaw/openclaw.json") as f:
        config = json.load(f)
        return config.get('models', {}).get('providers', {}).get('siliconflow', {}).get('apiKey', '')

def generate(prompt: str):
    api_key = get_api_key()
    url = "https://api.siliconflow.cn/v1/images/generations"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": MODELS["flux"],
        "prompt": prompt,
        "negative_prompt": NEGATIVE,
        "image_size": "512x512",
        "num_images": 1
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    return resp.json()

def download(url: str, path: Path):
    r = requests.get(url, stream=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="预览Prompt")
    parser.add_argument("--pet", choices=["cat", "dog"], help="宠物")
    parser.add_argument("--level", type=int, choices=range(1,9), help="等级")
    args = parser.parse_args()
    
    if args.preview and args.pet and args.level:
        prompt = build_prompt(args.pet, args.level)
        print(f"\n📝 Prompt for {args.pet} Lv.{args.level}:\n")
        print(prompt)
        print()
        return
    
    if args.pet and args.level:
        prompt = build_prompt(args.pet, args.level)
        print(f"🎨 生成 {args.pet} Lv.{args.level}...")
        result = generate(prompt)
        if 'images' in result:
            url = result['images'][0]['url']
            path = OUTPUT_DIR / args.pet / f"lv{args.level}.png"
            download(url, path)
            print(f"✅ 已保存: {path}")
        else:
            print(f"❌ 失败: {result}")

if __name__ == "__main__":
    main()
