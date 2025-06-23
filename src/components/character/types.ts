import type { Club, Gender, SkillType } from '../../core/types/common';

export interface CharacterData {
  id: string;
  name: string;
  gender: Gender;
  club: Club;
  level: number;
  experience: number;
  status: CharacterStatus;
  attributes: CharacterAttributes;
  skills: Record<SkillType, CharacterSkill>;
  equipment: CharacterEquipment;
  currentTaskId: string | null;
  joinDate: number;
  createdAt: number;
  potential: Record<SkillType, number>;
}

export interface CharacterStatus {
  health: number;
  stamina: number;
  mental: number;
  hunger: number;
  thirst: number;
}

export interface CharacterAttributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  charisma: number;
  luck: number;
  toughness: number;
  agility: number;
  willpower: number;
}

export interface CharacterSkill {
  level: number;
  experience: number;
  talent?: number;
}

export interface CharacterEquipment {
  weapon?: any;  // TODO: Define equipment types
  armor?: any;
  accessory?: any;
  chest?: any;
  legs?: any;
  head?: any;
  arms?: any;
  feet?: any;
  accessory1?: any;
  accessory2?: any;
}