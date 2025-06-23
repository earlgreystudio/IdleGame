import type { CharacterData, CharacterStatus, CharacterAttributes, CharacterSkill, CharacterEquipment } from './types';
import type { Club, Gender, SkillType } from '../../core/types/common';
import { EventBus, GameEvents } from '../../core/EventBus';

export class Character {
  private eventBus: EventBus;
  
  public readonly id: string;
  public name: string;
  public readonly gender: Gender;
  public readonly club: Club;
  public readonly createdAt: number;
  public level: number;
  public experience: number;
  public readonly joinDate: number;
  
  private _status: CharacterStatus;
  private _attributes: CharacterAttributes;
  private _skills: Map<SkillType, CharacterSkill>;
  private _equipment: CharacterEquipment;
  private _potential: Map<SkillType, number>;
  
  public currentTaskId: string | null = null;
  public taskQueue: string[] = [];

  constructor(data: CharacterData) {
    this.eventBus = EventBus.getInstance();
    
    this.id = data.id;
    this.name = data.name;
    this.gender = data.gender;
    this.club = data.club;
    this.createdAt = data.createdAt;
    this.level = data.level;
    this.experience = data.experience;
    this.joinDate = data.joinDate;
    
    this._status = { ...data.status };
    this._attributes = { ...data.attributes };
    this._skills = new Map(Object.entries(data.skills) as [SkillType, CharacterSkill][]);
    this._equipment = { ...data.equipment };
    this._potential = new Map(Object.entries(data.potential) as [SkillType, number][]);
  }

  // ゲッター
  get status(): Readonly<CharacterStatus> {
    return { ...this._status };
  }

  get attributes(): Readonly<CharacterAttributes> {
    return { ...this._attributes };
  }

  get skills(): ReadonlyMap<SkillType, CharacterSkill> {
    return new Map(this._skills);
  }

  get equipment(): Readonly<CharacterEquipment> {
    return { ...this._equipment };
  }

  get potential(): ReadonlyMap<SkillType, number> {
    return new Map(this._potential);
  }

  // 計算されるステータス
  get attackPower(): number {
    const base = this._attributes.strength * 2 + this._attributes.dexterity;
    const weaponBonus = this.getWeaponAttackBonus();
    return Math.floor(base + weaponBonus);
  }

  get defensePower(): number {
    const base = this._attributes.toughness * 2 + this._attributes.agility * 0.5;
    const armorBonus = this.getArmorDefenseBonus();
    return Math.floor(base + armorBonus);
  }

  get maxHealth(): number {
    return 80 + this._attributes.toughness * 2;
  }

  get maxStamina(): number {
    return 80 + this._attributes.willpower + this._attributes.toughness;
  }

  get maxMental(): number {
    return 80 + this._attributes.willpower * 2;
  }

  // ステータス変更
  updateStatus(changes: Partial<CharacterStatus>): void {
    const oldStatus = { ...this._status };
    
    Object.entries(changes).forEach(([key, value]) => {
      if (value !== undefined) {
        this._status[key as keyof CharacterStatus] = Math.max(0, Math.min(100, value));
      }
    });

    // 変更があった場合はイベント発火
    if (JSON.stringify(oldStatus) !== JSON.stringify(this._status)) {
      this.eventBus.emit(GameEvents.CHARACTER_STATUS_CHANGE, {
        characterId: this.id,
        status: this._status,
        changes
      });
    }
  }

  // 属性値変更（レベルアップ時など）
  updateAttributes(changes: Partial<CharacterAttributes>): void {
    Object.entries(changes).forEach(([key, value]) => {
      if (value !== undefined) {
        this._attributes[key as keyof CharacterAttributes] = Math.max(1, value);
      }
    });
  }

  // スキル経験値追加
  addSkillExperience(skillType: SkillType, experience: number): void {
    const skill = this._skills.get(skillType);
    if (!skill) return;

    const talent = this._potential.get(skillType) || 1.0;
    const adjustedExp = experience * talent;
    
    skill.experience += adjustedExp;

    // レベルアップチェック
    while (skill.experience >= 100 && skill.level < 20) {
      skill.experience -= 100;
      skill.level++;
      
      this.eventBus.emit(GameEvents.CHARACTER_SKILL_UP, {
        characterId: this.id,
        skill: skillType,
        newLevel: skill.level
      });

      // レベルアップ時のステータス上昇
      this.applySkillLevelBonus(skillType);
    }

    // 経験値が100を超えた場合は100に制限
    if (skill.level >= 20) {
      skill.experience = Math.min(skill.experience, 100);
    }
  }

