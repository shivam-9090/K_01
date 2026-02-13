import { IsString, IsNotEmpty } from 'class-validator';

export class ExpandStepDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  taskTitle: string;

  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsString()
  @IsNotEmpty()
  taskType: string;

  @IsString()
  @IsNotEmpty()
  stepTitle: string;

  @IsString()
  @IsNotEmpty()
  stepDescription: string;
}
