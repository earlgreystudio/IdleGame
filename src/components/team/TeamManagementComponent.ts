import { UIComponent } from '../../ui/UIManager';
import { Character } from '../character/Character';
import { CharacterSystem } from '../character/CharacterSystem';
import { TeamWorkSystem } from './TeamSystem';
import { CentralStateManager } from '../../core/CentralStateManager';
import { EventBus, GameEvents } from '../../core/EventBus';

export interface Team {
  id: string;
  name: string;
  members: Character[];
  currentTask?: string;
  taskProgress?: number;
}

export class TeamManagementComponent implements UIComponent {
  element: HTMLElement;
  private characterSystem: CharacterSystem | null = null;
  private teamWorkSystem: TeamWorkSystem | null = null;
  private eventBus: EventBus;
  private teams: Map<string, Team> = new Map();
  private draggedCharacter: Character | null = null;
  private maxTeams = 4;
  private maxMembersPerTeam = 6;

  constructor(element: HTMLElement) {
    this.element = element;
    this.eventBus = EventBus.getInstance();
    this.initializeDefaultTeams();
  }

  initialize(): void {
    const centralStateManager = CentralStateManager.getInstance();
    this.characterSystem = centralStateManager.getSystem<CharacterSystem>('character') || null;
    this.teamWorkSystem = centralStateManager.getSystem<TeamWorkSystem>('teamwork') || null;
    
    this.render();
    this.setupEventListeners();
    this.update();
  }

