import { NotFoundError } from "../errors.js";

export function createHivesService({ hivesRepository }) {
  return {
    async listHives(user, requestedSiteId) {
      if (typeof user === "string" || user == null) {
        return hivesRepository.findAll({ site_id: requestedSiteId ?? user ?? undefined });
      }
      if (user.role === "coordinateur") return hivesRepository.findAll({ site_id: user.site_id });
      if (user.role === "apiculteur") {
        return hivesRepository.findAll({ site_id: requestedSiteId, owner_id: user.sub });
      }
      return hivesRepository.findAll({ site_id: requestedSiteId });
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
