import * as bureausRepo from './bureaus.repo.js';

export async function listBureaus() {
  return await bureausRepo.findActiveBureaus();
}
