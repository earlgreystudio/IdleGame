import { EventBus, GameEvents } from '@core/EventBus';
import { GameState } from '@core/GameState';

export interface UIComponent {
  element: HTMLElement;
  initialize(): void;
  update(): void;
  destroy(): void;
}

export class UIManager {
  private static instance: UIManager;
  private eventBus: EventBus;
  private gameState: GameState;
  private components: Map<string, UIComponent> = new Map();
  private appElement: HTMLElement;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.gameState = GameState.getInstance();
    
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App element not found');
    }
    this.appElement = app;
  }

  static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  registerComponent(name: string, component: UIComponent): void {
    if (this.components.has(name)) {
      console.warn(`UI component ${name} is already registered`);
      return;
    }

    this.components.set(name, component);
    component.initialize();
  }

  getComponent<T extends UIComponent>(name: string): T | undefined {
    return this.components.get(name) as T;
  }

  initialize(): void {
    // UIの基本構造を作成
    this.appElement.innerHTML = `
      <div class="game-container">
        <header id="game-header" class="header"></header>
        <main id="game-main" class="main"></main>
        <div id="modal-container"></div>
      </div>
    `;

    // イベントリスナーの設定
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 時間更新
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.updateComponents();
    });

    // リソース更新
    this.eventBus.on(GameEvents.RESOURCE_GAIN, () => {
      this.updateComponents();
    });

    this.eventBus.on(GameEvents.RESOURCE_LOSE, () => {
      this.updateComponents();
    });

    // ゲーム状態の変更
    this.eventBus.on(GameEvents.GAME_PAUSE, () => {
      this.appElement.classList.add('game-paused');
    });

    this.eventBus.on(GameEvents.GAME_RESUME, () => {
      this.appElement.classList.remove('game-paused');
    });
  }

  updateComponents(): void {
    for (const component of this.components.values()) {
      component.update();
    }
  }

  getHeaderElement(): HTMLElement {
    const header = document.getElementById('game-header');
    if (!header) {
      throw new Error('Header element not found');
    }
    return header;
  }

  getMainElement(): HTMLElement {
    const main = document.getElementById('game-main');
    if (!main) {
      throw new Error('Main element not found');
    }
    return main;
  }

  getModalContainer(): HTMLElement {
    const modal = document.getElementById('modal-container');
    if (!modal) {
      throw new Error('Modal container not found');
    }
    return modal;
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    this.appElement.appendChild(notification);
    
    // アニメーション後に削除
    setTimeout(() => {
      notification.classList.add('notification--fade-out');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  destroy(): void {
    // コンポーネントの破棄
    for (const component of this.components.values()) {
      component.destroy();
    }
    
    this.components.clear();
    this.appElement.innerHTML = '';
  }
}