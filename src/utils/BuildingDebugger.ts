/**
 * 建物システムのデバッグ・テスト用ユーティリティ
 */

import { DataManager } from '../managers/DataManagerUpdated';
import { FormulaCalculator } from '../managers/FormulaCalculator';
import type { BuildingType } from '../types/building';

export class BuildingDebugger {
  private dataManager: DataManager;
  private formulaCalculator: FormulaCalculator;

  constructor() {
    this.dataManager = DataManager.getInstance();
    this.formulaCalculator = FormulaCalculator.getInstance();
  }

  /**
   * 全建物の指定レベルでのデータを表示
   */
  debugAllBuildings(level: number = 1): void {
    console.log(`=== All Buildings at Level ${level} ===`);
    
    const buildingTypes = this.dataManager.getAllBuildingTypes();
    
    buildingTypes.forEach(buildingType => {
      const info = this.dataManager.getBuildingInfo(buildingType);
      const cost = this.dataManager.getBuildingCost(buildingType, level);
      const effect = this.dataManager.getBuildingEffect(buildingType, level);
      const health = this.dataManager.getBuildingHealth(buildingType, level);
      
      console.log(`\n${info?.name} (${buildingType}):`);
      console.log(`  Cost: ${JSON.stringify(cost)}`);
      console.log(`  Effect: ${JSON.stringify(effect)}`);
      console.log(`  Health: ${health}`);
    });
  }

  /**
   * 特定建物のレベル進行を表示
   */
  debugBuildingProgression(buildingType: BuildingType, levels: number[] = [1, 5, 10, 25, 50, 100]): void {
    this.dataManager.debugBuildingProgression(buildingType, levels);
  }

  /**
   * 数式のテスト
   */
  testFormulas(): void {
    console.log('=== Formula Testing ===');
    
    const testCases = [
      { formula: 'base * level', base: 50, levels: [1, 5, 10] },
      { formula: 'base * level * level', base: 50, levels: [1, 5, 10] },
      { formula: 'base + level', base: 1, levels: [1, 5, 10] },
      { formula: 'base * (1 + level * 0.5)', base: 100, levels: [1, 5, 10] },
      { formula: '1 + (base * level * 0.1)', base: 2, levels: [1, 5, 10] }
    ];

    testCases.forEach(testCase => {
      console.log(`\nFormula: ${testCase.formula}, Base: ${testCase.base}`);
      testCase.levels.forEach(level => {
        const result = this.formulaCalculator.calculate(testCase, level);
        console.log(`  Level ${level}: ${result}`);
      });
    });
  }

  /**
   * 畑の例を詳細表示
   */
  debugFarmExample(): void {
    console.log('=== Farm Example (Wheat Production) ===');
    
    const levels = [1, 5, 10, 25, 50, 100];
    
    console.log('Level | Wood Cost | Seed Cost | Wheat/hour | Storage | Health');
    console.log('------|-----------|-----------|------------|---------|-------');
    
    levels.forEach(level => {
      const cost = this.dataManager.getBuildingCost('farm', level);
      const effect = this.dataManager.getBuildingEffect('farm', level);
      const health = this.dataManager.getBuildingHealth('farm', level);
      
      console.log(
        `${level.toString().padStart(5)} | ` +
        `${(cost.wood || 0).toString().padStart(9)} | ` +
        `${(cost.wheatSeeds || 0).toString().padStart(9)} | ` +
        `${(effect.production?.rate || 0).toString().padStart(10)} | ` +
        `${(effect.storage || 0).toString().padStart(7)} | ` +
        `${health.toString().padStart(6)}`
      );
    });
  }

