"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getService = void 0;
const getService = (name) => {
    return strapi.plugin('users-permissions').service(name);
};
exports.getService = getService;
exports.default = {
    getService,
};
