import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  healthCheck() {
    return this.appService.getHealthCheck();
  }

  @Post('/webhook/github')
  githubWebhook(@Body() _payload: any) {
    // Dummy webhook handler for GitHub events
    return { success: true, message: 'Webhook received' };
  }
}
