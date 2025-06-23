import { UIComponent } from '../UIManager';
import { CentralStateManager } from '../../core/CentralStateManager';
import { TimeSystem } from '../../components/time/TimeSystem';

export class HeaderComponent implements UIComponent {
  element: HTMLElement;
  private centralStateManager: CentralStateManager;
  private timeDisplay: HTMLElement | null = null;
  private resourceDisplays: Map<string, HTMLElement> = new Map();

  constructor(element: HTMLElement) {
    this.element = element;
    this.centralStateManager = CentralStateManager.getInstance();
  }

  initialize(): void {
    this.render();
    this.cacheElements();
    this.update();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="header__content">
        <div class="header__left">
          <div id="time-display" class="header__time"></div>
        </div>
        <div class="header__right">
          <div class="header__resources" id="resource-container"></div>
        </div>
      </div>
    `;
  }

  private cacheElements(): void {
    this.timeDisplay = document.getElementById('time-display');
    this.renderResources();
  }

  private renderResources(): void {
    const container = document.getElementById('resource-container');
    if (!container) return;

    const resourcesHtml: string[] = [];
    const resources = this.centralStateManager.resources;

    // 主要リソースのみ表示
    const displayResources = ['yen', 'otherworld_currency', 'food', 'water', 'wood', 'stone', 'metal', 'wheat', 'wheatSeeds'];
    
    displayResources.forEach(resourceId => {
      const resource = resources.get(resourceId);
      if (resource) {
        const displayName = this.getResourceDisplayName(resourceId);
        const iconClass = this.getResourceIconClass(resourceId);
        
        resourcesHtml.push(`
          <div class="resource resource--${resourceId}">
            <span class="resource__icon ${iconClass}"></span>
            <span class="resource__amount" id="resource-${resourceId}">${this.formatNumber(resource.amount)}</span>
          </div>
        `);
      }
    });

    container.innerHTML = resourcesHtml.join('');

    // 要素をキャッシュ
    displayResources.forEach(resourceId => {
      const element = document.getElementById(`resource-${resourceId}`);
      if (element) {
        this.resourceDisplays.set(resourceId, element);
      }
    });
  }

  private getResourceDisplayName(resourceId: string): string {
    const names: Record<string, string> = {
      'yen': '¥',
      'otherworld_currency': '異',
      'food': '食',
      'water': '水',
      'wood': '木',
      'stone': '石',
      'metal': '鉄',
      'wheat': '麦',
      'wheatSeeds': '種'
    };
    return names[resourceId] || resourceId;
  }

  private getResourceIconClass(resourceId: string): string {
    const icons: Record<string, string> = {
      'yen': 'icon-yen',
      'otherworld_currency': 'icon-coin',
      'food': 'icon-food',
      'water': 'icon-water',
      'wood': 'icon-wood',
      'stone': 'icon-stone',
      'metal': 'icon-metal',
      'wheat': 'icon-wheat',
      'wheatSeeds': 'icon-seeds'
    };
    return icons[resourceId] || 'icon-default';
  }

  update(): void {
    this.updateTime();
    this.updateResources();
  }

  private updateTime(): void {
    if (!this.timeDisplay) return;

    const timeSystem = this.centralStateManager.getSystem<TimeSystem>('time');
    
    if (timeSystem) {
      this.timeDisplay.textContent = timeSystem.getFormattedTime();
    }
  }

  private updateResources(): void {
    const resources = this.centralStateManager.resources;

    this.resourceDisplays.forEach((element, resourceId) => {
      const resource = resources.get(resourceId);
      if (resource) {
        element.textContent = this.formatNumber(resource.amount);
      }
    });
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  destroy(): void {
    this.element.innerHTML = '';
    this.timeDisplay = null;
    this.resourceDisplays.clear();
  }
}