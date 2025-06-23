export interface Team {
  id: string;
  name: string;
  members: any[]; // TODO: replace with proper Character type
  currentTask?: string;
  taskProgress?: number;
  efficiency?: number;
}

export interface TaskDefinition {
  id: string;
  name: string;
  category: string;
  duration: number; // 秒単位
  requiredSkills?: string[];
  rewards: {
    resources?: Record<string, number>;
    experience?: Record<string, number>;
  };
  requirements?: {
    resources?: Record<string, number>;
    minTeamSize?: number;
    maxTeamSize?: number;
  };
}

export interface TeamTaskResult {
  taskId: string;
  teamId: string;
  progress: number;
  completed: boolean;
  rewards: {
    resources?: Record<string, number>;
    experience?: Record<string, number>;
  };
}