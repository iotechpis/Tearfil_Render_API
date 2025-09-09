"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformResponse = exports.parseBody = void 0;
const fp_1 = require("lodash/fp");
const parseMultipartData = (ctx) => {
    const { files, body } = ctx.request;
    return { files, body };
};
function isEntry(property) {
    return property === null || (0, fp_1.isPlainObject)(property) || Array.isArray(property);
}
function isDZEntries(property) {
    return Array.isArray(property);
}
const parseBody = (ctx) => {
    if (ctx.is('multipart')) {
        return parseMultipartData(ctx);
    }
    const { data } = ctx.request.body || {};
    return { data };
};
exports.parseBody = parseBody;
const transformResponse = (resource, meta = {}, opts = {}) => {
    if ((0, fp_1.isNil)(resource)) {
        return resource;
    }
    return {
        data: transformEntry(resource, opts === null || opts === void 0 ? void 0 : opts.contentType),
        meta,
    };
};
exports.transformResponse = transformResponse;
function transformComponent(data, component) {
    if (Array.isArray(data)) {
        return data.map((datum) => transformComponent(datum, component));
    }
    const res = transformEntry(data, component);
    if ((0, fp_1.isNil)(res)) {
        return res;
    }
    //! IOTECH - Return res directly
    // const { id, attributes } = res;
    // return { id, ...attributes };
    return res;
}
function transformEntry(entry, type) {
    if ((0, fp_1.isNil)(entry)) {
        return entry;
    }
    if (Array.isArray(entry)) {
        return entry.map((singleEntry) => transformEntry(singleEntry, type));
    }
    if (!(0, fp_1.isPlainObject)(entry)) {
        throw new Error('Entry must be an object');
    }
    const { id, ...properties } = entry;
    const attributeValues = {};
    for (const key of Object.keys(properties)) {
        const property = properties[key];
        const attribute = type && type.attributes[key];
        if (attribute && attribute.type === 'relation' && isEntry(property) && 'target' in attribute) {
            const data = transformEntry(property, strapi.contentTypes[attribute.target]);
            //! IOTECH - Remove data key
            // attributeValues[key] = { data };
            attributeValues[key] = data;
        }
        else if (attribute && attribute.type === 'component' && isEntry(property)) {
            attributeValues[key] = transformComponent(property, strapi.components[attribute.component]);
        }
        else if (attribute && attribute.type === 'dynamiczone' && isDZEntries(property)) {
            if ((0, fp_1.isNil)(property)) {
                attributeValues[key] = property;
            }
            attributeValues[key] = property.map((subProperty) => {
                return transformComponent(subProperty, strapi.components[subProperty.__component]);
            });
        }
        else if (attribute && attribute.type === 'media' && isEntry(property)) {
            const data = transformEntry(property, strapi.contentType('plugin::upload.file'));
            //! IOTECH - Remove data key
            // attributeValues[key] = { data };
            attributeValues[key] = data;
        }
        else {
            attributeValues[key] = property;
        }
    }
    return {
        id,
        //! IOTECH - Remove attributes key
        // attributes: attributeValues,
        ...attributeValues,
        // NOTE: not necessary for now
        // meta: {},
    };
}
