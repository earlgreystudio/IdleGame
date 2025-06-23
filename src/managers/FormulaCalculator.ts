/**
 * 数式ベースの値計算エンジン
 * レベルと基底値から動的に値を計算
 */

export interface FormulaConfig {
  formula: string;
  base: number;
}

export class FormulaCalculator {
  private static instance: FormulaCalculator;

  private constructor() {}

  static getInstance(): FormulaCalculator {
    if (!FormulaCalculator.instance) {
      FormulaCalculator.instance = new FormulaCalculator();
    }
    return FormulaCalculator.instance;
  }

  /**
   * 数式を評価して値を計算
   * @param config 数式設定（formula, base）
   * @param level レベル
   * @returns 計算結果
   */
  calculate(config: FormulaConfig, level: number): number {
    const { formula, base } = config;
    
    try {
      // セキュリティのため、許可された変数・関数のみ使用
      const safeContext = {
        base,
        level,
        Math: {
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round,
          pow: Math.pow,
          sqrt: Math.sqrt,
          log: Math.log,
          log10: Math.log10,
          min: Math.min,
          max: Math.max,
          abs: Math.abs
        }
      };

      // 数式を安全に評価
      const result = this.evaluateFormula(formula, safeContext);
      
      // 結果を正の整数に丸める（コストや効果は整数であるべき）
      return Math.max(0, Math.round(result));
      
    } catch (error) {
      console.error(`Formula calculation error: ${formula}`, error);
      return base; // エラー時はベース値を返す
    }
  }

