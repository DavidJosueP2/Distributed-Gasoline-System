import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway' };
  }
}

