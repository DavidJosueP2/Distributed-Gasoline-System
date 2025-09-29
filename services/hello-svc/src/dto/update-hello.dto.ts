import { IsString, IsOptional, Length, IsNotEmpty } from 'class-validator';

export class UpdateHelloDto {
    @IsString({ message: 'id must be a string' })
    @IsNotEmpty({ message: 'id should not be empty' })
    id!: string;

    @IsOptional()
    @IsString({ message: 'name must be a string' })
    @Length(2, 50, { message: 'name length must be between 2 and 50' })
    name?: string;

    @IsOptional()
    @IsString({ message: 'message must be a string' })
    @Length(3, 200, { message: 'message length must be between 3 and 200' })
    message?: string;
}