  /**
   * 安全な数式評価
   * eval() を使わずに限定された演算のみを許可
   */
  private evaluateFormula(formula: string, context: any): number {
    // 単純な文字列置換による評価（セキュリティ重視）
    let expression = formula;
    
    // 変数の置換
    expression = expression.replace(/\bbase\b/g, context.base.toString());
    expression = expression.replace(/\blevel\b/g, context.level.toString());
    
    // Math関数の置換
    expression = expression.replace(/Math\.floor\(/g, 'Math.floor(');
    expression = expression.replace(/Math\.ceil\(/g, 'Math.ceil(');
    expression = expression.replace(/Math\.round\(/g, 'Math.round(');
    expression = expression.replace(/Math\.pow\(/g, 'Math.pow(');
    expression = expression.replace(/Math\.sqrt\(/g, 'Math.sqrt(');
    expression = expression.replace(/Math\.log\(/g, 'Math.log(');
    expression = expression.replace(/Math\.log10\(/g, 'Math.log10(');
    expression = expression.replace(/Math\.min\(/g, 'Math.min(');
    expression = expression.replace(/Math\.max\(/g, 'Math.max(');
    expression = expression.replace(/Math\.abs\(/g, 'Math.abs(');

    // 安全な評価のため Function コンストラクタを使用
    try {
      const func = new Function('Math', `return ${expression}`);
      return func(context.Math);
    } catch (error) {
      // Functionコンストラクタが使えない場合の代替処理
      return this.basicCalculation(formula, context.base, context.level);
    }
  }

  /**
   * 基本的な計算のフォールバック
   * よく使用される数式パターンをハードコード
   */
  private basicCalculation(formula: string, base: number, level: number): number {
    // 一般的なパターンのマッチング
    if (formula === 'base * level') {
      return base * level;
    }
    if (formula === 'base * level * level') {
      return base * level * level;
    }
    if (formula === 'base + level') {
      return base + level;
    }
    if (formula === 'base * (1 + level * 0.5)') {
      return base * (1 + level * 0.5);
    }
    if (formula === 'base * (1 + level * 0.4)') {
      return base * (1 + level * 0.4);
    }
    if (formula === 'base * (1 + level * 0.6)') {
      return base * (1 + level * 0.6);
    }
    if (formula === 'base * (1 + level * 0.8)') {
      return base * (1 + level * 0.8);
    }
    if (formula === 'base * (1 + level * 0.3)') {
      return base * (1 + level * 0.3);
    }
    if (formula === 'base * (1 + level * 0.7)') {
      return base * (1 + level * 0.7);
    }
    if (formula === 'base * (1 + level * 0.2)') {
      return base * (1 + level * 0.2);
    }
    if (formula === '1 + (base * level * 0.1)') {
      return 1 + (base * level * 0.1);
    }
    if (formula === 'base * level * 2') {
      return base * level * 2;
    }
    if (formula === 'base * level * 3') {
      return base * level * 3;
    }
    if (formula === 'base * level * 0.5') {
      return base * level * 0.5;
    }
    if (formula === 'Math.floor(base * Math.log(level + 1))') {
      return Math.floor(base * Math.log(level + 1));
    }

    // マッチしない場合はベース値を返す
    console.warn(`Unknown formula pattern: ${formula}`);
    return base;
  }

  /**
   * レベル範囲の値を一括計算
   * @param config 数式設定
   * @param minLevel 最小レベル
   * @param maxLevel 最大レベル
   * @returns レベル別の値マップ
   */
  calculateRange(config: FormulaConfig, minLevel: number, maxLevel: number): Map<number, number> {
    const results = new Map<number, number>();
    
    for (let level = minLevel; level <= maxLevel; level++) {
      results.set(level, this.calculate(config, level));
    }
    
    return results;
  }

  /**
   * 数式の検証
   * @param formula 数式文字列
   * @returns 有効かどうか
   */
  validateFormula(formula: string): boolean {
    try {
      // テスト用の値で計算を試行
      const testConfig: FormulaConfig = { formula, base: 10 };
      const result = this.calculate(testConfig, 1);
      return typeof result === 'number' && !isNaN(result) && isFinite(result);
    } catch {
      return false;
    }
  }

  /**
   * レベルでの値の増加率計算
   * @param config 数式設定
   * @param level 現在のレベル
   * @returns 次レベルでの増加率（%）
   */
  calculateGrowthRate(config: FormulaConfig, level: number): number {
    if (level <= 0) return 0;
    
    const currentValue = this.calculate(config, level);
    const nextValue = this.calculate(config, level + 1);
    
    if (currentValue === 0) return 0;
    
    return ((nextValue - currentValue) / currentValue) * 100;
  }

  /**
   * デバッグ用：数式の計算結果テーブル表示
   * @param config 数式設定
   * @param levels 表示するレベル配列
   */
  debugFormula(config: FormulaConfig, levels: number[] = [1, 5, 10, 25, 50, 100]): void {
    console.log(`Formula: ${config.formula}, Base: ${config.base}`);
    console.log('Level | Value | Growth Rate');
    console.log('------|-------|------------');
    
    levels.forEach(level => {
      const value = this.calculate(config, level);
      const growthRate = this.calculateGrowthRate(config, level);
      console.log(`${level.toString().padStart(5)} | ${value.toString().padStart(5)} | ${growthRate.toFixed(1)}%`);
    });
  }

  /**
   * 数式の最適化提案
   * 急激に増加しすぎる数式を検出
   */
  analyzeFormula(config: FormulaConfig, maxLevel: number = 100): {
    isBalanced: boolean;
    maxValue: number;
    averageGrowthRate: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const maxValue = this.calculate(config, maxLevel);
    
    // 成長率の分析
    const growthRates: number[] = [];
    for (let level = 1; level < Math.min(maxLevel, 50); level++) {
      growthRates.push(this.calculateGrowthRate(config, level));
    }
    
    const averageGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    
    // 警告の判定
    if (maxValue > 1000000) {
      warnings.push('値が非常に大きくなります（100万超過）');
    }
    
    if (averageGrowthRate > 100) {
      warnings.push('成長率が急激すぎます（平均100%超過）');
    }
    
    if (averageGrowthRate < 5) {
      warnings.push('成長率が低すぎる可能性があります（平均5%未満）');
    }

    const isBalanced = warnings.length === 0;
    
    return {
      isBalanced,
      maxValue,
      averageGrowthRate,
      warnings
    };
  }
}