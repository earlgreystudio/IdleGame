/**
 * リファクタリング済みBaseSystem
 * BuildingManagerに責任を委譲し、システムレベルの制御のみを担当
 */

import { BaseSystem as BaseSystemCore } from '../core/BaseSystem';
import { GameEvents } from '../core/EventBus';
import { BuildingManager } from '../managers/BuildingManager';
import type { BuildingType } from '../types/building';
import type { Position } from '../types/common';

export class BaseSystem extends BaseSystemCore {
  private buildingManager: BuildingManager;
  private updateTimer: number = 0;
  private readonly UPDATE_INTERVAL = 5; // 5秒ごとに更新

  constructor() {
    super();
    this.buildingManager = new BuildingManager();
  }

  protected async onInitialize(): Promise<void> {
    console.log('BaseSystem initialized');
    
    // テスト用の初期建物を作成
    this.createTestBuildings();
  }

  protected setupEventListeners(): void {
    // 時間経過による自動回収（1時間ごと）
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.buildingManager.autoCollectProduction();
    });
  }

  protected onStart(): void {
    console.log('BaseSystem started');
  }

  protected onStop(): void {
    console.log('BaseSystem stopped');
  }

  protected onUpdate(deltaTime: number): void {
    this.updateTimer += deltaTime;
    
    if (this.updateTimer >= this.UPDATE_INTERVAL) {
      this.buildingManager.updateBuildings();
      this.updateTimer = 0;
    }
  }

  protected onDestroy(): void {
    console.log('BaseSystem destroyed');
  }

  // 公開API - BuildingManagerに委譲
  buildBuilding(type: BuildingType, position: Position) {
    return this.buildingManager.buildBuilding(type, position);
  }

  upgradeBuilding(buildingId: string) {
    return this.buildingManager.upgradeBuilding(buildingId);
  }

  demolishBuilding(buildingId: string) {
    return this.buildingManager.demolishBuilding(buildingId);
  }

  collectBuildingProduction(buildingId: string) {
    return this.buildingManager.collectBuildingProduction(buildingId);
  }

  getBuilding(id: string) {
    return this.buildingManager.getBuilding(id);
  }

  getAllBuildings() {
    return this.buildingManager.getAllBuildings();
  }

  getBuildingsByType(type: BuildingType) {
    return this.buildingManager.getBuildingsByType(type);
  }

  getBuildingsAt(position: Position) {
    return this.buildingManager.getBuildingsAt(position);
  }

  isBuildingAt(position: Position) {
    return this.buildingManager.isBuildingAt(position);
  }

  getTotalEffect() {
    return this.buildingManager.calculateTotalEffects();
  }

  printBaseStatus() {
    this.buildingManager.printBaseStatus();
  }

  // テスト用
  private createTestBuildings(): void {
    const testBuildings = [
      { type: 'house' as BuildingType, position: { x: 0, y: 0 } },
      { type: 'farm' as BuildingType, position: { x: 1, y: 0 } },
      { type: 'well' as BuildingType, position: { x: 2, y: 0 } }
    ];

    testBuildings.forEach(({ type, position }) => {
      const result = this.buildingManager.buildBuilding(type, position);
      if (result.success) {
        console.log(`テスト用建物を作成: ${type}`);
      }
    });
  }
}