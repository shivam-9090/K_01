import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateRoadmapDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  taskTitle: string;

  @IsString()
  @IsOptional()
  taskDescription?: string;

  @IsString()
  @IsNotEmpty()
  taskType: string;
}
