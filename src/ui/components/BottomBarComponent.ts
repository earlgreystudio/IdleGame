import { UIComponent } from '@ui/UIManager';
import { EventBus } from '@core/EventBus';

export class BottomBarComponent implements UIComponent {
  element: HTMLElement;
  private eventBus: EventBus;
  private activeTab: string = 'team';

  constructor(element: HTMLElement) {
    this.element = element;
    this.eventBus = EventBus.getInstance();
  }

  initialize(): void {
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="bottom-bar">
        <button class="bottom-bar__tab ${this.activeTab === 'team' ? 'active' : ''}" data-tab="team">
          <span class="tab-icon">👥</span>
          <span class="tab-label">チーム</span>
        </button>
        <button class="bottom-bar__tab ${this.activeTab === 'base' ? 'active' : ''}" data-tab="base">
          <span class="tab-icon">🏗️</span>
          <span class="tab-label">拠点</span>
        </button>
        <button class="bottom-bar__tab ${this.activeTab === 'item' ? 'active' : ''}" data-tab="item">
          <span class="tab-icon">🎒</span>
          <span class="tab-label">アイテム</span>
        </button>
        <button class="bottom-bar__tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">設定</span>
        </button>
      </div>
    `;
  }

  private setupEventListeners(): void {
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tab = target.closest('.bottom-bar__tab') as HTMLElement;
      
      if (tab) {
        const tabId = tab.getAttribute('data-tab');
        if (tabId && tabId !== this.activeTab) {
          this.switchTab(tabId);
        }
      }
    });
  }

  private switchTab(tabId: string): void {
    this.activeTab = tabId;
    
    // タブのアクティブ状態を更新
    const tabs = this.element.querySelectorAll('.bottom-bar__tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = this.element.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // タブ切り替えイベントを発行
    this.eventBus.emit('TAB_SWITCH', { tabId });
  }

  update(): void {
    // 必要に応じてタブの状態を更新
  }

  destroy(): void {
    this.element.innerHTML = '';
  }
}