  private initializeDefaultTeams(): void {
    // デフォルトのチームを作成
    for (let i = 1; i <= this.maxTeams; i++) {
      this.teams.set(`team${i}`, {
        id: `team${i}`,
        name: `チーム${i}`,
        members: []
      });
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="team-management">
        <div class="team-management__header">
          <h2>チーム管理</h2>
          <div class="team-management__controls">
            <button class="btn btn--primary" id="assign-all-tasks">
              全チームに作業割当
            </button>
            <button class="btn btn--secondary" id="clear-all-teams">
              全チーム解散
            </button>
          </div>
        </div>
        
        <div class="teams-grid" id="teams-container">
          ${Array.from(this.teams.values()).map(team => this.renderTeamSlot(team)).join('')}
        </div>
        
        <div class="team-management__task-assignment">
          <h3>作業割当</h3>
          <div class="task-categories">
            <div class="task-category">
              <h4>🍳 料理</h4>
              <button class="task-btn" data-task="cooking-bread">パン作り</button>
              <button class="task-btn" data-task="cooking-stew">シチュー作り</button>
            </div>
            <div class="task-category">
              <h4>⚔️ 戦闘</h4>
              <button class="task-btn" data-task="combat-patrol">パトロール</button>
              <button class="task-btn" data-task="combat-hunt">狩り</button>
            </div>
            <div class="task-category">
              <h4>🔍 探索</h4>
              <button class="task-btn" data-task="exploration-forest">森の探索</button>
              <button class="task-btn" data-task="exploration-cave">洞窟探索</button>
            </div>
            <div class="task-category">
              <h4>🏗️ 建設</h4>
              <button class="task-btn" data-task="building-upgrade">建物強化</button>
              <button class="task-btn" data-task="building-repair">修理</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTeamSlot(team: Team): string {
    const isEmpty = team.members.length === 0;
    
    return `
      <div class="team-slot" data-team-id="${team.id}">
        <div class="team-slot__header">
          <input type="text" class="team-name-input" value="${team.name}" data-team-id="${team.id}">
          <span class="team-member-count">${team.members.length}/${this.maxMembersPerTeam}</span>
        </div>
        
        <div class="team-slot__drop-zone ${isEmpty ? 'empty' : ''}" 
             data-team-id="${team.id}">
          ${isEmpty ? 
            `<div class="drop-placeholder">
              <div class="drop-placeholder__icon">👥</div>
              <div class="drop-placeholder__text">キャラクターをドラッグ</div>
            </div>` :
            `<div class="team-members">
              ${team.members.map(member => this.renderTeamMember(member, team.id)).join('')}
            </div>`
          }
        </div>
        
        <div class="team-slot__status">
          ${team.currentTask ? 
            `<div class="team-task-status">
              <div class="task-name">${this.getTaskDisplayName(team.currentTask)}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${team.taskProgress || 0}%"></div>
              </div>
              <button class="btn btn--xs btn--danger stop-task-btn" data-team-id="${team.id}">停止</button>
            </div>` :
            `<div class="team-idle">待機中</div>`
          }
        </div>
      </div>
    `;
  }

  private renderTeamMember(character: Character, teamId: string): string {
    return `
      <div class="team-member" 
           data-character-id="${character.id}" 
           data-team-id="${teamId}"
           draggable="true">
        <div class="team-member__avatar">
          <span class="team-member__gender">${character.gender === 'male' ? '♂' : '♀'}</span>
        </div>
        <div class="team-member__info">
          <div class="team-member__name">${character.name}</div>
          <div class="team-member__stats">
            <div class="stat-bar health" style="width: ${character.status.health}%"></div>
            <div class="stat-bar stamina" style="width: ${character.status.stamina}%"></div>
            <div class="stat-bar mental" style="width: ${character.status.mental}%"></div>
          </div>
        </div>
        <button class="team-member__remove" data-character-id="${character.id}" data-team-id="${teamId}">×</button>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // チーム名変更
    this.element.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('team-name-input')) {
        const teamId = target.getAttribute('data-team-id');
        if (teamId && this.teams.has(teamId)) {
          const team = this.teams.get(teamId)!;
          team.name = target.value;
        }
      }
    });

    // ドラッグ＆ドロップイベント
    this.setupDragAndDrop();

    // タスク割当ボタン
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('task-btn')) {
        const taskType = target.getAttribute('data-task');
        if (taskType) {
          this.showTaskAssignmentModal(taskType);
        }
      }
      
      // チームからキャラクター削除
      if (target.classList.contains('team-member__remove')) {
        const characterId = target.getAttribute('data-character-id');
        const teamId = target.getAttribute('data-team-id');
        if (characterId && teamId) {
          this.removeCharacterFromTeam(characterId, teamId);
        }
      }
      
      // タスク停止
      if (target.classList.contains('stop-task-btn')) {
        const teamId = target.getAttribute('data-team-id');
        if (teamId) {
          this.stopTeamTask(teamId);
        }
      }
    });

    // 全チーム操作
    const assignAllBtn = document.getElementById('assign-all-tasks');
    const clearAllBtn = document.getElementById('clear-all-teams');
    
    if (assignAllBtn) {
      assignAllBtn.addEventListener('click', () => this.assignTasksToAllTeams());
    }
    
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllTeams());
    }

    // キャラクター関連イベント
    this.eventBus.on(GameEvents.CHARACTER_SPAWN, () => {
      this.update();
    });

    this.eventBus.on(GameEvents.CHARACTER_STATUS_CHANGE, () => {
      this.updateTeamMemberStatus();
    });

    // チーム作業関連イベント
    this.eventBus.on('TEAM_WORK_PROGRESS', (data: any) => {
      this.updateTeamTaskProgressFromEvent(data.activeTeamTasks);
    });

    this.eventBus.on(GameEvents.TASK_COMPLETE, (data: any) => {
      this.handleTaskComplete(data);
    });
  }

  private setupDragAndDrop(): void {
    // ドロップゾーンイベント
    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dropZone = (e.target as HTMLElement).closest('.team-slot__drop-zone');
      if (dropZone) {
        dropZone.classList.add('drag-over');
      }
    });

    this.element.addEventListener('dragleave', (e) => {
      const dropZone = (e.target as HTMLElement).closest('.team-slot__drop-zone');
      if (dropZone) {
        dropZone.classList.remove('drag-over');
      }
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropZone = (e.target as HTMLElement).closest('.team-slot__drop-zone');
      if (dropZone) {
        dropZone.classList.remove('drag-over');
        const teamId = dropZone.getAttribute('data-team-id');
        if (teamId && this.draggedCharacter) {
          this.addCharacterToTeam(this.draggedCharacter, teamId);
          this.draggedCharacter = null;
        }
      }
    });

    // チームメンバーのドラッグ開始
    this.element.addEventListener('dragstart', (e) => {
      const teamMember = (e.target as HTMLElement).closest('.team-member');
      if (teamMember) {
        const characterId = teamMember.getAttribute('data-character-id');
        if (characterId && this.characterSystem) {
          this.draggedCharacter = this.characterSystem.getCharacter(characterId) || null;
        }
      }
    });
  }

  addCharacterToTeam(character: Character, teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    // 既に他のチームにいる場合は削除
    this.removeCharacterFromAllTeams(character.id);

    // チームサイズ制限チェック
    if (team.members.length >= this.maxMembersPerTeam) {
      console.warn(`Team ${team.name} is full`);
      return;
    }

    team.members.push(character);
    this.update();
  }

  removeCharacterFromTeam(characterId: string, teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    team.members = team.members.filter(member => member.id !== characterId);
    this.update();
  }

  private removeCharacterFromAllTeams(characterId: string): void {
    this.teams.forEach(team => {
      team.members = team.members.filter(member => member.id !== characterId);
    });
  }

  private showTaskAssignmentModal(taskType: string): void {
    // 簡単なプロンプトで実装（後で改善可能）
    const availableTeams = Array.from(this.teams.values())
      .filter(team => team.members.length > 0 && !team.currentTask);
    
    if (availableTeams.length === 0) {
      alert('利用可能なチームがありません');
      return;
    }

    const teamOptions = availableTeams.map((team, index) => 
      `${index + 1}. ${team.name} (${team.members.length}人)`
    ).join('\n');
    
    const selectedIndex = prompt(
      `${this.getTaskDisplayName(taskType)}を割り当てるチームを選択してください:\n\n${teamOptions}\n\n番号を入力:`
    );
    
    if (selectedIndex) {
      const index = parseInt(selectedIndex) - 1;
      if (index >= 0 && index < availableTeams.length) {
        this.assignTaskToTeam(availableTeams[index].id, taskType);
      }
    }
  }

  private assignTaskToTeam(teamId: string, taskType: string): void {
    const team = this.teams.get(teamId);
    if (!team || team.members.length === 0 || !this.teamWorkSystem) return;

    // TeamWorkSystemを使用してタスクを割り当て
    const success = this.teamWorkSystem.assignTaskToTeam(team, taskType);
    
    if (success) {
      team.currentTask = taskType;
      team.taskProgress = 0;
      console.log(`Assigned ${taskType} to team ${team.name}`);
    } else {
      alert(`チーム${team.name}に${this.getTaskDisplayName(taskType)}を割り当てることができませんでした`);
    }
    
    this.update();
  }

  private startTeamTaskProgress(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team || !team.currentTask) return;

    // 簡単な進行シミュレーション
    const progressInterval = setInterval(() => {
      if (!team.currentTask) {
        clearInterval(progressInterval);
        return;
      }

      team.taskProgress = (team.taskProgress || 0) + Math.random() * 5;
      
      if (team.taskProgress >= 100) {
        team.taskProgress = 100;
        setTimeout(() => {
          this.completeTeamTask(teamId);
          clearInterval(progressInterval);
        }, 1000);
      }
      
      this.updateTeamTaskProgress(teamId);
    }, 1000);
  }

  private completeTeamTask(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    console.log(`Team ${team.name} completed task: ${team.currentTask}`);
    
    // タスク完了処理（報酬など）
    team.currentTask = undefined;
    team.taskProgress = 0;
    
    this.update();
  }

  private stopTeamTask(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team || !this.teamWorkSystem) return;

    // TeamWorkSystemでタスクを停止
    this.teamWorkSystem.stopTeamTask(teamId);
    
    team.currentTask = undefined;
    team.taskProgress = 0;
    this.update();
  }

  private updateTeamTaskProgress(teamId: string): void {
    const teamSlot = document.querySelector(`[data-team-id="${teamId}"]`);
    if (!teamSlot) return;

    const progressFill = teamSlot.querySelector('.progress-fill') as HTMLElement;
    const team = this.teams.get(teamId);
    
    if (progressFill && team) {
      progressFill.style.width = `${team.taskProgress || 0}%`;
    }
  }

  private updateTeamMemberStatus(): void {
    this.teams.forEach(team => {
      team.members.forEach(member => {
        const memberElement = document.querySelector(`[data-character-id="${member.id}"]`);
        if (memberElement) {
          const healthBar = memberElement.querySelector('.stat-bar.health') as HTMLElement;
          const staminaBar = memberElement.querySelector('.stat-bar.stamina') as HTMLElement;
          const mentalBar = memberElement.querySelector('.stat-bar.mental') as HTMLElement;

          if (healthBar) healthBar.style.width = `${member.status.health}%`;
          if (staminaBar) staminaBar.style.width = `${member.status.stamina}%`;
          if (mentalBar) mentalBar.style.width = `${member.status.mental}%`;
        }
      });
    });
  }

  private getTaskDisplayName(taskType: string): string {
    const taskNames: Record<string, string> = {
      'cooking-bread': 'パン作り',
      'cooking-stew': 'シチュー作り',
      'combat-patrol': 'パトロール',
      'combat-hunt': '狩り',
      'exploration-forest': '森の探索',
      'exploration-cave': '洞窟探索',
      'building-upgrade': '建物強化',
      'building-repair': '修理'
    };
    return taskNames[taskType] || taskType;
  }

  private assignTasksToAllTeams(): void {
    // 全チームに適当なタスクを割り当て
    const availableTasks = ['cooking-bread', 'combat-patrol', 'exploration-forest'];
    
    this.teams.forEach(team => {
      if (team.members.length > 0 && !team.currentTask) {
        const randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        this.assignTaskToTeam(team.id, randomTask);
      }
    });
  }

  private clearAllTeams(): void {
    this.teams.forEach(team => {
      if (team.currentTask && this.teamWorkSystem) {
        this.teamWorkSystem.stopTeamTask(team.id);
      }
      team.members = [];
      team.currentTask = undefined;
      team.taskProgress = 0;
    });
    this.update();
  }

  private updateTeamTaskProgressFromEvent(activeTeamTasks: any[]): void {
    activeTeamTasks.forEach(taskData => {
      const team = this.teams.get(taskData.teamId);
      if (team) {
        team.taskProgress = taskData.progress;
        this.updateTeamTaskProgress(taskData.teamId);
      }
    });
  }

  private handleTaskComplete(data: any): void {
    const team = this.teams.get(data.teamId);
    if (team) {
      team.currentTask = undefined;
      team.taskProgress = 0;
      
      // 完了通知を表示
      const message = `${data.teamName}が${data.taskName}を完了しました！効率: ${(data.efficiency * 100).toFixed(1)}%`;
      console.log(message);
      
      this.update();
    }
  }

  update(): void {
    // チームスロットを再レンダリング
    const container = document.getElementById('teams-container');
    if (container) {
      container.innerHTML = Array.from(this.teams.values())
        .map(team => this.renderTeamSlot(team))
        .join('');
    }
  }

  destroy(): void {
    this.element.innerHTML = '';
    this.teams.clear();
  }
}