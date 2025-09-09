
/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

import _ from 'lodash';

import utils from '@strapi/utils';
import { getService } from '../utils';
import { validateCreateUserBody, validateUpdateUserBody } from './validation/user';

const { sanitize, validate } = utils;
const { ApplicationError, ValidationError, NotFoundError } = utils.errors;

const sanitizeOutput = async (user, ctx) => {
    const schema = strapi.getModel('plugin::users-permissions.user');
    const { auth } = ctx.state;
  
    return strapi.contentAPI.sanitize.output(user, schema, { auth });
  };

const sanitizeOutputIOTECH = async (user, ctx) => {
    delete user.password;
    delete user.confirmationToken;
    delete user.resetPasswordToken;

    return user;
}

const validateQuery = async (query, ctx) => {
    const schema = strapi.getModel('plugin::users-permissions.user');
    const { auth } = ctx.state;
  
    return strapi.contentAPI.validate.query(query, schema, { auth });
  };
  
  const sanitizeQuery = async (query, ctx) => {
    const schema = strapi.getModel('plugin::users-permissions.user');
    const { auth } = ctx.state;
  
    return strapi.contentAPI.sanitize.query(query, schema, { auth });
  };

export default {
    /**
     * Create a/an user record.
     * @return {Object}
     */
    async create(ctx) {
        const advanced: any = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' }).get();

        //! IOTECH - START - change ctx.request.body to data
        const { data } = ctx.request.body;

        if (!_.isObject(data)) {
            throw new ValidationError('Missing "data" payload in the request body');
        }

        if (!_.get(data, 'username')) _.set(data, 'username', _.get(data, 'email'));
        const query = _.get(ctx, 'request.query', {});

        await validateCreateUserBody(data);

        const { email, username, role }: any = data;
        //! IOTECH - END

        const userWithSameUsername = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } });

        if (userWithSameUsername) {
            if (!email) throw new ApplicationError('Username already taken');
        }

        if (advanced.unique_email) {
            const userWithSameEmail = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: email.toLowerCase() } });

            if (userWithSameEmail) {
                throw new ApplicationError('Email already taken');
            }
        }

        const user: any = {
            //! IOTECH - change to data
            // ...ctx.request.body,
            ...data,
            email: email.toLowerCase(),
            provider: 'local',
        };

        if (!role) {
            const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: advanced.default_role } });

            user.role = defaultRole.id;
        }

        try {
            //! IOTECH - send data and query
            // const data = await getService('user').add(user);
            const data = await getService('user').add({ data: user, ...query });

            const sanitizedData = await sanitizeOutput(data, ctx);

            ctx.created(sanitizedData);
        } catch (error) {
            throw new ApplicationError(error.message);
        }
    },

    /**
     * Update a/an user record.
     * @return {Object}
     */
    async update(ctx) {
        const advancedConfigs: any = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' }).get();

        const { id } = ctx.params;
        //! IOTECH - START - change ctx.request.body to data
        const { data }: {
            data: any
        } = ctx.request.body;
        if (!_.isObject(data)) {
            throw new ValidationError('Missing "data" payload in the request body');
        }
        const { email, username, password }: any = data;

        // const { email, username, password } = ctx.request.body;
        //! IOTECH - END

        const user = await getService('user').fetch(id);
        if (!user) {
            throw new NotFoundError(`User not found`);
        }

        //! IOTECH - change all ctx.request.body to data
        // await validateUpdateUserBody(ctx.request.body);
        await validateUpdateUserBody(data);

        if (user.provider === 'local' && _.has(data, 'password') && !password) {
            throw new ValidationError('password.notNull');
        }

        if (_.has(data, 'username')) {
            const userWithSameUsername = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } });

            if (userWithSameUsername && _.toString(userWithSameUsername.id) !== _.toString(id)) {
                throw new ApplicationError('Username already taken');
            }
        }

        if (_.has(data, 'email') && advancedConfigs.unique_email) {
            const userWithSameEmail = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: email.toLowerCase() } });

            if (userWithSameEmail && _.toString(userWithSameEmail.id) !== _.toString(id)) {
                throw new ApplicationError('Email already taken');
            }
            if (typeof data.email === 'string') {
                // @ts-ignore
                data.email = (data.email as string).toLowerCase();
            }
        }

        const updateData = {
            ...data,
        };

        //! IOTECH - change variable name to newData
        const newData = await getService('user').edit(user.documentId, updateData);
        const sanitizedData = await sanitizeOutput(newData, ctx);

        ctx.send(sanitizedData);
    },

    /**
     * Retrieve user records.
     * @return {Object|Array}
     */
    async find(ctx) {
        await validateQuery(ctx.query, ctx);
        const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);
        const users = await getService('user').fetchAll(sanitizedQuery);

        ctx.body = await Promise.all(users.map((user) => sanitizeOutput(user, ctx)));
    },

    /**
     * Retrieve a user record.
     * @return {Object}
     */
    async findOne(ctx) {
        const { id } = ctx.params;
        await validateQuery(ctx.query, ctx);
        const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

        let data = await getService('user').fetch(id, sanitizedQuery);

        if (data) {
            data = await sanitizeOutput(data, ctx);
        }

        ctx.body = data;
    },

    /**
     * Retrieve user count.
     * @return {Number}
     */
    async count(ctx) {
        await validateQuery(ctx.query, ctx);
        const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);

        ctx.body = await getService('user').count(sanitizedQuery);
    },

    /**
     * Destroy a/an user record.
     * @return {Object}
     */
    async destroy(ctx) {
        const { id } = ctx.params;

        const data = await getService('user').remove({ id });
        const sanitizedUser = await sanitizeOutput(data, ctx);

        ctx.send(sanitizedUser);
    },

    /**
     * Retrieve authenticated user.
     * @return {Object|Array}
     */
    async me(ctx) {
      const authUser = ctx.state.user;
      if (!authUser) {
        return ctx.unauthorized();
      }
    
      // valida + sanitiza o query
      await validateQuery(ctx.query, ctx);
      const sanitizedQuery = await sanitizeQuery(ctx.query, ctx);
    
      const user = await getService('user').fetch(authUser.id, sanitizedQuery);
    
      ctx.body = await sanitizeOutputIOTECH(user, ctx);
    },
};
