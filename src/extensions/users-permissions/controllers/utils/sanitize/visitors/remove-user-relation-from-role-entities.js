"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ schema, key, attribute }, { remove }) => {
    if (attribute && attribute.type === 'relation' && attribute.target === 'plugin::users-permissions.user' && schema.uid === 'plugin::users-permissions.role') {
        remove(key);
    }
};
