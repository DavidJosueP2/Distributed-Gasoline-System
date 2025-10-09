import { IsNumber } from 'class-validator';

export class RemoveInclusionDto {
  @IsNumber()
  parentId: number;

  @IsNumber()
  childId: number;
}
