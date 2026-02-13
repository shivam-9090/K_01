import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of records to skip',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of records to take',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 10;

  @ApiPropertyOptional({
    description: 'Page number (alternative to skip)',
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Calculate skip value from page number
   */
  getSkip(): number {
    if (this.page) {
      return (this.page - 1) * (this.take || 10);
    }
    return this.skip || 0;
  }

  /**
   * Get take value
   */
  getTake(): number {
    return this.take || 10;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationDto,
): PaginatedResponse<T> {
  const skip = pagination.getSkip();
  const take = pagination.getTake();

  return {
    data,
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}
