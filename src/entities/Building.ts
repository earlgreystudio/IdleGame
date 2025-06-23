import type { BuildingData, BuildingType, BuildingCost, BuildingEffect, BuildingUpgrade } from '../types/building';
import type { Position } from '../types/common';
import { DataManager } from '../managers/DataManagerUpdated';
import { EventBus, GameEvents } from '@core/EventBus';

export class Building {
  private eventBus: EventBus;
  
  public readonly id: string;
  public readonly type: BuildingType;
  public level: number;
  public readonly position: Position;
  public readonly createdAt: number;
  
  private _health: number;
  private _maxHealth: number;
  private _upgrading: BuildingUpgrade | null = null;
  private _production: {
    currentAmount: number;
    maxStorage: number;
    lastUpdate: number;
  } | undefined = undefined;

  constructor(data: BuildingData) {
    this.eventBus = EventBus.getInstance();
    
    this.id = data.id;
    this.type = data.type;
    this.level = data.level;
    this.position = data.position;
    this.createdAt = data.createdAt;
    
    this._health = data.health;
    this._maxHealth = data.maxHealth;
    this._upgrading = data.upgrading;
    
    if (data.production) {
      this._production = { ...data.production };
    }
  }

  // ゲッター
  get health(): number {
    return this._health;
  }

  get maxHealth(): number {
    return this._maxHealth;
  }

  get upgrading(): BuildingUpgrade | null {
    return this._upgrading ? { ...this._upgrading } : null;
  }

  get production(): { currentAmount: number; maxStorage: number; lastUpdate: number } | null {
    return this._production ? { ...this._production } : null;
  }

  get template() {
    return DataManager.getInstance().getBuildingTemplate(this.type);
  }

  get currentLevelData() {
    return DataManager.getInstance().calculateLevelData(this.type, this.level);
  }

  get nextLevelData() {
    const dataManager = DataManager.getInstance();
    return dataManager.canUpgradeBuilding(this.type, this.level) 
      ? dataManager.calculateLevelData(this.type, this.level + 1) 
      : null;
  }

  get effect(): BuildingEffect {
    return this.currentLevelData.effect;
  }

  // アップグレード可能かチェック
  canUpgrade(): boolean {
    const template = this.template;
    return template ? this.level < template.maxLevel && !this._upgrading && this._health > 0 : false;
  }

  // アップグレード開始
  startUpgrade(): boolean {
    if (!this.canUpgrade()) return false;

    const nextLevel = this.nextLevelData;
    if (!nextLevel || !nextLevel.upgradeDuration) return false;

    this._upgrading = {
      targetLevel: this.level + 1,
      cost: nextLevel.cost,
      duration: nextLevel.upgradeDuration,
      startTime: Date.now()
    };

    this.eventBus.emit(GameEvents.BASE_UPGRADE, {
      buildingId: this.id,
      targetLevel: this._upgrading.targetLevel
    });

    return true;
  }

  // アップグレード進行状況（0-100）
  getUpgradeProgress(): number {
    if (!this._upgrading) return 0;

    const elapsed = Date.now() - (this._upgrading.startTime || 0);
    const progress = Math.min(100, (elapsed / (this._upgrading.duration * 1000)) * 100);
    
    return progress;
  }

  // アップグレード完了チェック
  checkUpgradeCompletion(): boolean {
    if (!this._upgrading) return false;

    const progress = this.getUpgradeProgress();
    if (progress >= 100) {
      this.completeUpgrade();
      return true;
    }

    return false;
  }

  // アップグレード完了処理
  private completeUpgrade(): void {
    if (!this._upgrading) return;

    const targetLevel = this._upgrading.targetLevel;
    const newLevelData = DataManager.getInstance().calculateLevelData(this.type, targetLevel);
    
    this.level = targetLevel;
    this._maxHealth = newLevelData.health;
    this._health = Math.min(this._health, this._maxHealth);
    
    // 生産施設の場合、ストレージも更新
    if (newLevelData.effect.storage && this._production) {
      this._production.maxStorage = newLevelData.effect.storage;
    }

    this._upgrading = null;

    this.eventBus.emit(GameEvents.BASE_UPGRADE, {
      buildingId: this.id,
      newLevel: this.level,
      completed: true
    });
  }

