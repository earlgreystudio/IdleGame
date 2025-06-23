import { UIComponent } from '@ui/UIManager';
import { Character } from '../../components/character/Character';
import { CharacterSystem } from '../../components/character/CharacterSystem';
import { CentralStateManager } from '@core/CentralStateManager';
import { EventBus, GameEvents } from '@core/EventBus';

export class CharacterListComponent implements UIComponent {
  element: HTMLElement;
  private characterSystem: CharacterSystem | null = null;
  private eventBus: EventBus;
  private expandedCharacters: Set<string> = new Set(); // 展開状態を記録
  private updateTimeout: number | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.eventBus = EventBus.getInstance();
  }

  initialize(): void {
    const centralStateManager = CentralStateManager.getInstance();
    this.characterSystem = centralStateManager.getSystem<CharacterSystem>('character') || null;
    
    this.render();
    this.setupEventListeners();
    this.update();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="character-list">
        <div class="character-list__header">
          <h3>仲間一覧</h3>
          <button class="btn btn--sm btn--primary" id="add-random-character">
            ランダム仲間追加
          </button>
        </div>
        <div class="character-list__content" id="character-container">
          <!-- キャラクターがここに表示される -->
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // ランダムキャラクター追加ボタン
    const addButton = document.getElementById('add-random-character');
    if (addButton) {
      addButton.addEventListener('click', () => {
        if (this.characterSystem) {
          this.characterSystem.createRandomCharacter();
        }
      });
    }

    // イベント委譲でキャラクターカードのイベントを処理
    this.element.addEventListener('click', (event) => {
      console.log('BASIC TEST: Click detected on character list element');
      const target = event.target as HTMLElement;
      console.log('BASIC TEST: Target element:', target);
      console.log('BASIC TEST: Target classes:', target.className);
      console.log('BASIC TEST: Target tag:', target.tagName);
      
      // 詳細ボタンまたはその子要素をクリック
      const detailBtn = target.closest('.character-card__detail-btn');
      if (detailBtn) {
        console.log('BASIC TEST: Detail button found!');
        event.stopPropagation();
        event.preventDefault();
        
        const characterId = detailBtn.getAttribute('data-character-id');
        console.log('BASIC TEST: Character ID:', characterId);
        
        if (!characterId || !this.characterSystem) {
          console.log('BASIC TEST: Missing characterId or characterSystem');
          return;
        }
        
        const character = this.characterSystem.getCharacter(characterId);
        if (character) {
          console.log('BASIC TEST: Opening modal for:', character.name);
          this.showCharacterDetailModal(character);
        }
      }
    });

    // ドラッグイベント
    this.element.addEventListener('dragstart', (event) => {
      console.log('BASIC TEST: Drag started on character list element');
      const target = event.target as HTMLElement;
      console.log('BASIC TEST: Drag target:', target);
      console.log('BASIC TEST: Drag target classes:', target.className);
      
      const characterCard = target.closest('.character-card');
      console.log('BASIC TEST: Found character card:', characterCard);
      
      if (characterCard) {
        const characterId = characterCard.getAttribute('data-character-id');
        console.log('BASIC TEST: Character ID for drag:', characterId);
        
        if (characterId && this.characterSystem) {
          const character = this.characterSystem.getCharacter(characterId);
          if (character) {
            console.log('BASIC TEST: Setting dragged character:', character.name);
            (window as any).draggedCharacter = character;
          }
        }
      }
    });

    // キャラクター関連イベント
    this.eventBus.on(GameEvents.CHARACTER_SPAWN, () => {
      this.debouncedUpdate();
    });

    this.eventBus.on(GameEvents.CHARACTER_STATUS_CHANGE, (data: any) => {
      this.updateCharacterStatus(data.characterId);
    });

    this.eventBus.on(GameEvents.CHARACTER_SKILL_UP, (data: any) => {
      this.showSkillUpNotification(data);
      this.debouncedUpdate();
    });
  }

  private debouncedUpdate(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = window.setTimeout(() => {
      this.update();
      this.updateTimeout = null;
    }, 100); // 100ms のデバウンス
  }

  update(): void {
    if (!this.characterSystem) return;

    const container = document.getElementById('character-container');
    if (!container) return;

    const characters = this.characterSystem.getAllCharacters();
    
    container.innerHTML = characters.map(character => 
      this.renderCharacterCard(character)
    ).join('');

    // イベント委譲を使用しているため、ここでのリスナー設定は不要
  }

  private updateCharacterStatus(characterId: string): void {
    if (!this.characterSystem) return;
    
    const character = this.characterSystem.getCharacter(characterId);
    if (!character) return;

    const status = character.status;
    const card = document.querySelector(`[data-character-id="${characterId}"]`);
    if (!card) return;

    // ステータスバーのみ更新
    const healthBar = card.querySelector('.progress--health .progress__bar') as HTMLElement;
    const staminaBar = card.querySelector('.progress--stamina .progress__bar') as HTMLElement;
    const mentalBar = card.querySelector('.progress--mental .progress__bar') as HTMLElement;

    if (healthBar) healthBar.style.width = `${status.health}%`;
    if (staminaBar) staminaBar.style.width = `${status.stamina}%`;
    if (mentalBar) mentalBar.style.width = `${status.mental}%`;

    // 詳細エリアが展開されている場合のみ詳細ステータスも更新
    const detailsElement = document.getElementById(`details-${characterId}`);
    if (detailsElement && detailsElement.style.display !== 'none') {
      this.updateDetailedStatus(characterId, status);
    }
  }

  private updateDetailedStatus(characterId: string, status: any): void {
    const detailsElement = document.getElementById(`details-${characterId}`);
    if (!detailsElement) return;

    // 詳細ステータスの更新
    const statusDetails = detailsElement.querySelectorAll('.status-detail');
    const statusValues = [status.health, status.stamina, status.mental, status.hunger, status.thirst];
    
    statusDetails.forEach((detail, index) => {
      const bar = detail.querySelector('.progress__bar') as HTMLElement;
      const value = detail.querySelector('.status-value') as HTMLElement;
      
      if (bar && statusValues[index] !== undefined) {
        bar.style.width = `${statusValues[index]}%`;
      }
      if (value && statusValues[index] !== undefined) {
        value.textContent = Math.round(statusValues[index]).toString();
      }
    });
  }

  private renderCharacterCard(character: any): string {
    const status = character.status;
    const attributes = character.attributes;
    const isExpanded = this.expandedCharacters.has(character.id);
    
    return `
      <div class="character-card" data-character-id="${character.id}" draggable="true">
        <div class="character-card__header">
          <div class="character-card__name-row">
            <span class="character-card__name">${character.name}</span>
            <button class="character-card__detail-btn" data-character-id="${character.id}" onclick="console.log('INLINE TEST: Button clicked directly!', '${character.id}')">
              📋
            </button>
          </div>
          <div class="character-card__meta-row">
            <span class="character-card__club">${character.club}</span>
            <span class="character-card__gender">${character.gender === 'male' ? '♂' : '♀'}</span>
          </div>
        </div>
        
        <div class="character-card__status">
          <div class="progress progress--xs progress--health">
            <div class="progress__bar" style="width: ${status.health}%"></div>
          </div>
          <div class="progress progress--xs progress--stamina">
            <div class="progress__bar" style="width: ${status.stamina}%"></div>
          </div>
          <div class="progress progress--xs progress--mental">
            <div class="progress__bar" style="width: ${status.mental}%"></div>
          </div>
        </div>

        <div class="character-card__task-status">
          ${character.currentTaskId ? 
            `<span class="task-status task-status--active">${character.currentTaskId}</span>` :
            `<span class="task-status task-status--idle">待機</span>`
          }
        </div>

      </div>
    `;
  }

  private renderTopSkills(character: Character): string {
    const topSkills = Array.from(character.skills.entries())
      .filter(([_, skill]) => skill.level > 1)
      .sort(([_, a], [__, b]) => b.level - a.level)
      .slice(0, 8)
      .map(([skillType, skill]) => `
        <div class="skill-item">
          <span class="skill-name">${skillType}</span>
          <span class="skill-level">Lv.${skill.level}</span>
        </div>
      `);

    return topSkills.length > 0 ? topSkills.join('') : '<div class="no-skills">習得スキルなし</div>';
  }

  private setupCharacterCardListeners(): void {
    // イベント委譲を使用して、親要素に1回だけリスナーを設定
    // これにより、動的に追加される要素にも対応可能
  }


  private showCharacterDetailModal(character: Character): void {
    const status = character.status;
    const attributes = character.attributes;
    
    const modal = document.createElement('div');
    modal.className = 'character-detail-modal';
    modal.innerHTML = `
      <div class="modal-overlay" id="character-modal-overlay">
        <div class="modal-content character-modal-content">
          <div class="modal-header">
            <h3>${character.name}の詳細情報</h3>
            <button class="modal-close" id="character-modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="character-detail-grid">
              <div class="character-detail-section">
                <h4>基本情報</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">部活</span>
                    <span class="info-value">${character.club}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">性別</span>
                    <span class="info-value">${character.gender === 'male' ? '男性' : '女性'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">攻撃力</span>
                    <span class="info-value">${character.attackPower}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">防御力</span>
                    <span class="info-value">${character.defensePower}</span>
                  </div>
                </div>
              </div>
              
              <div class="character-detail-section">
                <h4>ステータス</h4>
                <div class="status-grid">
                  <div class="status-detail">
                    <span class="status-label">体力</span>
                    <div class="progress progress--sm progress--health">
                      <div class="progress__bar" style="width: ${status.health}%"></div>
                    </div>
                    <span class="status-value">${Math.round(status.health)}</span>
                  </div>
                  <div class="status-detail">
                    <span class="status-label">スタミナ</span>
                    <div class="progress progress--sm progress--stamina">
                      <div class="progress__bar" style="width: ${status.stamina}%"></div>
                    </div>
                    <span class="status-value">${Math.round(status.stamina)}</span>
                  </div>
                  <div class="status-detail">
                    <span class="status-label">メンタル</span>
                    <div class="progress progress--sm progress--mental">
                      <div class="progress__bar" style="width: ${status.mental}%"></div>
                    </div>
                    <span class="status-value">${Math.round(status.mental)}</span>
                  </div>
                  <div class="status-detail">
                    <span class="status-label">空腹</span>
                    <div class="progress progress--sm">
                      <div class="progress__bar" style="width: ${status.hunger}%"></div>
                    </div>
                    <span class="status-value">${Math.round(status.hunger)}</span>
                  </div>
                  <div class="status-detail">
                    <span class="status-label">渇き</span>
                    <div class="progress progress--sm">
                      <div class="progress__bar" style="width: ${status.thirst}%"></div>
                    </div>
                    <span class="status-value">${Math.round(status.thirst)}</span>
                  </div>
                </div>
              </div>
              
              <div class="character-detail-section">
                <h4>能力値</h4>
                <div class="attribute-grid">
                  <div class="attribute-item">
                    <span class="attr-label">力</span>
                    <span class="attr-value">${attributes.strength}</span>
                  </div>
                  <div class="attribute-item">
                    <span class="attr-label">頑丈さ</span>
                    <span class="attr-value">${attributes.toughness}</span>
                  </div>
                  <div class="attribute-item">
                    <span class="attr-label">賢さ</span>
                    <span class="attr-value">${attributes.intelligence}</span>
                  </div>
                  <div class="attribute-item">
                    <span class="attr-label">器用さ</span>
                    <span class="attr-value">${attributes.dexterity}</span>
                  </div>
                  <div class="attribute-item">
                    <span class="attr-label">敏捷性</span>
                    <span class="attr-value">${attributes.agility}</span>
                  </div>
                  <div class="attribute-item">
                    <span class="attr-label">精神力</span>
                    <span class="attr-value">${attributes.willpower}</span>
                  </div>
                </div>
              </div>
              
              <div class="character-detail-section">
                <h4>スキル</h4>
                <div class="skills-grid-modal">
                  ${this.renderTopSkills(character)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // モーダルイベントリスナー
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'character-modal-overlay' || target.id === 'character-modal-close') {
        closeModal();
      }
    });
  }

  private showSkillUpNotification(data: any): void {
    if (!this.characterSystem) return;
    
    const character = this.characterSystem.getCharacter(data.characterId);
    if (character) {
      // 通知を表示（UIManagerを使用）
      const message = `${character.name}の${data.skill}がLv.${data.newLevel}になりました！`;
      // 後でUIManagerから通知表示する予定
      console.log(message);
    }
  }

  destroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.element.innerHTML = '';
    this.expandedCharacters.clear();
  }
}