import { UIComponent } from '../../ui/UIManager';
import { Character } from './Character';
import { CharacterSystem } from './CharacterSystem';
import { CentralStateManager } from '../../core/CentralStateManager';
import { EventBus, GameEvents } from '../../core/EventBus';

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
    const gameManager = GameManager.getInstance();
    this.characterSystem = gameManager.getSystem<CharacterSystem>('character') || null;
    
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

    // キャラクターカードのイベントリスナーを設定
    this.setupCharacterCardListeners();
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

  private renderCharacterCard(character: Character): string {
    const status = character.status;
    const attributes = character.attributes;
    const isExpanded = this.expandedCharacters.has(character.id);
    
    return `
      <div class="character-card" data-character-id="${character.id}" draggable="true">
        <div class="character-card__header">
          <div class="character-card__name-row">
            <span class="character-card__name">${character.name}</span>
            <button class="character-card__expand-btn ${isExpanded ? 'expanded' : ''}" data-character-id="${character.id}">
              ${isExpanded ? '×' : '⋯'}
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

        <div class="character-card__details" id="details-${character.id}" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="character-details">
            <div class="character-details__stats">
              <div class="stat-item">
                <span class="stat-label">攻撃</span>
                <span class="stat-value">${character.attackPower}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">防御</span>
                <span class="stat-value">${character.defensePower}</span>
              </div>
            </div>

            <div class="character-details__status">
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

            <div class="character-details__attributes">
              <div class="attribute-grid-compact">
                <div class="attribute-compact">
                  <span>力</span><span>${attributes.strength}</span>
                </div>
                <div class="attribute-compact">
                  <span>頑丈</span><span>${attributes.toughness}</span>
                </div>
                <div class="attribute-compact">
                  <span>賢さ</span><span>${attributes.intelligence}</span>
                </div>
                <div class="attribute-compact">
                  <span>器用</span><span>${attributes.dexterity}</span>
                </div>
                <div class="attribute-compact">
                  <span>敏捷</span><span>${attributes.agility}</span>
                </div>
                <div class="attribute-compact">
                  <span>精神</span><span>${attributes.willpower}</span>
                </div>
              </div>
            </div>

            <div class="character-details__skills">
              <h5>主要スキル</h5>
              <div class="skills-grid">
                ${this.renderTopSkills(character)}
              </div>
            </div>
          </div>
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
    // 展開ボタンのイベントリスナーを設定
    const expandButtons = document.querySelectorAll('.character-card__expand-btn');
    
    expandButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        const characterId = (button as HTMLElement).getAttribute('data-character-id');
        if (!characterId) return;
        
        const detailsElement = document.getElementById(`details-${characterId}`);
        const expandBtn = button as HTMLElement;
        
        if (detailsElement && expandBtn) {
          const isCurrentlyExpanded = this.expandedCharacters.has(characterId);
          
          if (isCurrentlyExpanded) {
            // 閉じる
            this.expandedCharacters.delete(characterId);
            detailsElement.style.display = 'none';
            expandBtn.textContent = '⋯';
            expandBtn.classList.remove('expanded');
          } else {
            // 開く
            this.expandedCharacters.add(characterId);
            detailsElement.style.display = 'block';
            expandBtn.textContent = '×';
            expandBtn.classList.add('expanded');
          }
        }
      });
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