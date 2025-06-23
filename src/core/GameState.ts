import type { GameTime, Resource } from '../types/common';
import { EventBus, GameEvents } from './EventBus';

interface SaveData {
  version: string;
  gameTime: GameTime;
  resources: Resource[];
  lastSaveTime: number;
  lastPlayTime: number;
}

export class GameState {
  private static instance: GameState;
  private eventBus: EventBus;
  
  private _isPaused: boolean = false;
  private _gameTime: GameTime = {
    year: 1,
    season: 0,
    day: 1,
    hour: 6
  };
  
  private _resources: Map<string, Resource> = new Map();
  private _lastSaveTime: number = Date.now();
  private _lastPlayTime: number = Date.now();

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.initializeResources();
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  private initializeResources(): void {
    const initialResources: Resource[] = [
      { id: 'yen', name: '円', amount: 10000 },
      { id: 'otherworld_currency', name: '異世界通貨', amount: 100 },
      { id: 'food', name: '食料', amount: 50, max: 1000 },
      { id: 'water', name: '水', amount: 50, max: 1000 },
      { id: 'wood', name: '木材', amount: 200, max: 2000 },
      { id: 'stone', name: '石材', amount: 100, max: 1000 },
      { id: 'metal', name: '金属', amount: 50, max: 500 },
      { id: 'wheat', name: '小麦', amount: 0, max: 1000 },
      { id: 'wheatSeeds', name: '小麦の種', amount: 10, max: 100 }
    ];

    initialResources.forEach(resource => {
      this._resources.set(resource.id, resource);
    });
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get gameTime(): Readonly<GameTime> {
    return { ...this._gameTime };
  }

  get resources(): ReadonlyMap<string, Resource> {
    return new Map(this._resources);
  }

  pause(): void {
    if (!this._isPaused) {
      this._isPaused = true;
      this.eventBus.emit(GameEvents.GAME_PAUSE);
    }
  }

  resume(): void {
    if (this._isPaused) {
      this._isPaused = false;
      this.eventBus.emit(GameEvents.GAME_RESUME);
    }
  }

  addResource(resourceId: string, amount: number): boolean {
    const resource = this._resources.get(resourceId);
    if (!resource) return false;

    const oldAmount = resource.amount;
    const newAmount = resource.max 
      ? Math.min(resource.amount + amount, resource.max)
      : resource.amount + amount;
    
    if (newAmount < 0) return false;

    resource.amount = newAmount;
    const actualGain = newAmount - oldAmount;

    if (actualGain !== 0) {
      this.eventBus.emit(GameEvents.RESOURCE_GAIN, {
        resourceId,
        amount: actualGain,
        total: newAmount
      });
    }

    return true;
  }

  removeResource(resourceId: string, amount: number): boolean {
    return this.addResource(resourceId, -amount);
  }

  hasResource(resourceId: string, amount: number): boolean {
    const resource = this._resources.get(resourceId);
    return resource ? resource.amount >= amount : false;
  }

  getResourceAmount(resourceId: string): number {
    const resource = this._resources.get(resourceId);
    return resource ? resource.amount : 0;
  }

  setGameTime(time: Partial<GameTime>): void {
    const oldTime = { ...this._gameTime };
    this._gameTime = { ...this._gameTime, ...time };
    
    // 時間変更イベントを発火
    if (oldTime.hour !== this._gameTime.hour) {
      this.eventBus.emit(GameEvents.TIME_HOUR, this._gameTime);
    }
    if (oldTime.day !== this._gameTime.day) {
      this.eventBus.emit(GameEvents.TIME_DAY, this._gameTime);
    }
    if (oldTime.season !== this._gameTime.season) {
      this.eventBus.emit(GameEvents.TIME_SEASON, this._gameTime);
    }
  }

  save(): SaveData {
    const saveData: SaveData = {
      version: '1.0.0',
      gameTime: { ...this._gameTime },
      resources: Array.from(this._resources.values()),
      lastSaveTime: Date.now(),
      lastPlayTime: this._lastPlayTime
    };

    this._lastSaveTime = saveData.lastSaveTime;
    localStorage.setItem('idlegame_save', JSON.stringify(saveData));
    this.eventBus.emit(GameEvents.GAME_SAVE, saveData);

    return saveData;
  }

  load(): boolean {
    try {
      const savedData = localStorage.getItem('idlegame_save');
      if (!savedData) return false;

      const saveData: SaveData = JSON.parse(savedData);
      
      // バージョンチェック
      if (saveData.version !== '1.0.0') {
        console.warn('Save data version mismatch');
        return false;
      }

      this._gameTime = saveData.gameTime;
      this._lastSaveTime = saveData.lastSaveTime;
      this._lastPlayTime = saveData.lastPlayTime;

      // リソースの復元
      this._resources.clear();
      saveData.resources.forEach(resource => {
        this._resources.set(resource.id, resource);
      });

      this.eventBus.emit(GameEvents.GAME_LOAD, saveData);
      return true;
    } catch (error) {
      console.error('Failed to load save data:', error);
      return false;
    }
  }

  getOfflineTime(): number {
    return Date.now() - this._lastPlayTime;
  }

  updateLastPlayTime(): void {
    this._lastPlayTime = Date.now();
  }
}