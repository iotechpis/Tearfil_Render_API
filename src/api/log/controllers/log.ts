const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::log.log', ({ strapi }) => ({

  async find(ctx) {
    const user = ctx.state.user; 
    const { machineId } = ctx.query;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    let filters: { machine?: string | { $in: string[] } } = {};

    if (machineId) {
      // Caso query venha com máquina específica
      filters.machine = machineId;
    } else {
      // Caso NÃO venha máquina → buscar warehouse do user
      const warehouse = await strapi.db.query('api::warehouse.warehouse').findOne({
        where: { user: user.id },
        populate: ['machines'],
      });

      if (!warehouse) {
        return ctx.notFound('Warehouse not found for this user');
      }

      const machineIds = warehouse.machines.map(m => m.id);

      filters.machine = { $in: machineIds };
    }

    const logs = await strapi.db.query('api::log.log').findMany({
      where: filters,
      populate: ['machine', 'variables_of_consumption'],
      orderBy: { date: 'desc' }
    });

    return logs;
  }

}));
