import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
    pageSize?: number = 20;

    @IsOptional() @IsString()
    pageToken?: string;
}

export class PaginationResultDto {
    @IsString()
    nextPageToken!: string;
}
