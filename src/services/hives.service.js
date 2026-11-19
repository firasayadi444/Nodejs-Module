import { NotFoundError } from "../errors.js";

export function createHivesService({ hivesRepository }) {
  return {
    async listHives(siteId) {
      return hivesRepository.findAll({ siteId });
    },

    async getHive(hiveId) {
      const hive = await hivesRepository.findById(hiveId);
      if (!hive) {
        throw new NotFoundError(`Aucune ruche ne porte l’identifiant ${hiveId}.`);
      }
      return hive;
    },
  };
}
