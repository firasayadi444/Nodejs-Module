import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { canAccessHive } from "../utils/access.js";
import { MESSAGES } from "../validators/messages.js";
import { inspectionSchema, inspectionSyncItemSchema } from "../validators/schemas.js";

function sameInspection(left, right) {
  return left.hive_id === right.hive_id
    && new Date(left.inspected_at).getTime() === new Date(right.inspected_at).getTime()
    && (left.queen_present ?? null) === (right.queen_present ?? null)
    && left.colony_status === right.colony_status
    && (left.observations ?? null) === (right.observations ?? null);
}

function makeInspection(input, authorId) {
  return {
    id: input.id,
    hive_id: input.hive_id,
    author_id: authorId,
    inspected_at: input.inspected_at,
    queen_present: input.queen_present ?? null,
    colony_status: input.colony_status,
    observations: input.observations ?? null,
  };
}

function validationDetail(error) {
  return error.details.map((detail) => detail.message).join(" ");
}

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  async function createOrGet(inspection) {
    const result = await inspectionsRepository.createIfAbsent(inspection);
    if (result.created) return result;
    if (result.inspection && sameInspection(result.inspection, inspection)) return result;
    throw new ConflictError("Une inspection avec cet identifiant existe déjà avec des données différentes.");
  }

  return {
    async listInspections(hiveId, { limit, offset } = {}) {
      await hivesService.getHive(hiveId);
      const inspections = await inspectionsRepository.findByHive(hiveId);
      return limit === undefined ? inspections : inspections.slice(offset, offset + limit);
    },

    async addInspection(hiveId, input) {
      await hivesService.getHive(hiveId);
      const { author_id: authorId, ...body } = input;
      const { value, error } = inspectionSchema.validate(body, {
        abortEarly: false,
        messages: MESSAGES,
        errors: { wrap: { label: false } },
      });
      if (error) throw new ValidationError(validationDetail(error));
      const inspection = makeInspection({ ...value, hive_id: hiveId }, authorId);
      const existing = await inspectionsRepository.findById(inspection.id);
      if (existing) {
        if (sameInspection(existing, inspection)) return existing;
        throw new ConflictError("Une inspection avec cet identifiant existe déjà avec des données différentes.");
      }
      return (await createOrGet(inspection)).inspection;
    },

    async syncOne(user, input, index) {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { index, status: "rejected", detail: "Chaque élément doit être un objet JSON." };
      }
      const { value, error } = inspectionSyncItemSchema.validate(input, {
        abortEarly: false,
        messages: MESSAGES,
        errors: { wrap: { label: false } },
      });
      if (error) {
        return { index, ...(input.id ? { id: input.id } : {}), status: "rejected", detail: validationDetail(error) };
      }

      let hive;
      try {
        hive = await hivesService.getHive(value.hive_id);
      } catch (cause) {
        if (cause instanceof NotFoundError) {
          return { index, id: value.id, status: "rejected", detail: cause.message };
        }
        throw cause;
      }
      if (!canAccessHive(user, hive)) {
        return { index, id: value.id, status: "rejected", detail: "Vous n’avez pas accès à cette ruche." };
      }

      const inspection = makeInspection(value, user.sub);
      const existing = await inspectionsRepository.findById(inspection.id);
      if (!existing) {
        const created = await inspectionsRepository.createIfAbsent(inspection);
        if (created.created) return { index, id: value.id, status: "created", inspection: created.inspection };
        if (created.inspection && sameInspection(created.inspection, inspection)) {
          return { index, id: value.id, status: "unchanged", inspection: created.inspection };
        }
        return {
          index,
          id: value.id,
          status: "conflict",
          current_version: created.inspection?.version,
          detail: "Une inspection avec cet identifiant a été enregistrée entre-temps.",
        };
      }

      if (existing.hive_id !== inspection.hive_id) {
        let originalHive;
        try {
          originalHive = await hivesService.getHive(existing.hive_id);
        } catch (cause) {
          if (cause instanceof NotFoundError) {
            return { index, id: value.id, status: "rejected", detail: "Vous n’avez pas accès à cette inspection." };
          }
          throw cause;
        }
        if (!canAccessHive(user, originalHive)) {
          return { index, id: value.id, status: "rejected", detail: "Vous n’avez pas accès à cette inspection." };
        }
        return { index, id: value.id, status: "conflict", current_version: existing.version, detail: "Une inspection ne peut pas être déplacée vers une autre ruche." };
      }
      if (sameInspection(existing, inspection)) {
        return { index, id: value.id, status: "unchanged", inspection: existing };
      }
      if (value.version === undefined || value.version !== existing.version) {
        return {
          index,
          id: value.id,
          status: "conflict",
          current_version: existing.version,
          detail: "La version envoyée est périmée; la version du serveur est conservée.",
        };
      }

      const updated = await inspectionsRepository.updateIfVersion(inspection, value.version);
      if (updated) return { index, id: value.id, status: "updated", inspection: updated };
      const latest = await inspectionsRepository.findById(inspection.id);
      if (latest && sameInspection(latest, inspection)) {
        return { index, id: value.id, status: "unchanged", inspection: latest };
      }
      return {
        index,
        id: value.id,
        status: "conflict",
        current_version: latest?.version,
        detail: "L’inspection a été modifiée en parallèle; la version du serveur est conservée.",
      };
    },

    async sync(user, items) {
      const results = [];
      for (const [index, item] of items.entries()) {
        try {
          results.push(await this.syncOne(user, item, index));
        } catch (error) {
          results.push({
            index,
            ...(item && typeof item === "object" && item.id ? { id: item.id } : {}),
            status: "rejected",
            detail: error instanceof ForbiddenError || error instanceof NotFoundError
              ? error.message
              : "L’inspection n’a pas pu être enregistrée.",
          });
        }
      }
      return results;
    },
  };
}
