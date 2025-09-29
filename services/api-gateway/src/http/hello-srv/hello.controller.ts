import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Put } from '@nestjs/common';
import { Observable, from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { HelloServiceClient, Hello } from '../../grpc/clients/hello.client';

@Controller('hellos')
export class HelloController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: any): Promise<HelloServiceClient> {
        const appName = process.env.HELLO_APP_NAME || 'HELLO-SERVICE';
        const client = await this.factory.forService(appName, 'hello', 'hello.proto');
        return client.getService<HelloServiceClient>('HelloService');
    }

    @Get(':id')
    @GrpcTimeout(1500)
    getOne(@Param('id') id: string, @Req() req: any): Observable<Hello> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.GetHello({ id }, req._grpcMetadata))
        );
    }

    @Get()
    getAll(@Req() req: any): Observable<Hello[]> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.GetAllHellos({}, req._grpcMetadata)),
            map(r => r.items)
        );
    }

    @Post()
    create(@Body() dto: { message: string }, @Req() req: any): Observable<Hello> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.CreateHello(dto, req._grpcMetadata))
        );
    }

    @Put(':id')
    @GrpcTimeout(1500)
    putOne(@Param('id') id: string, @Body() dto: { message?: string }, @Req() req: any): Observable<Hello> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.UpdateHello({ id, ...dto }, req._grpcMetadata))
        );
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: { message?: string }, @Req() req: any): Observable<Hello> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.UpdateHello({ id, ...dto }, req._grpcMetadata))
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any): Observable<{ ok: boolean }> {
        return from(this.svc(req)).pipe(
            switchMap(s => s.DeleteHello({ id }, req._grpcMetadata))
        );
    }
}
