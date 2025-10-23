import { Controller, Get } from '@nestjs/common';

@Controller()
export class LoggerController {
  @Get('health')
  health() {
    return { ok: true };
  }
}
