import { IsNumber } from 'class-validator';

export class AddInclusionDto {
  @IsNumber()
  parentId: number;

  @IsNumber()
  childId: number;
}
