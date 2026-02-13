import { Controller, Post, Body, UseGuards, Logger, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { AiService } from './ai.service';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';
import { ExpandStepDto } from './dto/expand-step.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @ApiOperation({
    summary: 'AI service health',
    description: 'Check if AI service is operational',
  })
  @ApiResponse({ status: 200, description: 'AI service is running' })
  healthCheck() {
    this.logger.log(`🏥 AI service health check`);
    return {
      status: 'AI service is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('generate-roadmap')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate task roadmap',
    description: 'Use AI (Gemini) to generate step-by-step roadmap for a task',
  })
  @ApiResponse({ status: 200, description: 'Roadmap generated successfully' })
  @ApiResponse({ status: 500, description: 'AI service error' })
  @UseGuards(JwtAuthGuard)
  async generateRoadmap(@Body() dto: GenerateRoadmapDto) {
    this.logger.log(`📥 API Endpoint: /ai/generate-roadmap called`);
    this.logger.log(`📦 Received request:`, {
      taskId: dto.taskId,
      taskTitle: dto.taskTitle,
      taskType: dto.taskType,
    });

    const result = await this.aiService.generateTaskRoadmap(dto);

    this.logger.log(`✅ Returning roadmap with ${result.steps.length} steps`);
    return result;
  }

  @Post('expand-step')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Expand roadmap step',
    description: 'Expand a roadmap step into detailed sub-steps using AI',
  })
  @ApiResponse({ status: 200, description: 'Step expanded successfully' })
  @UseGuards(JwtAuthGuard)
  async expandStep(@Body() dto: ExpandStepDto) {
    this.logger.log(`📥 API Endpoint: /ai/expand-step called`);
    this.logger.log(
      `📦 Expanding step: "${dto.stepTitle}" for task: ${dto.taskTitle}`,
    );

    const result = await this.aiService.expandRoadmapStep(
      dto.taskId,
      dto.taskTitle,
      dto.taskDescription,
      dto.taskType,
      dto.stepTitle,
      dto.stepDescription,
    );

    this.logger.log(`✅ Step expansion completed successfully`);
    return result;
  }
}
