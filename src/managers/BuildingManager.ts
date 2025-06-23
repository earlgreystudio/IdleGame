/**
 * 建物管理の責任を専門化したマネージャークラス
 * 建物の生成、アップグレード、効果計算などを担当
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { DataManager } from './DataManagerUpdated';
import { Building } from '../entities/Building';
import type { BuildingType, BuildingData } from '../types/building';
import type { Position } from '../types/common';

export interface BuildingActionResult {
  success: boolean;
  message: string;
  building?: Building;
  result?: any;
}

export class BuildingManager {
  private eventBus: EventBus;
  private gameState: GameState;
  private dataManager: DataManager;
  private buildings: Map<string, Building> = new Map();

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.gameState = GameState.getInstance();
    this.dataManager = DataManager.getInstance();
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // ゲームロード時
    this.eventBus.on(GameEvents.GAME_LOAD, (saveData: any) => {
      this.loadBuildings(saveData.buildings || []);
    });

    // ゲームセーブ時
    this.eventBus.on(GameEvents.GAME_SAVE, () => {
      this.eventBus.emit('buildings:save', this.getAllBuildingData());
    });
  }

  /**
   * 建物の建設
   */
  buildBuilding(type: BuildingType, position: Position): BuildingActionResult {
    const template = this.dataManager.getBuildingTemplate(type);
    if (!template) {
      return { 
        success: false, 
        message: `未知の建物タイプ: ${type}` 
      };
    }

    // 建設コストをチェック（レベル1のコスト）
    const cost = this.dataManager.getBuildingCost(type, 1);
    if (!this.canAffordCost(cost)) {
      return { 
        success: false, 
        message: '建設に必要なリソースが不足しています' 
      };
    }

    // 位置の重複チェック
    if (this.isBuildingAt(position)) {
      return { 
        success: false, 
        message: 'その場所には既に建物があります' 
      };
    }

    // リソースを消費
    this.consumeResources(cost);

    // 建物を作成
    const building = Building.create(type, position);
    this.buildings.set(building.id, building);

    this.eventBus.emit(GameEvents.BASE_BUILD, {
      buildingId: building.id,
      type,
      position,
      level: 1
    });

    return { 
      success: true, 
      message: `${template.name}を建設しました`, 
      building 
    };
  }

  /**
   * 建物のアップグレード
   */
  upgradeBuilding(buildingId: string): BuildingActionResult {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return { success: false, message: '建物が見つかりません' };
    }

    if (!this.dataManager.canUpgradeBuilding(building.type, building.level)) {
      return { success: false, message: 'アップグレードできません' };
    }

    const upgradeCost = this.dataManager.getBuildingUpgradeCost(building.type, building.level);
    if (!this.canAffordCost(upgradeCost)) {
      return { success: false, message: 'アップグレードに必要なリソースが不足しています' };
    }

    // リソースを消費
    this.consumeResources(upgradeCost);

    // アップグレード開始
    const success = building.startUpgrade();
    if (success) {
      const template = this.dataManager.getBuildingTemplate(building.type);
      this.eventBus.emit(GameEvents.BASE_UPGRADE, {
        buildingId,
        type: building.type,
        newLevel: building.level + 1
      });
      
      return { success: true, message: 'アップグレードを開始しました' };
    } else {
      return { success: false, message: 'アップグレードに失敗しました' };
    }
  }

  /**
   * 建物の解体
   */
  demolishBuilding(buildingId: string): BuildingActionResult {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return { success: false, message: '建物が見つかりません' };
    }

    // 解体時の資源回収（建設コストの50%）
    const cost = this.dataManager.getBuildingCost(building.type, building.level);
    Object.entries(cost).forEach(([resource, amount]) => {
      if (amount) {
        this.gameState.addResource(resource, Math.floor((amount as number) * 0.5));
      }
    });

    this.buildings.delete(buildingId);
    
    this.eventBus.emit('building:demolish', {
      buildingId,
      type: building.type,
      level: building.level
    });

    const template = this.dataManager.getBuildingTemplate(building.type);
    return { success: true, message: `${template?.name}を解体しました` };
  }

  /**
   * 建物の生産物回収
   */
  collectBuildingProduction(buildingId: string): BuildingActionResult {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return { success: false, message: '建物が見つかりません' };
    }

    const result = building.collectProduction();
    return { success: true, message: '生産物を回収しました', result };
  }

  /**
   * 建物の検索・取得
   */
  getBuilding(id: string): Building | undefined {
    return this.buildings.get(id);
  }

  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  getBuildingsByType(type: BuildingType): Building[] {
    return this.getAllBuildings().filter(building => building.type === type);
  }

  getBuildingsAt(position: Position): Building[] {
    return this.getAllBuildings().filter(building => 
      building.position.x === position.x && building.position.y === position.y
    );
  }

  isBuildingAt(position: Position): boolean {
    return this.getBuildingsAt(position).length > 0;
  }

  /**
   * 拠点全体の効果計算
   */
  calculateTotalEffects(): {
    capacity: number;
    storage: number;
    defense: number;
    craftingSpeed: number;
    cookingSpeed: number;
  } {
    const effects = {
      capacity: 0,
      storage: 0,
      defense: 0,
      craftingSpeed: 1,
      cookingSpeed: 1
    };

    this.buildings.forEach(building => {
      if (building.health <= 0) return; // 破壊された建物は効果なし

      const buildingEffect = this.dataManager.getBuildingEffect(building.type, building.level);
      
      if (buildingEffect.capacity) effects.capacity += buildingEffect.capacity;
      if (buildingEffect.storage) effects.storage += buildingEffect.storage;
      if (buildingEffect.defense) effects.defense += buildingEffect.defense;
      if (buildingEffect.craftingSpeed) effects.craftingSpeed *= buildingEffect.craftingSpeed;
      if (buildingEffect.cookingSpeed) effects.cookingSpeed *= buildingEffect.cookingSpeed;
    });

    return effects;
  }

  /**
   * 自動生産物回収
   */
  autoCollectProduction(): void {
    let totalCollected: Record<string, number> = {};

    this.buildings.forEach(building => {
      const result = building.collectProduction();
      if (result) {
        totalCollected[result.resourceType] = 
          (totalCollected[result.resourceType] || 0) + result.amount;
      }
    });

    // 回収結果をログ出力
    Object.entries(totalCollected).forEach(([resource, amount]) => {
      console.log(`自動回収: ${resource} +${Math.floor(amount)}`);
    });
  }

  /**
   * 建物の更新処理
   */
  updateBuildings(): void {
    this.buildings.forEach(building => {
      building.tick();
    });
  }

  /**
   * コスト支払い可能性チェック
   */
  private canAffordCost(cost: Record<string, number>): boolean {
    return Object.entries(cost).every(([resource, amount]) => {
      return amount ? this.gameState.hasResource(resource, amount) : true;
    });
  }

  /**
   * リソース消費
   */
  private consumeResources(cost: Record<string, number>): void {
    Object.entries(cost).forEach(([resource, amount]) => {
      if (amount) {
        this.gameState.removeResource(resource, amount);
      }
    });
  }

  /**
   * セーブ・ロード関連
   */
  private getAllBuildingData(): BuildingData[] {
    return this.getAllBuildings().map(building => building.toData());
  }

  private loadBuildings(buildingDataList: BuildingData[]): void {
    this.buildings.clear();
    
    buildingDataList.forEach(data => {
      const building = new Building(data);
      this.buildings.set(building.id, building);
    });
    
    console.log(`${buildingDataList.length}個の建物を読み込みました`);
  }

  /**
   * 統計情報の取得（デバッグ用）
   */
  getBuildingStats(): {
    totalBuildings: number;
    buildingsByType: Record<string, number>;
    totalEffects: any;
  } {
    const buildingsByType: Record<string, number> = {};
    
    this.buildings.forEach(building => {
      buildingsByType[building.type] = (buildingsByType[building.type] || 0) + 1;
    });

    return {
      totalBuildings: this.buildings.size,
      buildingsByType,
      totalEffects: this.calculateTotalEffects()
    };
  }

  /**
   * デバッグ用の拠点状況出力
   */
  printBaseStatus(): void {
    console.log('=== 拠点状況 ===');
    const effects = this.calculateTotalEffects();
    console.log(`収容人数: ${effects.capacity}`);
    console.log(`保管容量: ${effects.storage}`);
    console.log(`防御力: ${effects.defense}`);
    console.log(`作成速度: ${effects.craftingSpeed.toFixed(2)}x`);
    console.log(`調理速度: ${effects.cookingSpeed.toFixed(2)}x`);
    
    console.log('\n建物一覧:');
    this.buildings.forEach(building => {
      const template = this.dataManager.getBuildingTemplate(building.type);
      const upgrading = building.upgrading ? ` (アップグレード中: ${building.getUpgradeProgress().toFixed(1)}%)` : '';
      console.log(`  ${template?.name} Lv.${building.level}${upgrading} - HP: ${building.health}/${building.maxHealth}`);
      
      if (building.production) {
        console.log(`    生産: ${building.production.currentAmount.toFixed(1)}/${building.production.maxStorage}`);
      }
    });
  }
}