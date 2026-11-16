import { LocalStorageRepository, getBrowserStorage } from '../lib/storage';
import { createAppStore } from './appStore';

/**
 * 全站唯一的資料 store。要改用其他資料庫時，
 * 只需要在這裡換成另一個實作 DataRepository 的物件。
 */
export const repository = new LocalStorageRepository(getBrowserStorage());
export const useAppStore = createAppStore(repository);
