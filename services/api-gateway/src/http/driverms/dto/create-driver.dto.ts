import { IsInt, IsOptional } from 'class-validator';

export class CreateDriverDto {
    @IsInt()
    user_id: number;

    @IsOptional()
    @IsInt()
    availability?: number;
}