  // ダメージを受ける
  takeDamage(damage: number): void {
    const oldHealth = this._health;
    this._health = Math.max(0, this._health - damage);

    if (this._health !== oldHealth) {
      this.eventBus.emit('building:damage', {
        buildingId: this.id,
        damage,
        currentHealth: this._health,
        maxHealth: this._maxHealth
      });

      // 破壊された場合
      if (this._health <= 0) {
        this.eventBus.emit('building:destroyed', {
          buildingId: this.id,
          type: this.type,
          level: this.level
        });
      }
    }
  }

  // 修理
  repair(amount: number): void {
    const oldHealth = this._health;
    this._health = Math.min(this._maxHealth, this._health + amount);

    if (this._health !== oldHealth) {
      this.eventBus.emit('building:repair', {
        buildingId: this.id,
        healAmount: this._health - oldHealth,
        currentHealth: this._health,
        maxHealth: this._maxHealth
      });
    }
  }

  // 生産処理（生産系建物のみ）
  updateProduction(): void {
    const productionEffect = this.effect.production;
    if (!productionEffect || !this._production || this._health <= 0) return;

    const now = Date.now();
    const timeSinceLastUpdate = (now - this._production.lastUpdate) / 1000; // 秒
    const hoursElapsed = timeSinceLastUpdate / 3600; // 時間

    const producedAmount = productionEffect.rate * hoursElapsed;
    const newAmount = Math.min(
      this._production.currentAmount + producedAmount,
      this._production.maxStorage
    );

    if (newAmount > this._production.currentAmount) {
      const actualProduced = newAmount - this._production.currentAmount;
      this._production.currentAmount = newAmount;
      
      this.eventBus.emit('building:production', {
        buildingId: this.id,
        resourceType: productionEffect.resourceType,
        amount: actualProduced,
        currentStorage: this._production.currentAmount,
        maxStorage: this._production.maxStorage
      });
    }

    this._production.lastUpdate = now;
  }

  // 生産された資源を回収
  collectProduction(): { resourceType: string; amount: number } | null {
    const productionEffect = this.effect.production;
    if (!productionEffect || !this._production || this._production.currentAmount <= 0) {
      return null;
    }

    const amount = this._production.currentAmount;
    this._production.currentAmount = 0;

    this.eventBus.emit('building:collect', {
      buildingId: this.id,
      resourceType: productionEffect.resourceType,
      amount
    });

    return {
      resourceType: productionEffect.resourceType,
      amount
    };
  }

  // 時間経過処理
  tick(): void {
    // アップグレード進行チェック
    this.checkUpgradeCompletion();
    
    // 生産処理
    this.updateProduction();
  }

  // データ出力
  toData(): BuildingData {
    return {
      id: this.id,
      type: this.type,
      level: this.level,
      position: this.position,
      health: this._health,
      maxHealth: this._maxHealth,
      upgrading: this._upgrading,
      production: this._production || undefined,
      createdAt: this.createdAt
    };
  }

  // 静的メソッド：新しい建物を作成
  static create(
    type: BuildingType,
    position: Position,
    level: number = 1
  ): Building {
    const dataManager = DataManager.getInstance();
    const template = dataManager.getBuildingTemplate(type);
    const levelData = dataManager.calculateLevelData(type, level);
    
    if (!template || !levelData) {
      throw new Error(`Invalid building type or level: ${type} level ${level}`);
    }
    
    const buildingData: BuildingData = {
      id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      position,
      health: levelData.health,
      maxHealth: levelData.health,
      upgrading: null,
      createdAt: Date.now()
    };

    // 生産系建物の場合、生産情報を初期化
    if (levelData.effect.production && levelData.effect.storage) {
      buildingData.production = {
        currentAmount: 0,
        maxStorage: levelData.effect.storage,
        lastUpdate: Date.now()
      };
    }

    return new Building(buildingData);
  }
}