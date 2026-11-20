import { createHivesRepository } from "./hives.repository.js";
import { createInspectionsRepository } from "./inspections.repository.js";
import { createMeasuresRepository } from "./measures.repository.js";

export function createMemoryRepositories() {
  return {
    hivesRepository: createHivesRepository(),
    measuresRepository: createMeasuresRepository(),
    inspectionsRepository: createInspectionsRepository(),
  };
}
