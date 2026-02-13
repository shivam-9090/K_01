import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  IsIn,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @IsOptional()
  @IsString()
  githubRepoName?: string;

  @IsOptional()
  @IsString()
  githubRepoUrl?: string;

  @IsOptional()
  @IsString()
  githubRepoBranch?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @IsOptional()
  @IsIn(['active', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  githubRepoName?: string;

  @IsOptional()
  @IsString()
  githubRepoUrl?: string;

  @IsOptional()
  @IsString()
  githubRepoBranch?: string;
}
