export interface HelloEntity {
    id: string;
    name: string;
    message: string;
}

export interface HelloListDto {
    items: HelloEntity[];
}

export interface DeleteResponseDto {
    success: boolean;
}
