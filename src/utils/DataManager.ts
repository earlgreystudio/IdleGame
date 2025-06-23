/**
 * データ駆動システムの管理クラス
 * JSONファイルからゲームデータを読み込み、統一されたインターフェースを提供
 */

import type { BuildingTemplate, BuildingType } from '../types/building';
import buildingsData from '../data/buildings.json';

export interface GameDataStructure {
  buildings: Record<string, any>;
  categories: Record<string, any>;
}

export class DataManager {
  private static instance: DataManager;
  private buildingTemplates: Map<BuildingType, BuildingTemplate> = new Map();
  private categories: Map<string, any> = new Map();

  private constructor() {
    this.loadBuildingData();
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 建物データの読み込み
   */
  private loadBuildingData(): void {
    const data = buildingsData as GameDataStructure;
    
    // 建物テンプレートの変換
    Object.entries(data.buildings).forEach(([buildingId, buildingData]) => {
      const template: BuildingTemplate = {
        type: buildingId as BuildingType,
        name: buildingData.name,
        description: buildingData.description,
        category: buildingData.category,
        maxLevel: buildingData.maxLevel,
        levels: this.convertLevelData(buildingData.levels)
      };
      
      this.buildingTemplates.set(buildingId as BuildingType, template);
    });

    // カテゴリデータの読み込み
    Object.entries(data.categories).forEach(([categoryId, categoryData]) => {
      this.categories.set(categoryId, categoryData);
    });

    console.log(`Loaded ${this.buildingTemplates.size} building templates`);
  }

  /**
   * レベルデータの変換
   */
  private convertLevelData(levelsData: any): Record<number, any> {
    const levels: Record<number, any> = {};
    
    Object.entries(levelsData).forEach(([level, data]: [string, any]) => {
      levels[parseInt(level)] = {
        cost: data.cost || {},
        health: data.health || 100,
        effect: data.effect || {},
        upgradeDuration: data.upgradeDuration || 0
      };
    });

    return levels;
  }

  /**
   * 建物テンプレートの取得
   */
  getBuildingTemplate(buildingType: BuildingType): BuildingTemplate | undefined {
    return this.buildingTemplates.get(buildingType);
  }

  /**
   * すべての建物テンプレートの取得
   */
  getAllBuildingTemplates(): Map<BuildingType, BuildingTemplate> {
    return new Map(this.buildingTemplates);
  }

  /**
   * カテゴリ別の建物テンプレート取得
   */
  getBuildingsByCategory(category: string): BuildingTemplate[] {
    return Array.from(this.buildingTemplates.values())
      .filter(template => template.category === category);
  }

  /**
   * 建物の基本コスト取得
   */
  getBuildingBaseCost(buildingType: BuildingType): Record<string, number> {
    const template = this.getBuildingTemplate(buildingType);
    const cost = template?.levels[1]?.cost || {};
    const result: Record<string, number> = {};
    
    Object.entries(cost).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * 建物の指定レベルコスト取得
   */
  getBuildingCost(buildingType: BuildingType, level: number): Record<string, number> {
    const template = this.getBuildingTemplate(buildingType);
    const cost = template?.levels[level]?.cost || {};
    const result: Record<string, number> = {};
    
    Object.entries(cost).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * 建物のアップグレードコスト取得
   */
  getBuildingUpgradeCost(buildingType: BuildingType, currentLevel: number): Record<string, number> {
    return this.getBuildingCost(buildingType, currentLevel + 1);
  }

  /**
   * レベルデータ計算
   */
  calculateLevelData(buildingType: BuildingType, level: number): any {
    return this.getBuildingLevelData(buildingType, level);
  }

  /**
   * 建物効果取得
   */
  getBuildingEffect(buildingType: BuildingType, level: number): any {
    const levelData = this.getBuildingLevelData(buildingType, level);
    return levelData?.effect || {};
  }

  /**
   * 建物の指定レベルデータ取得
   */
  getBuildingLevelData(buildingType: BuildingType, level: number): any {
    const template = this.getBuildingTemplate(buildingType);
    return template?.levels[level];
  }

  /**
   * 建物の次レベルデータ取得
   */
  getBuildingNextLevelData(buildingType: BuildingType, currentLevel: number): any {
    const template = this.getBuildingTemplate(buildingType);
    const nextLevel = currentLevel + 1;
    
    if (template && nextLevel <= template.maxLevel) {
      return template.levels[nextLevel];
    }
    
    return null;
  }

  /**
   * アップグレード可能かチェック
   */
  canUpgradeBuilding(buildingType: BuildingType, currentLevel: number): boolean {
    const template = this.getBuildingTemplate(buildingType);
    return template ? currentLevel < template.maxLevel : false;
  }

  /**
   * 建物効果の計算
   */
  calculateBuildingEffect(buildingType: BuildingType, level: number): any {
    const levelData = this.getBuildingLevelData(buildingType, level);
    return levelData?.effect || {};
  }

  /**
   * アップグレードコストの計算
   */
  calculateUpgradeCost(buildingType: BuildingType, currentLevel: number): Record<string, number> {
    const nextLevelData = this.getBuildingNextLevelData(buildingType, currentLevel);
    return nextLevelData?.cost || {};
  }

  /**
   * カテゴリ情報の取得
   */
  getCategory(categoryId: string): any {
    return this.categories.get(categoryId);
  }

  /**
   * すべてのカテゴリの取得
   */
  getAllCategories(): Map<string, any> {
    return new Map(this.categories);
  }

  /**
   * 建物タイプの一覧取得
   */
  getAllBuildingTypes(): BuildingType[] {
    return Array.from(this.buildingTemplates.keys());
  }

  /**
   * 建物の検索
   */
  searchBuildings(query: string): BuildingTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.buildingTemplates.values())
      .filter(template => 
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery)
      );
  }

  /**
   * データの再読み込み（開発用）
   */
  reload(): void {
    this.buildingTemplates.clear();
    this.categories.clear();
    this.loadBuildingData();
  }

  /**
   * データ統計の取得（デバッグ用）
   */
  getDataStats(): {
    totalBuildings: number;
    buildingsByCategory: Record<string, number>;
    totalCategories: number;
  } {
    const buildingsByCategory: Record<string, number> = {};
    
    this.buildingTemplates.forEach(template => {
      buildingsByCategory[template.category] = (buildingsByCategory[template.category] || 0) + 1;
    });

    return {
      totalBuildings: this.buildingTemplates.size,
      buildingsByCategory,
      totalCategories: this.categories.size
    };
  }
}