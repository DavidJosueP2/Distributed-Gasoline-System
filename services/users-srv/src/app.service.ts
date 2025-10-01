// This file is kept for compatibility but not used in the gRPC microservice
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Stub method not used in the microservice
  getHello(): string {
    return 'Users Service';
  }
}
