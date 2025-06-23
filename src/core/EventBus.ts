type EventListener<T = any> = (data: T) => void;
type EventListenerOptions = {
  once?: boolean;
  priority?: number;
};

interface EventSubscription {
  unsubscribe: () => void;
}

export class EventBus {
  private listeners: Map<string, Array<{
    callback: EventListener;
    options: EventListenerOptions;
  }>> = new Map();

  private static instance: EventBus;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T = any>(event: string, callback: EventListener<T>, options: EventListenerOptions = {}): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event)!;
    const listener = { callback, options };
    
    // 優先度順に挿入
    const priority = options.priority || 0;
    let inserted = false;
    
    for (let i = 0; i < listeners.length; i++) {
      if ((listeners[i].options.priority || 0) < priority) {
        listeners.splice(i, 0, listener);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      listeners.push(listener);
    }

    return {
      unsubscribe: () => this.off(event, callback)
    };
  }

  once<T = any>(event: string, callback: EventListener<T>, options: EventListenerOptions = {}): EventSubscription {
    return this.on(event, callback, { ...options, once: true });
  }

  off(event: string, callback: EventListener): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(l => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.listeners.delete(event);
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const listenersToCall = [...listeners];
    
    listenersToCall.forEach(({ callback, options }) => {
      callback(data);
      
      if (options.once) {
        this.off(event, callback);
      }
    });
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// イベント名の定数
export const GameEvents = {
  // 時間関連
  TIME_TICK: 'time:tick',
  TIME_HOUR: 'time:hour',
  TIME_DAY: 'time:day',
  TIME_SEASON: 'time:season',
  
  // キャラクター関連
  CHARACTER_SPAWN: 'character:spawn',
  CHARACTER_DEATH: 'character:death',
  CHARACTER_LEVEL_UP: 'character:levelup',
  CHARACTER_SKILL_UP: 'character:skillup',
  CHARACTER_STATUS_CHANGE: 'character:status',
  
  // 拠点関連
  BASE_BUILD: 'base:build',
  BASE_UPGRADE: 'base:upgrade',
  BASE_ATTACK: 'base:attack',
  
  // タスク関連
  TASK_START: 'task:start',
  TASK_COMPLETE: 'task:complete',
  TASK_FAIL: 'task:fail',
  
  // リソース関連
  RESOURCE_GAIN: 'resource:gain',
  RESOURCE_LOSE: 'resource:lose',
  
  // 戦闘関連
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  COMBAT_DAMAGE: 'combat:damage',
  
  // ゲーム状態
  GAME_SAVE: 'game:save',
  GAME_LOAD: 'game:load',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
} as const;