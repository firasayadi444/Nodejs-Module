export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    listHives: async (req, res) => {
      res.status(200).json(await hivesService.listHives(req.validated.site_id));
    },

    getHive: async (req, res) => {
      res.status(200).json(await hivesService.getHive(req.params.id));
    },

    addMeasure: async (req, res) => {
      const measure = await measuresService.addMeasure(req.params.id, req.validated);
      res.status(201).json(measure);
    },

    listMeasures: async (req, res) => {
      const result = await measuresService.listMeasures(req.params.id, req.validated);
      res.status(200).json(result);
    },

    listInspections: async (req, res) => {
      res.status(200).json(await inspectionsService.listInspections(req.params.id, req.validated));
    },

    addInspection: async (req, res) => {
      const inspection = await inspectionsService.addInspection(req.params.id, req.validated);
      res.status(201).json(inspection);
    },
  };
}
