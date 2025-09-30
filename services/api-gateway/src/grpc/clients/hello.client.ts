import { Observable } from 'rxjs';

export interface Hello {
  id: string;
  message: string;
}

export interface HelloList {
  items: Hello[];
}

export interface HelloServiceClient {
  GetHello(data: { id: string }, metadata?: any): Observable<Hello>;
  GetAllHellos(data: {}, metadata?: any): Observable<HelloList>;
  CreateHello(data: { message: string }, metadata?: any): Observable<Hello>;
  UpdateHello(
    data: { id: string; message?: string },
    metadata?: any,
  ): Observable<Hello>;
  DeleteHello(
    data: { id: string },
    metadata?: any,
  ): Observable<{ ok: boolean }>;
}
