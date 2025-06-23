import { BaseSystem } from '../../core/BaseSystem';
import { EventBus, GameEvents } from '../../core/EventBus';
import { Team, TaskDefinition } from './types';
import { Character } from '../character/Character';

export class TeamWorkSystem extends BaseSystem {
  private taskDefinitions: Map<string, TaskDefinition> = new Map();
  private activeTeamTasks: Map<string, {
    team: Team;
    task: TaskDefinition;
    startTime: number;
    progress: number;
  }> = new Map();

  constructor() {
    super();
    this.initializeTaskDefinitions();
  }

  protected async onInitialize(): Promise<void> {
    console.log('TeamWorkSystem initialized');
  }

  protected setupEventListeners(): void {
    // 時間進行イベント
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.processTeamWork();
    });
  }

  private initializeTaskDefinitions(): void {
    const tasks: TaskDefinition[] = [
      // 料理系タスク
      {
        id: 'cooking-bread',
        name: 'パン作り',
        category: 'cooking',
        duration: 3600, // 1時間
        requiredSkills: ['cooking'],
        rewards: {
          resources: { food: 10 },
          experience: { cooking: 15 }
        },
        requirements: {
          resources: { wheat: 2, water: 1 },
          minTeamSize: 1,
          maxTeamSize: 3
        }
      },
      {
        id: 'cooking-stew',
        name: 'シチュー作り',
        category: 'cooking',
        duration: 5400, // 1.5時間
        requiredSkills: ['cooking'],
        rewards: {
          resources: { food: 25 },
          experience: { cooking: 25 }
        },
        requirements: {
          resources: { food: 5, water: 2 },
          minTeamSize: 1,
          maxTeamSize: 2
        }
      },
      // 戦闘系タスク
      {
        id: 'combat-patrol',
        name: 'パトロール',
        category: 'combat',
        duration: 7200, // 2時間
        requiredSkills: ['combat'],
        rewards: {
          resources: { coin: 50 },
          experience: { combat: 20 }
        },
        requirements: {
          minTeamSize: 2,
          maxTeamSize: 4
        }
      },
      {
        id: 'combat-hunt',
        name: '狩り',
        category: 'combat',
        duration: 10800, // 3時間
        requiredSkills: ['combat', 'survival'],
        rewards: {
          resources: { food: 30, coin: 25 },
          experience: { combat: 30, survival: 15 }
        },
        requirements: {
          minTeamSize: 2,
          maxTeamSize: 6
        }
      },
      // 探索系タスク
      {
        id: 'exploration-forest',
        name: '森の探索',
        category: 'exploration',
        duration: 14400, // 4時間
        requiredSkills: ['exploration', 'survival'],
        rewards: {
          resources: { wood: 20, food: 10 },
          experience: { exploration: 25, survival: 10 }
        },
        requirements: {
          minTeamSize: 1,
          maxTeamSize: 4
        }
      },
      {
        id: 'exploration-cave',
        name: '洞窟探索',
        category: 'exploration',
        duration: 18000, // 5時間
        requiredSkills: ['exploration', 'combat'],
        rewards: {
          resources: { stone: 15, metal: 5, coin: 75 },
          experience: { exploration: 40, combat: 20 }
        },
        requirements: {
          minTeamSize: 2,
          maxTeamSize: 5
        }
      },
      // 建設系タスク
      {
        id: 'building-upgrade',
        name: '建物強化',
        category: 'building',
        duration: 21600, // 6時間
        requiredSkills: ['construction'],
        rewards: {
          experience: { construction: 50 }
        },
        requirements: {
          resources: { wood: 10, stone: 5 },
          minTeamSize: 2,
          maxTeamSize: 6
        }
      },
      {
        id: 'building-repair',
        name: '修理',
        category: 'building',
        duration: 7200, // 2時間
        requiredSkills: ['construction'],
        rewards: {
          experience: { construction: 20 }
        },
        requirements: {
          resources: { wood: 5 },
          minTeamSize: 1,
          maxTeamSize: 3
        }
      }
    ];

    tasks.forEach(task => {
      this.taskDefinitions.set(task.id, task);
    });
  }

  assignTaskToTeam(team: Team, taskId: string): boolean {
    const task = this.taskDefinitions.get(taskId);
    if (!task) {
      console.warn(`Task ${taskId} not found`);
      return false;
    }

    // チームサイズチェック
    if (task.requirements?.minTeamSize && team.members.length < task.requirements.minTeamSize) {
      console.warn(`Team ${team.name} is too small for task ${task.name}`);
      return false;
    }

    if (task.requirements?.maxTeamSize && team.members.length > task.requirements.maxTeamSize) {
      console.warn(`Team ${team.name} is too large for task ${task.name}`);
      return false;
    }

    // リソース要件チェック
    if (task.requirements?.resources) {
      for (const [resourceId, amount] of Object.entries(task.requirements.resources)) {
        const currentAmount = this.centralStateManager.getResourceAmount(resourceId);
        if (currentAmount < amount) {
          console.warn(`Not enough ${resourceId} for task ${task.name}`);
          return false;
        }
      }
    }

    // リソース消費
    if (task.requirements?.resources) {
      for (const [resourceId, amount] of Object.entries(task.requirements.resources)) {
        this.centralStateManager.removeResource(resourceId, amount, `Team task: ${task.name}`);
      }
    }

    // タスク開始
    this.activeTeamTasks.set(team.id, {
      team: team,
      task: task,
      startTime: Date.now(),
      progress: 0
    });

    console.log(`Team ${team.name} started task ${task.name}`);
    return true;
  }

  stopTeamTask(teamId: string): void {
    if (this.activeTeamTasks.has(teamId)) {
      this.activeTeamTasks.delete(teamId);
      console.log(`Stopped task for team ${teamId}`);
    }
  }

  private processTeamWork(): void {
    const currentTime = Date.now();
    const completedTasks: string[] = [];

    this.activeTeamTasks.forEach((taskData, teamId) => {
      const { team, task, startTime } = taskData;
      const elapsedTime = (currentTime - startTime) / 1000; // 秒に変換
      const progress = Math.min(elapsedTime / task.duration, 1);

      // プログレス更新
      taskData.progress = progress * 100;

      // タスク完了チェック
      if (progress >= 1) {
        this.completeTeamTask(teamId, taskData);
        completedTasks.push(teamId);
      }
    });

    // 完了したタスクを削除
    completedTasks.forEach(teamId => {
      this.activeTeamTasks.delete(teamId);
    });

    // UIに進行状況を通知
    this.eventBus.emit('TEAM_WORK_PROGRESS', {
      activeTeamTasks: this.getActiveTeamTasksForUI()
    });
  }

  private completeTeamTask(teamId: string, taskData: any): void {
    const { team, task } = taskData;

    // 報酬の計算
    const teamEfficiency = this.calculateTeamEfficiency(team, task);
    
    // リソース報酬
    if (task.rewards.resources) {
      for (const [resourceId, baseAmount] of Object.entries(task.rewards.resources)) {
        const actualAmount = Math.floor((baseAmount as number) * teamEfficiency);
        this.centralStateManager.addResource(resourceId, actualAmount, `Team task reward: ${task.name}`);
      }
    }

    // 経験値報酬
    if (task.rewards.experience) {
      team.members.forEach((character: Character) => {
        for (const [skillType, baseExp] of Object.entries(task.rewards.experience)) {
          const actualExp = Math.floor((baseExp as number) * teamEfficiency / team.members.length);
          this.addExperienceToCharacter(character, skillType as any, actualExp);
        }
      });
    }

    console.log(`Team ${team.name} completed task ${task.name} with ${(teamEfficiency * 100).toFixed(1)}% efficiency`);

    // タスク完了イベント
    this.eventBus.emit(GameEvents.TASK_COMPLETE, {
      teamId: teamId,
      teamName: team.name,
      taskName: task.name,
      efficiency: teamEfficiency
    });
  }

  private calculateTeamEfficiency(team: Team, task: TaskDefinition): number {
    let totalSkillLevel = 0;
    let totalMembers = team.members.length;
    let relevantSkillCount = 0;

    // 関連スキルの平均レベルを計算
    if (task.requiredSkills) {
      task.requiredSkills.forEach(skillType => {
        team.members.forEach(character => {
          const skill = character.skills.get(skillType as any);
          if (skill) {
            totalSkillLevel += skill.level;
            relevantSkillCount++;
          }
        });
      });
    }

    // 基本効率（0.5 - 1.5）
    const baseEfficiency = 0.8;
    
    // スキルボーナス
    const avgSkillLevel = relevantSkillCount > 0 ? totalSkillLevel / relevantSkillCount : 1;
    const skillBonus = Math.min(avgSkillLevel * 0.1, 0.5); // 最大50%ボーナス

    // チームサイズボーナス/ペナルティ
    const minSize = task.requirements?.minTeamSize || 1;
    const maxSize = task.requirements?.maxTeamSize || 6;
    const optimalSize = Math.floor((minSize + maxSize) / 2);
    const sizeRatio = totalMembers / optimalSize;
    const sizeModifier = sizeRatio > 1 ? 1 / sizeRatio : sizeRatio;

    // ステータスペナルティ（疲労、怪我など）
    const avgHealth = team.members.reduce((sum, char) => sum + char.status.health, 0) / totalMembers;
    const avgStamina = team.members.reduce((sum, char) => sum + char.status.stamina, 0) / totalMembers;
    const statusModifier = (avgHealth + avgStamina) / 200; // 0-1の範囲

    const finalEfficiency = baseEfficiency + skillBonus * sizeModifier * statusModifier;
    return Math.max(0.1, Math.min(2.0, finalEfficiency)); // 10%～200%の範囲
  }

  private addExperienceToCharacter(character: Character, skillType: string, experience: number): void {
    // Characterクラスに経験値追加メソッドがあるか確認して使用
    // 現在は簡易的にイベントのみ発火
    this.eventBus.emit(GameEvents.CHARACTER_SKILL_UP, {
      characterId: character.id,
      skill: skillType,
      expGained: experience
    });
  }

  private calculateLevel(experience: number): number {
    // 簡単なレベル計算（100exp per level）
    return Math.floor(experience / 100) + 1;
  }

  getActiveTeamTasksForUI(): any[] {
    const result: any[] = [];
    this.activeTeamTasks.forEach((taskData, teamId) => {
      result.push({
        teamId: teamId,
        teamName: taskData.team.name,
        taskName: taskData.task.name,
        progress: taskData.progress
      });
    });
    return result;
  }

  getTaskDefinition(taskId: string): TaskDefinition | undefined {
    return this.taskDefinitions.get(taskId);
  }

  getAllTaskDefinitions(): TaskDefinition[] {
    return Array.from(this.taskDefinitions.values());
  }

  isTeamBusy(teamId: string): boolean {
    return this.activeTeamTasks.has(teamId);
  }

  getTeamTaskProgress(teamId: string): number {
    const taskData = this.activeTeamTasks.get(teamId);
    return taskData ? taskData.progress : 0;
  }

  protected onStart(): void {
    console.log('TeamWorkSystem started');
  }

  protected onStop(): void {
    console.log('TeamWorkSystem stopped');
  }

  protected onUpdate(deltaTime: number): void {
    // リアルタイム更新が必要な場合はここで処理
  }

  protected onDestroy(): void {
    console.log('TeamWorkSystem destroyed');
    this.activeTeamTasks.clear();
  }
}