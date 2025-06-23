import type { Position } from '../../core/types/common';

export type BuildingType = 
  | 'house'          // 家（居住）
  | 'kitchen'        // 調理場
  | 'forge'          // 鍛冶場
  | 'well'           // 井戸
  | 'storage'        // 倉庫
  | 'farm'           // 農場
  | 'fence'          // 柵（防衛）
  | 'watchtower'     // 監視塔
  | 'trap';          // 罠

export interface BuildingData {
  id: string;
  type: BuildingType;
  level: number;              // 1-5
  position: Position;
  
  // 状態
  health: number;             // 現在の耐久度
  maxHealth: number;          // 最大耐久度
  
  // アップグレード情報
  upgrading: BuildingUpgrade | null;
  
  // 生産情報（生産系建物のみ）
  production?: {
    currentAmount: number;    // 現在の保管量
    maxStorage: number;       // 最大保管量
    lastUpdate: number;       // 最後の更新時刻
  };
  
  // 作成時刻
  createdAt: number;
}

export interface BuildingUpgrade {
  targetLevel: number;
  cost: BuildingCost;
  duration: number;           // アップグレード時間（秒）
  startTime?: number;         // 開始時刻
}

export interface BuildingEffect {
  // 基本効果
  capacity?: number;           // 収容人数（家）
  storage?: number;           // 保管容量（倉庫）
  production?: {              // 生産量（農場、井戸）
    resourceType: string;
    rate: number;             // 1時間あたりの生産量
  };
  
  // 戦闘効果
  defense?: number;           // 防御力ボーナス
  earlyWarning?: number;      // 早期警戒（監視塔）
  trapDamage?: number;        // 罠ダメージ
  
  // 作業効率
  craftingSpeed?: number;     // 作成速度ボーナス（鍛冶場）
  cookingSpeed?: number;      // 調理速度ボーナス（調理場）
}

export interface BuildingCost {
  wood?: number;
  stone?: number;
  metal?: number;
  otherworld_currency?: number;
  wheat?: number;
  wheatSeeds?: number;
  [key: string]: number | undefined;
}