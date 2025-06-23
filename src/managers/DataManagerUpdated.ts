/**
 * 数式ベース計算対応のDataManager
 * レベルに応じた動的計算機能を提供
 */

import type { BuildingTemplate, BuildingType } from '../types/building';
import { FormulaCalculator, FormulaConfig } from './FormulaCalculator';
import buildingsData from '../data/buildings.json';

export interface ScalableGameData {
  buildings: Record<string, {
    id: string;
    name: string;
    description: string;
    category: string;
    maxLevel: number;
    baseStats: any;
    scaling: {
      cost: Record<string, FormulaConfig>;
      health: FormulaConfig;
      effect: Record<string, any>;
      upgradeDuration: FormulaConfig;
    };
  }>;
  categories: Record<string, any>;
  formulaExamples: Record<string, string>;
}

export class DataManager {
  private static instance: DataManager;
  private formulaCalculator: FormulaCalculator;
  private buildingData: ScalableGameData = { buildings: {}, categories: {}, formulaExamples: {} };
  private categories: Map<string, any> = new Map();

  // レベル別計算結果のキャッシュ
  private calculationCache: Map<string, Map<number, any>> = new Map();

  private constructor() {
    this.formulaCalculator = FormulaCalculator.getInstance();
    this.loadData();
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * データの読み込み
   */
  private loadData(): void {
    this.buildingData = buildingsData as ScalableGameData;
    
    // カテゴリデータの読み込み
    Object.entries(this.buildingData.categories).forEach(([categoryId, categoryData]) => {
      this.categories.set(categoryId, categoryData);
    });

    console.log(`Loaded ${Object.keys(this.buildingData.buildings).length} scalable building templates`);
    
    // 数式の検証とデバッグ情報出力
    if (process.env.NODE_ENV === 'development') {
      this.validateFormulas();
    }
  }

  /**
   * 建物の基本情報取得
   */
  getBuildingTemplate(buildingType: BuildingType): BuildingTemplate | undefined {
    const data = this.buildingData.buildings[buildingType];
    if (!data) return undefined;

    // 動的にBuildingTemplateを生成（レベル1のデータで代表値を作成）
    return {
      type: buildingType,
      name: data.name,
      description: data.description,
      category: data.category,
      maxLevel: data.maxLevel,
      levels: this.generateLevelsForTemplate(buildingType)
    };
  }

  /**
   * 建物のレベル別データ生成
   */
  private generateLevelsForTemplate(buildingType: BuildingType): Record<number, any> {
    const data = this.buildingData.buildings[buildingType];
    if (!data) return {};

    const levels: Record<number, any> = {};
    
    // レベル1から最大レベルまでの値を計算
    for (let level = 1; level <= data.maxLevel; level++) {
      levels[level] = this.calculateLevelData(buildingType, level);
    }
    
    return levels;
  }

  /**
   * 指定レベルでの建物データ計算
   */
  calculateLevelData(buildingType: BuildingType, level: number): any {
    const cacheKey = `${buildingType}_${level}`;
    
    // キャッシュから取得を試行
    const cached = this.calculationCache.get(cacheKey);
    if (cached) {
      return cached.get(level);
    }

    const data = this.buildingData.buildings[buildingType];
    if (!data) return null;

    const scaling = data.scaling;
    
    // コストの計算
    const cost: Record<string, number> = {};
    Object.entries(scaling.cost).forEach(([resource, config]) => {
      cost[resource] = this.formulaCalculator.calculate(config, level);
    });

    // 体力の計算
    const health = this.formulaCalculator.calculate(scaling.health, level);

    // 効果の計算
    const effect: any = {};
    Object.entries(scaling.effect).forEach(([effectKey, effectConfig]) => {
      if (effectKey === 'production' && typeof effectConfig === 'object' && effectConfig.rate) {
        // 生産効果の特別処理
        effect[effectKey] = {
          resourceType: effectConfig.resourceType,
          rate: this.formulaCalculator.calculate(effectConfig.rate, level)
        };
      } else if (typeof effectConfig === 'object' && effectConfig.formula) {
        // 一般的な効果
        effect[effectKey] = this.formulaCalculator.calculate(effectConfig, level);
      } else {
        effect[effectKey] = effectConfig;
      }
    });

    // アップグレード時間の計算
    const upgradeDuration = this.formulaCalculator.calculate(scaling.upgradeDuration, level);

    const levelData = {
      cost,
      health,
      effect,
      upgradeDuration
    };

    // キャッシュに保存
    if (!this.calculationCache.has(cacheKey)) {
      this.calculationCache.set(cacheKey, new Map());
    }
    this.calculationCache.get(cacheKey)!.set(level, levelData);

    return levelData;
  }

  /**
   * 建物の指定レベルでのコスト取得
   */
  getBuildingCost(buildingType: BuildingType, level: number): Record<string, number> {
    const levelData = this.calculateLevelData(buildingType, level);
    return levelData?.cost || {};
  }

  /**
   * 建物の指定レベルでの効果取得
   */
  getBuildingEffect(buildingType: BuildingType, level: number): any {
    const levelData = this.calculateLevelData(buildingType, level);
    return levelData?.effect || {};
  }

  /**
   * 建物の指定レベルでの体力取得
   */
  getBuildingHealth(buildingType: BuildingType, level: number): number {
    const levelData = this.calculateLevelData(buildingType, level);
    return levelData?.health || 100;
  }

  /**
   * 建物のアップグレード時間取得
   */
  getBuildingUpgradeDuration(buildingType: BuildingType, level: number): number {
    const levelData = this.calculateLevelData(buildingType, level);
    return levelData?.upgradeDuration || 3600;
  }

  /**
   * 建物の次レベルコスト取得（アップグレードコスト）
   */
  getBuildingUpgradeCost(buildingType: BuildingType, currentLevel: number): Record<string, number> {
    const data = this.buildingData.buildings[buildingType];
    if (!data || currentLevel >= data.maxLevel) {
      return {};
    }
    
    return this.getBuildingCost(buildingType, currentLevel + 1);
  }

  /**
   * 建物のアップグレード可能性チェック
   */
  canUpgradeBuilding(buildingType: BuildingType, currentLevel: number): boolean {
    const data = this.buildingData.buildings[buildingType];
    return data ? currentLevel < data.maxLevel : false;
  }

  /**
   * すべての建物タイプの取得
   */
  getAllBuildingTypes(): BuildingType[] {
    return Object.keys(this.buildingData.buildings) as BuildingType[];
  }

  /**
   * カテゴリ別建物の取得
   */
  getBuildingsByCategory(category: string): BuildingType[] {
    return Object.entries(this.buildingData.buildings)
      .filter(([_, data]) => data.category === category)
      .map(([buildingType, _]) => buildingType as BuildingType);
  }

  /**
   * 建物の基本情報取得
   */
  getBuildingInfo(buildingType: BuildingType): { name: string; description: string; category: string; maxLevel: number } | undefined {
    const data = this.buildingData.buildings[buildingType];
    if (!data) return undefined;

    return {
      name: data.name,
      description: data.description,
      category: data.category,
      maxLevel: data.maxLevel
    };
  }

  /**
   * レベル範囲でのコスト推移取得
   */
  getBuildingCostProgression(buildingType: BuildingType, minLevel: number = 1, maxLevel?: number): Map<number, Record<string, number>> {
    const data = this.buildingData.buildings[buildingType];
    if (!data) return new Map();

    const endLevel = Math.min(maxLevel || data.maxLevel, data.maxLevel);
    const progression = new Map<number, Record<string, number>>();

    for (let level = minLevel; level <= endLevel; level++) {
      progression.set(level, this.getBuildingCost(buildingType, level));
    }

    return progression;
  }

  /**
   * レベル範囲での効果推移取得
   */
  getBuildingEffectProgression(buildingType: BuildingType, minLevel: number = 1, maxLevel?: number): Map<number, any> {
    const data = this.buildingData.buildings[buildingType];
    if (!data) return new Map();

    const endLevel = Math.min(maxLevel || data.maxLevel, data.maxLevel);
    const progression = new Map<number, any>();

    for (let level = minLevel; level <= endLevel; level++) {
      progression.set(level, this.getBuildingEffect(buildingType, level));
    }

    return progression;
  }

  /**
   * カテゴリ情報取得
   */
  getCategory(categoryId: string): any {
    return this.categories.get(categoryId);
  }

  getAllCategories(): Map<string, any> {
    return new Map(this.categories);
  }

  /**
   * 数式の検証（開発用）
   */
  private validateFormulas(): void {
    console.log('=== Building Formula Validation ===');
    
    Object.entries(this.buildingData.buildings).forEach(([buildingType, data]) => {
      console.log(`\n${buildingType} (${data.name}):`);
      
      // コスト数式の検証
      Object.entries(data.scaling.cost).forEach(([resource, config]) => {
        const analysis = this.formulaCalculator.analyzeFormula(config, data.maxLevel);
        console.log(`  ${resource} cost: ${config.formula} (max: ${analysis.maxValue})`);
        analysis.warnings.forEach(warning => console.warn(`    ⚠️ ${warning}`));
      });
      
      // 効果数式の検証
      Object.entries(data.scaling.effect).forEach(([effectKey, effectConfig]) => {
        if (typeof effectConfig === 'object' && effectConfig.formula) {
          const analysis = this.formulaCalculator.analyzeFormula(effectConfig, data.maxLevel);
          console.log(`  ${effectKey} effect: ${effectConfig.formula} (max: ${analysis.maxValue})`);
          analysis.warnings.forEach(warning => console.warn(`    ⚠️ ${warning}`));
        }
      });
    });
  }

  /**
   * デバッグ用：特定建物のレベル別データ表示
   */
  debugBuildingProgression(buildingType: BuildingType, levels: number[] = [1, 5, 10, 25, 50, 100]): void {
    const data = this.buildingData.buildings[buildingType];
    if (!data) {
      console.error(`Building type ${buildingType} not found`);
      return;
    }

    console.log(`=== ${data.name} (${buildingType}) Progression ===`);
    console.log('Level | Cost | Effect | Health | Upgrade Time');
    console.log('------|------|--------|--------|-------------');

    levels.forEach(level => {
      if (level <= data.maxLevel) {
        const levelData = this.calculateLevelData(buildingType, level);
        const costStr = Object.entries(levelData.cost)
          .map(([res, amt]) => `${res}:${amt}`)
          .join(', ');
        const effectStr = Object.entries(levelData.effect)
          .map(([eff, val]) => `${eff}:${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join(', ');
        
        console.log(`${level.toString().padStart(5)} | ${costStr.substring(0, 20).padEnd(20)} | ${effectStr.substring(0, 25).padEnd(25)} | ${levelData.health.toString().padStart(6)} | ${levelData.upgradeDuration}`);
      }
    });
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.calculationCache.clear();
  }

  /**
   * データ統計情報
   */
  getStats(): {
    totalBuildings: number;
    buildingsByCategory: Record<string, number>;
    totalCategories: number;
    cacheSize: number;
  } {
    const buildingsByCategory: Record<string, number> = {};
    
    Object.values(this.buildingData.buildings).forEach(building => {
      buildingsByCategory[building.category] = (buildingsByCategory[building.category] || 0) + 1;
    });

    return {
      totalBuildings: Object.keys(this.buildingData.buildings).length,
      buildingsByCategory,
      totalCategories: this.categories.size,
      cacheSize: this.calculationCache.size
    };
  }
}