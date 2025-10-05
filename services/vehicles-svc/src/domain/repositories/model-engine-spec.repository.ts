import { Prisma } from '@prisma/client';
import {ModelEngineSpec} from "../entities/model-engine-spec";

export type Tx = Prisma.TransactionClient;

export interface ModelEngineSpecRepository {
    findByModelId(modelId: bigint, tx?: Tx): Promise<ModelEngineSpec | null>;
    upsertForModel(modelId: bigint, spec: ModelEngineSpec, tx?: Tx): Promise<void>;
    deleteForModel(modelId: bigint, tx?: Tx): Promise<void>;
}
