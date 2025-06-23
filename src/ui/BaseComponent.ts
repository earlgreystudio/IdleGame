import { UIComponent } from './UIManager';
import { Building } from '../components/building/Building';
import { BuildingManager } from '../components/building/BuildingManager';
import { CentralStateManager } from '../core/CentralStateManager';
import { EventBus, GameEvents } from '../core/EventBus';
import type { BuildingType } from '../components/building/types';
import { DataManager } from '../utils/DataManager';

export class BaseComponent implements UIComponent {
  element: HTMLElement;
  private buildingManager: BuildingManager | null = null;
  private eventBus: EventBus;

  constructor(element: HTMLElement) {
    this.element = element;
    this.eventBus = EventBus.getInstance();
  }

  initialize(): void {
    const centralStateManager = CentralStateManager.getInstance();
    this.buildingManager = centralStateManager.getSystem('building') as unknown as BuildingManager || null;
    
    this.render();
    this.setupEventListeners();
    this.update();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="base-view">
        <div class="base-view__header">
          <h3>拠点管理</h3>
          <button class="btn btn--sm btn--secondary" id="base-status-btn">
            拠点状況
          </button>
        </div>
        
        <div class="base-view__content">
          <div class="base-view__buildings" id="buildings-container">
            <!-- 建物一覧がここに表示される -->
          </div>
          
          <div class="base-view__construction">
            <h4>建設可能な施設</h4>
            <div class="construction-grid" id="construction-grid">
              <!-- 建設ボタンがここに表示される -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // 拠点状況ボタン
    const statusBtn = document.getElementById('base-status-btn');
    if (statusBtn) {
      statusBtn.addEventListener('click', () => {
        if (this.buildingManager) {
          this.buildingManager.printBaseStatus();
        }
      });
    }

    // 建物関連イベント
    this.eventBus.on(GameEvents.BASE_BUILD, () => {
      this.update();
    });

    this.eventBus.on(GameEvents.BASE_UPGRADE, () => {
      this.update();
    });

    this.eventBus.on('building:demolish', () => {
      this.update();
    });

    // 建設ボタンのイベントリスナー
    this.setupConstructionListeners();
  }

  private setupConstructionListeners(): void {
    const constructionGrid = document.getElementById('construction-grid');
    if (!constructionGrid) return;

    // イベント委譲でボタンイベントを処理
    constructionGrid.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('construction-btn')) {
        event.stopPropagation();
        const buildingType = target.getAttribute('data-building-type') as BuildingType;
        
        if (buildingType && this.buildingManager) {
          this.buildBuilding(buildingType);
        }
      }
      
      if (target.classList.contains('upgrade-btn')) {
        event.stopPropagation();
        const buildingId = target.getAttribute('data-building-id');
        
        if (buildingId && this.buildingManager) {
          this.upgradeBuilding(buildingId);
        }
      }
      
      if (target.classList.contains('collect-btn')) {
        event.stopPropagation();
        const buildingId = target.getAttribute('data-building-id');
        
        if (buildingId && this.buildingManager) {
          this.collectProduction(buildingId);
        }
      }
      
