/**
 * warehouse controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::warehouse.warehouse', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;

        if (!user) {
            return ctx.unauthorized('Usuário não autenticado');
        }

        const entity = await strapi.entityService.findMany('api::warehouse.warehouse', {
            filters: {
                user: user.id,
            },
            populate: ['model3D', 'machines.limits.variables_of_consumption', 'machines.codes'],
        });

        if (!entity) {
            return ctx.notFound('Warehouse não encontrado ou não pertence ao usuário');
        }

        return entity;
    },
}));
