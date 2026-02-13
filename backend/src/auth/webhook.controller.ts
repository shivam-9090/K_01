import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhookController {
  private getFrontendBaseUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
  }

  // GitHub OAuth - Webhook callback handler (alternative path)
  @Get('github')
  @ApiOperation({
    summary: 'GitHub OAuth Webhook Callback',
    description:
      'Handles GitHub OAuth callback via webhook path (redirects to frontend)',
  })
  async githubWebhook(@Query('code') code: string, @Res() res: Response) {
    const frontendBaseUrl = this.getFrontendBaseUrl();

    try {
      if (!code) {
        return res.redirect(`${frontendBaseUrl}/profile?error=no_code`);
      }

      // Redirect to frontend with the authorization code
      const redirectUrl = `${frontendBaseUrl}/github/callback?github_code=${encodeURIComponent(code)}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      return res.redirect(`${frontendBaseUrl}/profile?error=auth_failed`);
    }
  }
}
