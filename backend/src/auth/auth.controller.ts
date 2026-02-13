import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/auth.guard';
import { GitHubOAuthService } from './github-oauth.service';
import { Response } from 'express';
import { IpAddressValidator } from '../common/validators/ip-address.validator';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private githubOAuthService: GitHubOAuthService,
  ) {}

  private getFrontendBaseUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register BOSS account',
    description:
      'Creates a new BOSS user with their company. First user automatically becomes company owner.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully with JWT tokens',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate email/username',
  })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    return this.authService.register(registerDto, this.extractClient(req));
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate with email/password. Returns access token (15min) and refresh token (7 days).',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(loginDto, this.extractClient(req));
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange refresh token for new access token',
  })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Request() req,
  ) {
    return this.authService.refreshAccessToken(
      refreshToken,
      this.extractClient(req),
    );
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate refresh token and end session',
  })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string, @Request() req) {
    await this.authService.logout(refreshToken, req.user?.userId);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change current user password (requires old password)',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Incorrect old password' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.userId,
      changePasswordDto,
      this.extractClient(req),
    );
    return { message: 'Password changed successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email (rate limited: 3 per 5 minutes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300 } }) // 3 attempts per 5 minutes
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using token from email',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return { message: 'Password has been reset successfully' };
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    return req.user;
  }

  // GitHub OAuth - Get authorization URL
  @Get('github/url')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get GitHub OAuth URL',
    description: 'Returns GitHub authorization URL for linking account',
  })
  @ApiResponse({ status: 200, description: 'Authorization URL generated' })
  @UseGuards(JwtAuthGuard)
  async getGitHubAuthUrl() {
    const url = this.githubOAuthService.getAuthorizationUrl();
    return { url };
  }

  // GitHub OAuth - Callback handler
  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendBaseUrl = this.getFrontendBaseUrl();

    try {
      if (!code) {
        return res.redirect(`${frontendBaseUrl}/profile?error=no_code`);
      }

      // Store code in session/temp storage for the frontend to use
      // For now, redirect with code
      return res.redirect(
        `${frontendBaseUrl}/profile?github_code=${encodeURIComponent(code)}`,
      );
    } catch (error) {
      return res.redirect(`${frontendBaseUrl}/profile?error=auth_failed`);
    }
  }

  // GitHub OAuth - Link account
  @Post('github/link')
  @UseGuards(JwtAuthGuard)
  async linkGitHubAccount(@Request() req, @Body('code') code: string) {
    return this.githubOAuthService.linkGitHubAccount(req.user.userId, code);
  }

  // GitHub OAuth - Unlink account
  @Post('github/unlink')
  @UseGuards(JwtAuthGuard)
  async unlinkGitHubAccount(@Request() req) {
    return this.githubOAuthService.unlinkGitHubAccount(req.user.userId);
  }

  // GitHub OAuth - Get user repositories
  @SkipThrottle()
  @Get('github/repositories')
  @UseGuards(JwtAuthGuard)
  async getGitHubRepositories(@Request() req) {
    return this.githubOAuthService.getUserRepositories(req.user.userId);
  }

  // GitHub OAuth - Get repository commits
  @SkipThrottle()
  @Get('github/commits')
  @UseGuards(JwtAuthGuard)
  async getRepositoryCommits(
    @Request() req,
    @Query('repo') repo: string,
    @Query('branch') branch?: string,
    @Query('author') author?: string,
  ) {
    if (!repo) {
      return { error: 'Repository name is required' };
    }
    return this.githubOAuthService.getRepositoryCommits(
      req.user.userId,
      repo,
      branch,
      author,
    );
  }

  // GitHub OAuth - Get repository branches
  @SkipThrottle()
  @Get('github/branches')
  @UseGuards(JwtAuthGuard)
  async getRepositoryBranches(@Request() req, @Query('repo') repo: string) {
    if (!repo) {
      return { error: 'Repository name is required' };
    }
    return this.githubOAuthService.getRepositoryBranches(req.user.userId, repo);
  }

  // GitHub OAuth - Get specific commit by SHA
  @SkipThrottle()
  @Get('github/commit/:sha')
  @UseGuards(JwtAuthGuard)
  async getCommitBySha(
    @Request() req,
    @Param('sha') sha: string,
    @Query('repo') repo: string,
  ) {
    if (!repo) {
      return { error: 'Repository name is required' };
    }
    if (!sha) {
      return { error: 'Commit SHA is required' };
    }
    return this.githubOAuthService.getCommitBySha(req.user.userId, repo, sha);
  }

  private extractClient(req: any) {
    // M-2 Fix: Use IP validator for IPv4/IPv6 validation and proxy support
    const ipAddress = IpAddressValidator.extractFromRequest(req);

    return {
      ip: ipAddress,
      userAgent: req?.headers?.['user-agent'],
    };
  }
}
