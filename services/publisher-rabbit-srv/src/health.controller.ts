import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return { status: 'ok', service: 'publisher-rabbit-srv' };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'publisher-rabbit-srv' };
  }
}