      if (target.classList.contains('demolish-btn')) {
        event.stopPropagation();
        const buildingId = target.getAttribute('data-building-id');
        
        if (buildingId && this.buildingManager && confirm('本当に解体しますか？')) {
          this.demolishBuilding(buildingId);
        }
      }
    });
  }

  update(): void {
    if (!this.buildingManager) return;

    this.updateBuildingsList();
    this.updateConstructionGrid();
  }

  private updateBuildingsList(): void {
    const container = document.getElementById('buildings-container');
    if (!container || !this.buildingManager) return;

    const buildings = this.buildingManager.getAllBuildings();
    
    container.innerHTML = buildings.map(building => 
      this.renderBuildingCard(building)
    ).join('');
  }

  private renderBuildingCard(building: Building): string {
    const template = building.template;
    const upgrading = building.upgrading;
    const production = building.production;
    const canUpgrade = building.canUpgrade();
    
    return `
      <div class="building-card" data-building-id="${building.id}">
        <div class="building-card__header">
          <div class="building-card__info">
            <h5 class="building-card__name">${template?.name || 'Unknown'} Lv.${building.level}</h5>
            <span class="building-card__position">(${building.position.x}, ${building.position.y})</span>
          </div>
          <div class="building-card__health">
            <div class="progress progress--xs">
              <div class="progress__bar" style="width: ${(building.health / building.maxHealth) * 100}%"></div>
            </div>
            <span class="health-text">${building.health}/${building.maxHealth}</span>
          </div>
        </div>

        ${upgrading ? `
          <div class="building-card__upgrade">
            <span class="upgrade-text">Lv.${upgrading.targetLevel}にアップグレード中</span>
            <div class="progress progress--sm">
              <div class="progress__bar" style="width: ${building.getUpgradeProgress()}%"></div>
            </div>
          </div>
        ` : ''}

        ${production ? `
          <div class="building-card__production">
            <span class="production-text">
              ${building.effect.production?.resourceType}: ${production.currentAmount.toFixed(1)}/${production.maxStorage}
            </span>
            ${production.currentAmount > 0 ? `
              <button class="btn btn--xs btn--primary collect-btn" data-building-id="${building.id}">
                回収
              </button>
            ` : ''}
          </div>
        ` : ''}

        <div class="building-card__actions">
          ${canUpgrade ? `
            <button class="btn btn--xs btn--secondary upgrade-btn" data-building-id="${building.id}">
              アップグレード
            </button>
          ` : ''}
          <button class="btn btn--xs btn--danger demolish-btn" data-building-id="${building.id}">
            解体
          </button>
        </div>
      </div>
    `;
  }

  private updateConstructionGrid(): void {
    const grid = document.getElementById('construction-grid');
    if (!grid) return;

    const buildingTypes: BuildingType[] = [
      'house', 'kitchen', 'forge', 'well', 'storage', 'farm', 'fence', 'watchtower', 'trap'
    ];

    grid.innerHTML = buildingTypes.map(type => 
      this.renderConstructionButton(type)
    ).join('');
  }

  private renderConstructionButton(type: BuildingType): string {
    const dataManager = DataManager.getInstance();
    const template = dataManager.getBuildingTemplate(type);
    const cost = dataManager.getBuildingCost(type, 1);
    const canAfford = this.canAffordCost(cost);

    if (!template) return '';
    
    return `
      <div class="construction-item ${canAfford ? '' : 'construction-item--disabled'}">
        <div class="construction-item__header">
          <h6>${template.name}</h6>
          <div class="construction-item__cost">
            ${Object.entries(cost).map(([resource, amount]) => 
              amount ? `<span class="cost-item">${this.getResourceIcon(resource)}${amount}</span>` : ''
            ).join('')}
          </div>
        </div>
        <p class="construction-item__description">${template.description}</p>
        <button 
          class="btn btn--sm btn--primary construction-btn ${canAfford ? '' : 'btn--disabled'}" 
          data-building-type="${type}"
          ${canAfford ? '' : 'disabled'}
        >
          建設
        </button>
      </div>
    `;
  }

  private getResourceIcon(resourceId: string): string {
    const icons: Record<string, string> = {
      'wood': '🪵',
      'stone': '🪨',
      'metal': '⚙️',
      'otherworld_currency': '🪙',
      'wheat': '🌾',
      'wheatSeeds': '🌱'
    };
    return icons[resourceId] || '📦';
  }

  private canAffordCost(cost: any): boolean {
    const centralStateManager = CentralStateManager.getInstance();
    if (!centralStateManager) return false;

    return Object.entries(cost).every(([resource, amount]) => {
      return amount ? centralStateManager.hasResource(resource, amount as number) : true;
    });
  }

  // アクションメソッド
  private buildBuilding(type: BuildingType): void {
    if (!this.buildingManager) return;

    // 簡単な位置決定（次の空いている位置を使用）
    const buildings = this.buildingManager.getAllBuildings();
    const usedPositions = new Set(buildings.map(b => `${b.position.x},${b.position.y}`));
    
    let position = { x: 0, y: 0 };
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!usedPositions.has(`${x},${y}`)) {
          position = { x, y };
          break;
        }
      }
      if (position.x !== 0 || position.y !== 0) break;
    }

    const result = this.buildingManager.buildBuilding(type, position);
    
    if (result.success) {
      console.log(result.message);
    } else {
      alert(result.message);
    }
  }

  private upgradeBuilding(buildingId: string): void {
    if (!this.buildingManager) return;

    const result = this.buildingManager.upgradeBuilding(buildingId);
    
    if (result.success) {
      console.log(result.message);
    } else {
      alert(result.message);
    }
  }

  private collectProduction(buildingId: string): void {
    if (!this.buildingManager) return;

    const result = this.buildingManager.collectBuildingProduction(buildingId);
    
    if (result.success && result.result) {
      console.log(`${result.result.resourceType} +${Math.floor(result.result.amount)} を回収しました`);
    }
  }

  private demolishBuilding(buildingId: string): void {
    if (!this.buildingManager) return;

    const result = this.buildingManager.demolishBuilding(buildingId);
    
    if (result.success) {
      console.log(result.message);
    } else {
      alert(result.message);
    }
  }

  destroy(): void {
    this.element.innerHTML = '';
  }
}