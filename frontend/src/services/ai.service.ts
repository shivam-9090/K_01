import axios from "axios";

// Setup axios interceptor for debugging
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: string;
  dependencies: string[]; // IDs of steps that must be completed first
  type?: "frontend" | "backend" | "database" | "devops" | "other";
  status?: "pending" | "in-progress" | "completed";
}

export interface TaskRoadmap {
  taskId: string;
  steps: RoadmapStep[];
  generatedAt: string;
}

export interface StepExecutionDetail {
  stepGoal: string;
  detailedActions: Array<{
    action: string;
    howToExecute: string;
    output: string;
  }>;
  toolsOrResources: string[];
  commonPitfalls: string[];
  doneWhen: string[];
}

class AIService {
  private baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  /**
   * Generate a task roadmap using AI based on task title and description
   */
  async generateTaskRoadmap(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    taskType: string,
  ): Promise<TaskRoadmap> {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("accessToken");

      if (!token) {
        throw new Error("No access token found. Please login first.");
      }

      const response = await axios.post(
        `${this.baseURL}/ai/generate-roadmap`,
        {
          taskId,
          taskTitle,
          taskDescription,
          taskType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error: any) {
      // Re-throw error instead of using fallback
      throw new Error(
        error.response?.data?.message ||
          "Failed to generate AI roadmap. Please try again.",
      );
    }
  }

  /**
   * Get cached roadmap if exists
   */
  async getCachedRoadmap(taskId: string): Promise<TaskRoadmap | null> {
    const cached = localStorage.getItem(`roadmap_${taskId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  /**
   * Cache roadmap locally
   */
  cacheRoadmap(roadmap: TaskRoadmap): void {
    localStorage.setItem(`roadmap_${roadmap.taskId}`, JSON.stringify(roadmap));
  }

  /**
   * Clear cache for a specific task (used for testing)
   */
  clearCache(taskId: string): void {
    localStorage.removeItem(`roadmap_${taskId}`);
  }

  /**
   * Clear all AI caches
   */
  clearAllCaches(): void {
    for (const key in localStorage) {
      if (key.startsWith("roadmap_")) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Expand a specific roadmap step to get detailed execution guide
   */
  async expandRoadmapStep(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    taskType: string,
    stepTitle: string,
    stepDescription: string,
  ): Promise<StepExecutionDetail> {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No access token found. Please login first.");
      }

      const response = await axios.post(
        `${this.baseURL}/ai/expand-step`,
        {
          taskId,
          taskTitle,
          taskDescription,
          taskType,
          stepTitle,
          stepDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to expand roadmap step",
      );
    }
  }
}

export const aiService = new AIService();
