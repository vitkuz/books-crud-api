import { User, UserPatch } from './users.types';

const store: Map<string, User> = new Map<string, User>();

export const insertUser = (user: User): User => {
  store.set(user.id, user);
  return user;
};

export const findAllUsers = (): User[] => Array.from(store.values());

export const findUserById = (id: string): User | undefined => store.get(id);

export const findUserByEmail = (email: string): User | undefined => {
  const needle: string = email.toLowerCase();
  for (const user of store.values()) {
    if (user.email.toLowerCase() === needle) return user;
  }
  return undefined;
};

export const countUsers = (): number => store.size;

export const replaceUser = (id: string, patch: UserPatch): User | undefined => {
  const existing: User | undefined = store.get(id);
  if (!existing) return undefined;
  const updated: User = {
    ...existing,
    ...patch,
    id: existing.id,
    metadata: {
      createdAt: existing.metadata.createdAt,
      updatedAt: new Date().toISOString(),
    },
  };
  store.set(id, updated);
  return updated;
};

export const removeUser = (id: string): boolean => store.delete(id);
