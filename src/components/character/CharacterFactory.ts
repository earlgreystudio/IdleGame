import { Character } from './Character';
import type { CharacterData, CharacterStatus, CharacterAttributes, CharacterSkill } from './types';
import type { Club, Gender, SkillType } from '../../core/types/common';

interface ClubBonuses {
  attributes: Partial<CharacterAttributes>;
  skills: Partial<Record<SkillType, number>>;
}

export class CharacterFactory {
  private static readonly CLUB_BONUSES: Record<Club, ClubBonuses> = {
    '野球部': {
      attributes: { strength: 2, toughness: 1 },
      skills: { '両手武器': 2 }
    },
    '剣道部': {
      attributes: { dexterity: 2, willpower: 1 },
      skills: { '片手武器': 3 }
    },
    '化学部': {
      attributes: { intelligence: 3 },
      skills: { '化学': 3, '医学': 1 }
    },
    'アーチェリー部': {
      attributes: { dexterity: 2, agility: 1 },
      skills: { '弓': 3 }
    },
    '空手部': {
      attributes: { strength: 1, toughness: 2 },
      skills: { '片手武器': 1 }
    },
    'アメフト部': {
      attributes: { strength: 2, toughness: 1 },
      skills: {}
    },
    'ゴルフ部': {
      attributes: { dexterity: 1, willpower: 2 },
      skills: {}
    },
    '陸上部': {
      attributes: { agility: 2, toughness: 1 },
      skills: {}
    },
    '演劇部': {
      attributes: { willpower: 2, dexterity: 1 },
      skills: {}
    },
    '茶道部': {
      attributes: { willpower: 2, intelligence: 1 },
      skills: { '料理': 2 }
    },
    '馬術部': {
      attributes: { agility: 1, willpower: 1 },
      skills: { '調教': 3 }
    },
    'ロボット研究会': {
      attributes: { intelligence: 2 },
      skills: { '工学': 2, '機械': 2 }
    },
    '園芸部': {
      attributes: { toughness: 1, intelligence: 1 },
      skills: { '農業': 3 }
    },
    '天文部': {
      attributes: { intelligence: 2 },
      skills: { 'サバイバル': 1 }
    },
    '卓球部': {
      attributes: { dexterity: 1, agility: 2 },
      skills: {}
    },
    'バスケ部': {
      attributes: { toughness: 1, agility: 2 },
      skills: {}
    },
    'バドミントン部': {
      attributes: { agility: 2, dexterity: 1 },
      skills: {}
    },
    'テニス部': {
      attributes: { strength: 1, agility: 2 },
      skills: {}
    },
    'バレー部': {
      attributes: { toughness: 2, dexterity: 1 },
      skills: {}
    },
    'サッカー部': {
      attributes: { toughness: 2, agility: 1 },
      skills: {}
    },
    '相撲部': {
      attributes: { strength: 2, toughness: 1 },
      skills: {}
    },
    '料理部': {
      attributes: { intelligence: 1, dexterity: 1 },
      skills: { '料理': 3 }
    }
  };

  private static readonly ALL_SKILLS: SkillType[] = [
    '片手武器', '両手武器', '長柄武器', '弓', '射撃', '盾', '解錠', '水泳',
    '工学', '化学', '農業', '料理', '裁縫', '建築', '調教', 'サバイバル',
    '工作', '機械', '釣り', '医学', '楽器'
  ];

  private static readonly BASE_ATTRIBUTES: CharacterAttributes = {
    strength: 5,
    toughness: 5,
    intelligence: 5,
    dexterity: 5,
    agility: 5,
    willpower: 5,
    constitution: 5,
    charisma: 5,
    luck: 5
  };

  static createCharacter(club: Club, gender: Gender, name?: string): Character {
    const id = this.generateId();
    const characterName = name || this.generateRandomName(gender);
    
    // 基本ステータスの生成（個体差 ±20%）
    const attributes = this.generateAttributes(club);
    const skills = this.generateSkills(club);
    const potential = this.generatePotential();
    
    const characterData: CharacterData = {
      id,
      name: characterName,
      gender,
      club,
      level: 1,
      experience: 0,
      status: {
        health: 100,
        stamina: 100,
        mental: 100,
        hunger: 80,
        thirst: 80
      },
      attributes,
      skills: Object.fromEntries(skills) as Record<SkillType, CharacterSkill>,
      equipment: {
        chest: null,
        legs: null,
        head: null,
        arms: null,
        feet: null,
        accessory1: null,
        accessory2: null
      },
      currentTaskId: null,
      joinDate: Date.now(),
      createdAt: Date.now(),
      potential: Object.fromEntries(potential) as Record<SkillType, number>
    };

    return new Character(characterData);
  }

  static createRandomCharacter(name?: string): Character {
    const clubs = Object.keys(this.CLUB_BONUSES) as Club[];
    const club = clubs[Math.floor(Math.random() * clubs.length)];
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    
    return this.createCharacter(club, gender, name);
  }

  private static generateId(): string {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private static generateRandomName(gender: Gender): string {
    const maleNames = [
      '太郎', '次郎', '三郎', '健太', '翔太', '大輝', '拓哉', '雄太', '慎太郎', '和也'
    ];
    const femaleNames = [
      '花子', '美咲', '由香', '恵美', '亜美', '麻衣', '結衣', '美穂', '千夏', '奈々'
    ];
    
    const names = gender === 'male' ? maleNames : femaleNames;
    return names[Math.floor(Math.random() * names.length)];
  }

  private static generateAttributes(club: Club): CharacterAttributes {
    const clubBonus = this.CLUB_BONUSES[club];
    const attributes = { ...this.BASE_ATTRIBUTES };

    // 部活ボーナスを適用
    Object.entries(clubBonus.attributes).forEach(([key, bonus]) => {
      if (bonus) {
        attributes[key as keyof CharacterAttributes] += bonus;
      }
    });

    // 個体差を適用（±20%）
    Object.keys(attributes).forEach((key) => {
      const attributeKey = key as keyof CharacterAttributes;
      const base = attributes[attributeKey];
      const variation = base * 0.2;
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      attributes[attributeKey] = Math.max(1, Math.round(base + variation * randomFactor));
    });

    return attributes;
  }

  private static generateSkills(club: Club): Map<SkillType, CharacterSkill> {
    const skills = new Map<SkillType, CharacterSkill>();
    const clubBonus = this.CLUB_BONUSES[club];

    // すべてのスキルを初期化
    this.ALL_SKILLS.forEach((skillType) => {
      const clubSkillBonus = clubBonus.skills[skillType] || 0;
      const baseLevel = Math.max(1, clubSkillBonus);
      
      // 個体差（±1レベル）
      const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      const level = Math.max(1, Math.min(20, baseLevel + variation));

      skills.set(skillType, {
        level,
        experience: 0,
        talent: 1.0 // 才能は別途設定
      });
    });

    return skills;
  }

  private static generatePotential(): Map<SkillType, number> {
    const potential = new Map<SkillType, number>();

    this.ALL_SKILLS.forEach((skillType) => {
      // 才能値: 0.5-2.0（平均1.0）
      // 正規分布に近い形で生成
      let talent = 0;
      for (let i = 0; i < 6; i++) {
        talent += Math.random();
      }
      talent = talent / 6; // 0-1の正規分布っぽい値
      
      // 0.5-2.0の範囲にマッピング
      talent = 0.5 + talent * 1.5;
      
      potential.set(skillType, Math.round(talent * 100) / 100);
    });

    return potential;
  }

  // セーブデータからキャラクターを復元
  static fromData(data: CharacterData): Character {
    return new Character(data);
  }
}