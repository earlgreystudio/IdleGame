import type { Position } from '../../core/types/common';

export type BuildingType = 
  | '倉庫' 
  | '作業場' 
  | '研究所' 
  | '農地' 
  | '宿舎' 
  | '訓練場' 
  | '食堂' 
  | '図書館';

export interface BuildingData {
  id: string;
  type: BuildingType;
  position: Position;
  level: number;
  lastUpgradeTime: number;
  isActive: boolean;
  efficiency: number;
}