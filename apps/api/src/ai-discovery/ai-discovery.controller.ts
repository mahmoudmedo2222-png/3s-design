import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { AiDiscoveryService } from './ai-discovery.service';
import { AiDiscoveryQueryDto } from './dto/ai-discovery-query.dto';
import { CreateAiDiscoverySessionDto } from './dto/create-ai-discovery-session.dto';
import { SendAiDiscoveryMessageDto } from './dto/send-ai-discovery-message.dto';

@Controller('ai/discovery')
export class AiDiscoveryController {
  constructor(@Inject(AiDiscoveryService) private readonly discovery: AiDiscoveryService) {}

  @Post('suggest')
  suggest(@Body() input: AiDiscoveryQueryDto) {
    return this.discovery.suggest(input);
  }

  @Get('status')
  getStatus() {
    return this.discovery.getStatus();
  }

  @Post('sessions')
  createSession(@Body() input: CreateAiDiscoverySessionDto) {
    return this.discovery.createSession(input);
  }

  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.discovery.getSession(sessionId);
  }

  @Post('sessions/:sessionId/messages')
  sendMessage(@Param('sessionId') sessionId: string, @Body() input: SendAiDiscoveryMessageDto) {
    return this.discovery.sendMessage(sessionId, input);
  }
}
