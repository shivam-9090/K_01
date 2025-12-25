import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  async searchUsers(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    const result = await this.searchService.searchUsers(query, page, pageSize);

    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get('users/email')
  async searchByEmail(@Query('email') email: string) {
    const results = await this.searchService.searchByEmail(email);

    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: { results },
    };
  }

  @Get('users/role')
  async searchByRole(
    @Query('role') role: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    const result = await this.searchService.searchByRole(role, page, pageSize);

    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get('users/advanced')
  async advancedSearch(
    @Query('q') query?: string,
    @Query('role') role?: string,
    @Query('twoFactorEnabled', new DefaultValuePipe(undefined), ParseBoolPipe)
    twoFactorEnabled?: boolean,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize?: number,
  ) {
    const result = await this.searchService.advancedSearch({
      query,
      role,
      twoFactorEnabled,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      createdBefore: createdBefore ? new Date(createdBefore) : undefined,
      page,
      pageSize,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Search results retrieved successfully',
      data: result,
    };
  }

  @Get('stats')
  async getUserStats() {
    const stats = await this.searchService.getUserStats();

    return {
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }
}