  /**
   * アップグレードコストの推移を表示
   */
  debugUpgradeCosts(buildingType: BuildingType, maxLevel: number = 20): void {
    console.log(`=== ${buildingType} Upgrade Costs ===`);
    
    console.log('Current Level | Upgrade Cost | Total Cost');
    console.log('--------------|--------------|----------');
    
    let totalCost: Record<string, number> = {};
    
    for (let level = 1; level < maxLevel; level++) {
      const upgradeCost = this.dataManager.getBuildingUpgradeCost(buildingType, level);
      
      // 累積コストの計算
      Object.entries(upgradeCost).forEach(([resource, amount]) => {
        totalCost[resource] = (totalCost[resource] || 0) + amount;
      });
      
      const upgradeCostStr = Object.entries(upgradeCost)
        .map(([res, amt]) => `${res}:${amt}`)
        .join(', ');
      
      const totalCostStr = Object.entries(totalCost)
        .map(([res, amt]) => `${res}:${amt}`)
        .join(', ');
      
      console.log(
        `${level.toString().padStart(13)} | ` +
        `${upgradeCostStr.padEnd(12)} | ` +
        `${totalCostStr}`
      );
    }
  }

  /**
   * バランス分析
   */
  analyzeBalance(): void {
    console.log('=== Balance Analysis ===');
    
    const buildingTypes = this.dataManager.getAllBuildingTypes();
    
    buildingTypes.forEach(buildingType => {
      const info = this.dataManager.getBuildingInfo(buildingType);
      console.log(`\n${info?.name} (${buildingType}):`);
      
      // レベル100での値
      const maxCost = this.dataManager.getBuildingCost(buildingType, 100);
      const maxEffect = this.dataManager.getBuildingEffect(buildingType, 100);
      
      console.log(`  Max Level Cost: ${JSON.stringify(maxCost)}`);
      console.log(`  Max Level Effect: ${JSON.stringify(maxEffect)}`);
      
      // コストパフォーマンス分析（効果/コスト）
      const primaryResource = Object.keys(maxCost)[0];
      const primaryCost = maxCost[primaryResource] || 1;
      
      if (maxEffect.production?.rate) {
        const efficiency = maxEffect.production.rate / primaryCost;
        console.log(`  Production Efficiency: ${efficiency.toFixed(4)} per ${primaryResource}`);
      }
      
      if (maxEffect.capacity) {
        const efficiency = maxEffect.capacity / primaryCost;
        console.log(`  Capacity Efficiency: ${efficiency.toFixed(4)} per ${primaryResource}`);
      }
    });
  }

  /**
   * 統計情報表示
   */
  showStats(): void {
    console.log('=== System Statistics ===');
    
    const stats = this.dataManager.getStats();
    console.log(`Total Buildings: ${stats.totalBuildings}`);
    console.log(`Total Categories: ${stats.totalCategories}`);
    console.log(`Cache Size: ${stats.cacheSize}`);
    
    console.log('\nBuildings by Category:');
    Object.entries(stats.buildingsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
  }

  /**
   * ゲーム内でのデバッグコマンド用
   */
  setupDebugCommands(): void {
    // グローバルなデバッグ関数を設定
    if (typeof window !== 'undefined') {
      (window as any).debugBuildings = {
        all: (level: number = 1) => this.debugAllBuildings(level),
        progression: (building: BuildingType, levels?: number[]) => this.debugBuildingProgression(building, levels),
        formulas: () => this.testFormulas(),
        farm: () => this.debugFarmExample(),
        upgrades: (building: BuildingType, maxLevel?: number) => this.debugUpgradeCosts(building, maxLevel),
        balance: () => this.analyzeBalance(),
        stats: () => this.showStats(),
        help: () => {
          console.log('Available debug commands:');
          console.log('  debugBuildings.all(level) - Show all buildings at level');
          console.log('  debugBuildings.progression(buildingType, levels) - Show progression');
          console.log('  debugBuildings.formulas() - Test formulas');
          console.log('  debugBuildings.farm() - Show farm example');
          console.log('  debugBuildings.upgrades(buildingType, maxLevel) - Show upgrade costs');
          console.log('  debugBuildings.balance() - Analyze balance');
          console.log('  debugBuildings.stats() - Show statistics');
        }
      };
      
      console.log('Debug commands available: debugBuildings.help()');
    }
  }
}

// 開発環境でのみデバッグコマンドを有効化
if (process.env.NODE_ENV === 'development' || (import.meta as any).env?.DEV) {
  const buildingDebugger = new BuildingDebugger();
  buildingDebugger.setupDebugCommands();
}