  // スキルレベルによるステータスボーナス
  private applySkillLevelBonus(skillType: SkillType): void {
    const bonuses: Record<SkillType, Partial<CharacterAttributes>> = {
      '片手武器': { strength: 0.2, dexterity: 0.1 },
      '両手武器': { strength: 0.3, toughness: 0.1 },
      '長柄武器': { strength: 0.2, agility: 0.1 },
      '弓': { dexterity: 0.3, agility: 0.1 },
      '射撃': { dexterity: 0.2, intelligence: 0.1 },
      '盾': { toughness: 0.3, willpower: 0.1 },
      '解錠': { dexterity: 0.2 },
      '水泳': { toughness: 0.2, agility: 0.1 },
      '工学': { intelligence: 0.3, dexterity: 0.1 },
      '化学': { intelligence: 0.3 },
      '農業': { toughness: 0.2, intelligence: 0.1 },
      '料理': { dexterity: 0.2, intelligence: 0.1 },
      '裁縫': { dexterity: 0.3 },
      '建築': { strength: 0.2, toughness: 0.1 },
      '調教': { willpower: 0.2, intelligence: 0.1 },
      'サバイバル': { toughness: 0.2, willpower: 0.1 },
      '工作': { dexterity: 0.2, intelligence: 0.1 },
      '機械': { intelligence: 0.2, dexterity: 0.1 },
      '釣り': { dexterity: 0.1, willpower: 0.1 },
      '医学': { intelligence: 0.3, dexterity: 0.1 },
      '楽器': { dexterity: 0.2, willpower: 0.1 }
    };

    const bonus = bonuses[skillType];
    if (bonus) {
      this.updateAttributes({
        strength: this._attributes.strength + (bonus.strength || 0),
        toughness: this._attributes.toughness + (bonus.toughness || 0),
        intelligence: this._attributes.intelligence + (bonus.intelligence || 0),
        dexterity: this._attributes.dexterity + (bonus.dexterity || 0),
        agility: this._attributes.agility + (bonus.agility || 0),
        willpower: this._attributes.willpower + (bonus.willpower || 0)
      });
    }
  }

  // 装備関連
  private getWeaponAttackBonus(): number {
    // 装備による攻撃力ボーナス（装備システム実装後に詳細化）
    return 0;
  }

  private getArmorDefenseBonus(): number {
    // 装備による防御力ボーナス（装備システム実装後に詳細化）
    return 0;
  }

  // スキルレベル取得
  getSkillLevel(skillType: SkillType): number {
    return this._skills.get(skillType)?.level || 0;
  }

  // スキル効率取得（レベル + 才能）
  getSkillEfficiency(skillType: SkillType): number {
    const skill = this._skills.get(skillType);
    if (!skill) return 0;

    const talent = this._potential.get(skillType) || 1.0;
    return skill.level * talent;
  }

  // 行動可能かチェック
  canPerformAction(): boolean {
    return this._status.health > 0 && this._status.stamina > 10;
  }

  // 時間経過処理
  tick(deltaTime: number): void {
    // 空腹・渇きの増加（1時間で5ポイント減少）
    const hourlyDecay = (deltaTime / 3600) * 5;
    
    this.updateStatus({
      hunger: this._status.hunger - hourlyDecay,
      thirst: this._status.thirst - hourlyDecay
    });

    // 空腹・渇きによる体力・メンタル影響
    if (this._status.hunger < 20) {
      this.updateStatus({
        health: this._status.health - hourlyDecay * 0.5,
        mental: this._status.mental - hourlyDecay * 0.3
      });
    }

    if (this._status.thirst < 20) {
      this.updateStatus({
        health: this._status.health - hourlyDecay * 0.8,
        stamina: this._status.stamina - hourlyDecay * 0.5
      });
    }

    // 休息時の回復
    if (this.currentTaskId === null || this.currentTaskId === 'rest') {
      this.updateStatus({
        stamina: this._status.stamina + hourlyDecay * 2,
        mental: this._status.mental + hourlyDecay * 1.5
      });
    }
  }

  // データ出力
  toData(): CharacterData {
    return {
      id: this.id,
      name: this.name,
      gender: this.gender,
      club: this.club,
      level: this.level,
      experience: this.experience,
      status: { ...this._status },
      attributes: { ...this._attributes },
      skills: Object.fromEntries(this._skills) as Record<SkillType, CharacterSkill>,
      equipment: { ...this._equipment },
      currentTaskId: this.currentTaskId,
      joinDate: this.joinDate,
      createdAt: this.createdAt,
      potential: Object.fromEntries(this._potential) as Record<SkillType, number>
    };
  }
}