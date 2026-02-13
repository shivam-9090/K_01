import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  teamType: string; // frontend, backend, ai/ml, devops, mobile, testing, database, ui/ux, other

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  memberIds?: string[];
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  teamType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  memberIds?: string[];
}
