import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateHelloDto {
    @IsString({ message: 'name must be a string' })
    @IsNotEmpty({ message: 'name should not be empty' })
    @Length(2, 50, { message: 'name length must be between 2 and 50' })
    name!: string;

    @IsString({ message: 'message must be a string' })
    @IsNotEmpty({ message: 'message should not be empty' })
    @Length(3, 200, { message: 'message length must be between 3 and 200' })
    message!: string;
}
