import { createHivesRepository } from "./hives.repository.js";
import { createInspectionsRepository } from "./inspections.repository.js";
import { createMeasuresRepository } from "./measures.repository.js";
import { createUsersRepository } from "./users.repository.js";

export function createMemoryRepositories({ users = [], hives } = {}) {
  return {
    hivesRepository: createHivesRepository(hives),
    measuresRepository: createMeasuresRepository(),
    inspectionsRepository: createInspectionsRepository(),
    usersRepository: createUsersRepository(users),
  };
}
