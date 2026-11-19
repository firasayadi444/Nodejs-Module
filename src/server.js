import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createHivesRepository } from "./repositories/memory/hives.repository.js";
import { createInspectionsRepository } from "./repositories/memory/inspections.repository.js";
import { createMeasuresRepository } from "./repositories/memory/measures.repository.js";

let config;
try {
  config = readConfig();
} catch (error) {
  console.error(`Configuration invalide : ${error.message}`);
  process.exit(1);
}

const app = createApp({
  hivesRepository: createHivesRepository(),
  measuresRepository: createMeasuresRepository(),
  inspectionsRepository: createInspectionsRepository(),
});

app.listen(config.port, () => {
  console.log(`API Queen Bee (${config.nodeEnv}) sur http://localhost:${config.port}`);
});
