import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: string;
  dependencies: string[];
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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    // Initialize Gemini AI
    const apiKey =
      process.env.GEMINI_API_KEY || 'AIzaSyDnQhImsMiUON76Z_Pon4m_JeEBbnyCxMI';
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash which is available in the new API
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateTaskRoadmap(dto: GenerateRoadmapDto): Promise<TaskRoadmap> {
    const { taskId, taskTitle, taskDescription, taskType } = dto;

    try {
      this.logger.log(
        `🚀 BACKEND: Generating AI roadmap for task: ${taskTitle}`,
      );
      this.logger.log(`📋 Task Details:`, {
        taskId,
        taskType,
        description: taskDescription?.substring(0, 100),
      });

      // Task category hints
      const categoryHint = this.getTaskCategoryHint(taskType);

      const prompt = `You are an elite technical architect generating implementation roadmaps for EXPERIENCED SOFTWARE ENGINEERS.

CONTEXT:
Task: ${taskTitle}
Type: ${taskType}
Details: ${taskDescription || 'No additional context'}

${categoryHint}

ABSOLUTE PROHIBITIONS:
❌ NEVER include these generic steps:
   - "Understand requirements" / "Analyze task"
   - "Set up environment" / "Install dependencies" (unless the task IS about setup)
   - "Plan implementation" / "Design solution"
   - "Test your work" (unless task is specifically about testing)
   - "Documentation" (unless task explicitly requires docs)
   - "Commit changes" / "Push to repo" / "Create PR"
   - "Code review" / "Refactor"
   - "Deploy" (unless task IS deployment)

❌ FORBIDDEN PHRASES:
   - "Begin coding"
   - "Write clean code"
   - "Follow best practices"
   - "Ensure quality"
   - Any advice that applies to ANY task

✅ REQUIRED APPROACH:
1. USER IS AN ENGINEER. Skip beginner advice.
2. Generate ONLY steps that execute THIS SPECIFIC TASK.
3. Each step = ONE concrete technical action.
4. Include file paths, API names, specific function signatures.
5. Step count is DYNAMIC: simple task = 2-4 steps, complex = 10-15 steps.
6. NO FIXED PATTERNS. Every roadmap is unique.

EXAMPLE (for "Add JWT authentication to NestJS API"):
[
  {
    "title": "Install JWT packages and create auth module",
    "description": "Run 'npm i @nestjs/jwt passport-jwt @types/passport-jwt'. Generate module: 'nest g module auth'. Create auth.service.ts and auth.controller.ts.",
    "estimatedTime": "10 mins",
    "dependencies": []
  },
  {
    "title": "Implement JWT signing in AuthService.login()",
    "description": "Create login() method in auth.service.ts. Use JwtService.sign() with payload {userId, email}. Set expiry to 1h. Return {access_token}.",
    "estimatedTime": "25 mins",
    "dependencies": [1]
  },
  {
    "title": "Create JwtAuthGuard with Passport strategy",
    "description": "Create jwt.strategy.ts extending PassportStrategy. Implement validate() to extract user from token. Create jwt-auth.guard.ts. Apply @UseGuards(JwtAuthGuard) to protected routes.",
    "estimatedTime": "30 mins",
    "dependencies": [2]
  },
  {
    "title": "Add token refresh endpoint /auth/refresh",
    "description": "Create refreshToken() in auth.controller.ts. Validate old token, issue new one. Store refresh tokens in Redis with 7d TTL.",
    "estimatedTime": "40 mins",
    "dependencies": [3]
  }
]

NOW GENERATE ROADMAP FOR THE PROVIDED TASK.
Return ONLY valid JSON array. No markdown, no explanations.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.log(`✅ AI API Response received (${text.length} chars)`);
      this.logger.debug(`📝 Raw AI Response:`, text.substring(0, 500));

      // Parse AI response
      const steps = this.parseAIResponse(text, taskId);

      this.logger.log(
        `✅ Successfully parsed ${steps.length} steps from AI response`,
      );

      return {
        taskId,
        steps,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ FAILED to generate AI roadmap: ${error.message}`);
      this.logger.error(`Stack:`, error.stack);

      // DO NOT use generic fallback - throw error so user knows AI failed
      throw new Error(
        `AI roadmap generation failed: ${error.message}. Please try again or check your API key.`,
      );
    }
  }

  private getTaskCategoryHint(taskType: string): string {
    const hints: Record<string, string> = {
      backend:
        'FOCUS: APIs, database queries, authentication flows, middleware, error handling, validation schemas. Example steps: "Create POST /api/auth/login endpoint", "Add bcrypt password hashing in UserService", "Implement JWT refresh token rotation".',
      frontend:
        'FOCUS: React components, state management (Redux/Zustand), API integration, routing, form validation, responsive CSS. Example steps: "Create LoginForm component with useForm hook", "Implement protected route wrapper with auth context", "Add loading states to API calls".',
      testing:
        'FOCUS: Unit tests, integration tests, E2E tests, mocking, test data factories. Example steps: "Write Jest tests for UserService.createUser()", "Mock PrismaClient in auth.service.spec.ts", "Add Playwright E2E test for login flow".',
      devops:
        'FOCUS: CI/CD pipelines, Docker configs, monitoring, deployment scripts. Example steps: "Configure GitHub Actions workflow for auto-deploy", "Add health check endpoint for Kubernetes", "Set up Prometheus metrics export".',
      database:
        'FOCUS: Schema design, migrations, indexes, query optimization. Example steps: "Add composite index on (userId, createdAt)", "Create migration for user_sessions table", "Optimize N+1 query in getTasksWithOwner()".',
      bug: 'FOCUS: Root cause analysis, fix implementation, regression tests. Example steps: "Debug why JWT token expires early (check timezone conversion)", "Fix race condition in payment processing", "Add test case to prevent regression".',
    };

    const normalizedType = taskType.toLowerCase();
    return (
      hints[normalizedType] ||
      'FOCUS: Concrete technical implementation for THIS specific task. No generic advice.'
    );
  }

  async expandRoadmapStep(
    taskId: string,
    taskTitle: string,
    taskDescription: string,
    taskType: string,
    stepTitle: string,
    stepDescription: string,
  ): Promise<StepExecutionDetail> {
    try {
      this.logger.log(
        `🔍 BACKEND: Expanding step "${stepTitle}" for task: ${taskTitle}`,
      );

      const prompt = `You are an AI execution assistant for developers.

Your job is to generate a DETAILED ACTION GUIDE for a SINGLE roadmap step.

CRITICAL RULES:
1. Focus ONLY on the selected step. Do not restate the full roadmap.
2. Instructions must be concrete and executable immediately.
3. Avoid repeating the roadmap step title or description verbatim.
4. Assume the developer is competent, not a beginner.
5. No generic advice or motivational language.
6. If the instructions could apply to a different task or step without modification, regenerate.

CONTEXT:
Task Title: ${taskTitle}
Task Type: ${taskType}
Task Description: ${taskDescription}

SELECTED ROADMAP STEP:
Title: ${stepTitle}
Description: ${stepDescription}

THINKING PROCESS (INTERNAL):
- Clarify what success looks like for this step
- Identify sub-actions required
- Identify tools, files, or systems involved
- Identify common mistakes or blockers

OUTPUT FORMAT (STRICT JSON):
{
  "stepGoal": "Clear one-sentence goal for this step",
  "detailedActions": [
    {
      "action": "Specific action to take",
      "howToExecute": "Concrete instructions on how to do it",
      "output": "What you should see/have when done"
    }
  ],
  "toolsOrResources": ["Tool 1", "File path", "Library name"],
  "commonPitfalls": ["Common mistake 1", "Edge case to watch"],
  "doneWhen": ["Condition 1 is met", "Result 2 is verified"]
}

STYLE:
- Direct and actionable
- Task-specific (not generic)
- No filler or repetition`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.log(
        `✅ Step expansion response received (${text.length} chars)`,
      );

      // Parse JSON response
      const expandedStep = this.parseStepExpansion(text);

      this.logger.log(`✅ Step expansion parsed successfully`);
      return expandedStep;
    } catch (error) {
      this.logger.error(`❌ FAILED to expand step: ${error.message}`);
      this.logger.error(`Stack:`, error.stack);

      // Fallback response
      return {
        stepGoal: `Complete: ${stepTitle}`,
        detailedActions: [
          {
            action: stepTitle,
            howToExecute: stepDescription,
            output: 'Task completed successfully',
          },
        ],
        toolsOrResources: ['IDE', 'Terminal'],
        commonPitfalls: ['Ensure all dependencies are installed'],
        doneWhen: ['Step functionality is verified'],
      };
    }
  }

  private parseStepExpansion(text: string): StepExecutionDetail {
    try {
      // Extract JSON from response
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      return JSON.parse(jsonText);
    } catch (error) {
      this.logger.error(`❌ Failed to parse step expansion: ${error.message}`);
      throw error;
    }
  }

  private parseAIResponse(text: string, taskId: string): RoadmapStep[] {
    try {
      this.logger.log(`🔍 Parsing AI response...`);

      // Extract JSON from response (remove markdown code blocks if present)
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      const parsedSteps = JSON.parse(jsonText);
      this.logger.log(
        `✅ JSON parsed successfully. Found ${parsedSteps.length} steps`,
      );

      // Transform to our format
      return parsedSteps.map((step: any, index: number) => ({
        id: `${index + 1}`,
        title: step.title,
        description: step.description,
        order: index + 1,
        estimatedTime: step.estimatedTime,
        dependencies: step.dependencies?.map((dep: number) => `${dep}`) || [],
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to parse AI response: ${error.message}`);
      this.logger.debug(`Failed text was:`, text.substring(0, 300));
      throw error;
    }
  }
}
