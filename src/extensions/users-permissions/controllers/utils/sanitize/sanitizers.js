"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fp_1 = require("lodash/fp");
const utils_1 = require("@strapi/utils");
const visitors_1 = require("./visitors");
const sanitizeUserRelationFromRoleEntities = (0, fp_1.curry)((schema, entity) => {
    // @ts-ignore
    return (0, utils_1.traverseEntity)(visitors_1.removeUserRelationFromRoleEntities, { schema, getModel: strapi.getModel.bind(strapi) }, entity);
});
const defaultSanitizeOutput = (0, fp_1.curry)((schema, entity) => {
    return utils_1.async.pipe(sanitizeUserRelationFromRoleEntities(schema))(entity);
});
exports.default = {
    sanitizeUserRelationFromRoleEntities,
    defaultSanitizeOutput,
};
