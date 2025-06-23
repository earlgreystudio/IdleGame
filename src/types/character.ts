import { Club, Gender, SkillType, EquipmentSlot } from './common';

export interface CharacterStatus {
  health: number;      // 0-100
  stamina: number;     // 0-100
  mental: number;      // 0-100
  hunger: number;      // 0-100
  thirst: number;      // 0-100
}

export interface CharacterAttributes {
  strength: number;     // 力
  toughness: number;    // 頑丈
  intelligence: number; // 賢さ
  dexterity: number;    // 器用
  agility: number;      // 敏捷
  willpower: number;    // 精神力
}

export interface CharacterSkill {
  level: number;        // 1-20
  experience: number;   // 0-100
  talent: number;       // 0.5-2.0 (成長率補正)
}

export interface CharacterEquipment {
  chest: string | null;      // 胴
  legs: string | null;       // 脚
  head: string | null;       // 頭
  arms: string | null;       // 腕
  feet: string | null;       // 靴
  accessory1: string | null; // アクセサリー1
  accessory2: string | null; // アクセサリー2
}

export interface CharacterData {
  id: string;
  name: string;
  gender: Gender;
  club: Club;
  
  // ステータス
  status: CharacterStatus;
  attributes: CharacterAttributes;
  skills: Map<SkillType, CharacterSkill>;
  
  // 装備
  equipment: CharacterEquipment;
  
  // タスク関連
  currentTaskId: string | null;
  taskQueue: string[];
  
  // 作成時刻
  createdAt: number;
  
  // 個体値（隠しパラメータ）
  potential: Map<SkillType, number>; // 各スキルの才能 0.5-2.0
}