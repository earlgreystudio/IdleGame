export type GameTime = {
  year: number;
  season: number; // 0-3 (春夏秋冬)
  day: number; // 1-30
  hour: number; // 0-23
};

export type Resource = {
  id: string;
  name: string;
  amount: number;
  max?: number;
};

export type Position = {
  x: number;
  y: number;
};

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'tool';

export type EquipmentSlot = 'chest' | 'legs' | 'head' | 'arms' | 'feet' | 'accessory1' | 'accessory2';

export type Gender = 'male' | 'female';

export type Club = 
  | '野球部' | '剣道部' | '化学部' | 'アーチェリー部' | '空手部' | 'アメフト部'
  | 'ゴルフ部' | '陸上部' | '演劇部' | '茶道部' | '馬術部' | 'ロボット研究会'
  | '園芸部' | '天文部' | '卓球部' | 'バスケ部' | 'バドミントン部' | 'テニス部'
  | 'バレー部' | 'サッカー部' | '相撲部' | '料理部';

export type SkillType = 
  | '片手武器' | '両手武器' | '長柄武器' | '弓' | '射撃' | '盾' | '解錠' | '水泳'
  | '工学' | '化学' | '農業' | '料理' | '裁縫' | '建築' | '調教' | 'サバイバル'
  | '工作' | '機械' | '釣り' | '医学' | '楽器';

export type TaskType = 
  | 'idle' | 'explore' | 'combat' | 'gather' | 'craft' | 'build' | 'cook' 
  | 'rest' | 'train' | 'defend' | 'flee' | 'trade' | 'farm' | 'fish';

export type DamageType = 'physical' | 'magical' | 'true';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';