import { createManyFactory } from './operations/create-many';
import { createOneFactory } from './operations/create-one';
import { deleteManyByIdsFactory } from './operations/delete-many-by-ids';
import { deleteOneByIdFactory } from './operations/delete-one-by-id';
import { getManyByIdsFactory } from './operations/get-many-by-ids';
import { getOneByIdFactory } from './operations/get-one-by-id';
import { listAllFactory } from './operations/list-all';
import { patchManyByIdsFactory } from './operations/patch-many-by-ids';
import { patchOneByIdFactory } from './operations/patch-one-by-id';
import { DynamoDbClient, DynamoDbClientSettings } from './types';

export const createDynamoDbClient = (settings: DynamoDbClientSettings): DynamoDbClient => ({
  getOneById: getOneByIdFactory(settings),
  getManyByIds: getManyByIdsFactory(settings),
  createOne: createOneFactory(settings),
  createMany: createManyFactory(settings),
  deleteOneById: deleteOneByIdFactory(settings),
  deleteManyByIds: deleteManyByIdsFactory(settings),
  patchOneById: patchOneByIdFactory(settings),
  patchManyByIds: patchManyByIdsFactory(settings),
  listAll: listAllFactory(settings),
});
