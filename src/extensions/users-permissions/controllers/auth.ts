/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
//! IOTECH - add require to top - grant-koa
import grant from 'grant-koa';

import crypto from 'crypto';
import _ from 'lodash';
import utils from '@strapi/utils';
const {
    contentTypes: { getNonWritableAttributes },
} = require('@strapi/utils');
import { getService } from '../utils';

import {
    validateCallbackBody,
    validateAuhPINBody,
    validateRegisterBody,
    validateSendEmailConfirmationBody,
    validateForgotPasswordBody,
    validateResetPasswordBody,
    validateEmailConfirmationBody,
    validateChangePasswordBody,
} from './validation/auth';

const { ApplicationError, ValidationError, ForbiddenError } = utils.errors;
const sanitizeUser = (user, ctx) => {
    const { auth } = ctx.state;
    const userSchema = strapi.getModel('plugin::users-permissions.user');

    return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};

const sanitizeIOTECH = (user, ctx) => {
    delete user.password;
    delete user.resetPasswordToken;
    delete user.confirmationToken;

    return user;

}

export default {
    async callback(ctx) {
        const provider = ctx.params.provider || 'local';
        const params = ctx.request.body;

        //! IOTECH - add query params to findUser
        const { query } = ctx.request;

        const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
        const grantSettings = await store.get({ key: 'grant' });

        const grantProvider = provider === 'local' ? 'email' : provider;

        if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
            throw new ApplicationError('This provider is disabled');
        }

        if (provider === 'local') {
            await validateCallbackBody(params);

            const { identifier } = params;

            //! IOTECH - check if query has a populate param
            const populate = (() => {
                if (query.populate) {
                    const populate = Array.isArray(query.populate) ? query.populate : (query.populate as string).split(',');
                    if (!populate.includes('role')) {
                        populate.push('role');
                    }
                    if (!populate.includes('picture')) {
                        populate.push('picture');
                    }
                    return populate;
                }
                return ['role', 'picture']
            })();

            // Check if the user exists.
            const user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: {
                    provider,
                    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
                },
                // IOTECH - add query params to findUser
                ...query,
                populate,
            });

            console.log('user', user);

            if (!user) {
                throw new ValidationError('Invalid identifier or password');
            }

            if (!user.password) {
                throw new ValidationError('Invalid identifier or password');
            }

            const validPassword = await getService('user').validatePassword(params.password, user.password);

            if (!validPassword) {
                throw new ValidationError('Invalid identifier or password');
            }

            const advancedSettings = await store.get({ key: 'advanced' });
            const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

            if (requiresConfirmation && user.confirmed !== true) {
                throw new ApplicationError('Your account email is not confirmed');
            }

            if (user.blocked === true) {
                throw new ApplicationError('Your account has been blocked by an administrator');
            }

            console.log('user', user);

            return ctx.send({
                jwt: getService('jwt').issue({ id: user.id }),
                //user1: await sanitizeUser(user, ctx),
                user: sanitizeIOTECH(user, ctx),
            });
        }

        // Connect the user with the third-party provider.
        try {
            const user = await getService('providers').connect(provider, ctx.query);

            if (user.blocked) {
                throw new ForbiddenError('Your account has been blocked by an administrator');
            }

            return ctx.send({
                jwt: getService('jwt').issue({ id: user.id }),
                user: await sanitizeUser(user, ctx),
            });
        } catch (error) {
            throw new ApplicationError(error.message);
        }
    },

    async changePassword(ctx) {
        if (!ctx.state.user) {
            throw new ApplicationError('You must be authenticated to reset your password');
        }

        const validations: any = strapi.config.get('plugin::users-permissions.validationRules');

        const { currentPassword, password } = await validateChangePasswordBody(ctx.request.body, validations);

        const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: ctx.state.user.id } });

        const validPassword = await getService('user').validatePassword(currentPassword, user.password);

        if (!validPassword) {
            throw new ValidationError('The provided current password is invalid');
        }

        if (currentPassword === password) {
            throw new ValidationError('Your new password must be different than your current password');
        }

        await getService('user').edit(user.id, { password });

        ctx.send({
            jwt: getService('jwt').issue({ id: user.id }),
            user: await sanitizeUser(user, ctx),
        });
    },

    async resetPassword(ctx) {
        const { password, passwordConfirmation, code } = await validateResetPasswordBody(ctx.request.body);

        if (password !== passwordConfirmation) {
            throw new ValidationError('Passwords do not match');
        }

        const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { resetPasswordToken: code } });

        if (!user) {
            throw new ValidationError('Incorrect code provided');
        }

        await getService('user').edit(user.id, {
            resetPasswordToken: null,
            password,
        });

        // Update the user.
        ctx.send({
            // jwt: getService('jwt').issue({ id: user.id }),
            // user: await sanitizeUser(user, ctx),
            //! IOTECH - return ok:true
            ok: true,
        });
    },

    async connect(ctx, next) {
        //! IOTECH - move require to top
        // const grant = require('grant-koa');

        const providers: any = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'grant' }).get();

        const apiPrefix = strapi.config.get('api.rest.prefix');
        const grantConfig = {
            defaults: {
                prefix: `${apiPrefix}/connect`,
            },
            ...providers,
        };

        const [requestPath] = ctx.request.url.split('?');
        const provider = requestPath.split('/connect/')[1].split('/')[0];

        if (!_.get(grantConfig[provider], 'enabled')) {
            throw new ApplicationError('This provider is disabled');
        }

        if (!strapi.config.server.url.startsWith('http')) {
            strapi.log.warn(
                'You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url',
            );
        }
        // Ability to pass OAuth callback dynamically
        const queryCustomCallback = _.get(ctx, 'query.callback');
        const dynamicSessionCallback = _.get(ctx, 'session.grant.dynamic.callback');

        const customCallback = queryCustomCallback ?? dynamicSessionCallback;

        // The custom callback is validated to make sure it's not redirecting to an unwanted actor.
        if (customCallback !== undefined) {
            try {
                // We're extracting the callback validator from the plugin config since it can be user-customized
                const { validate: validateCallback }: any = strapi.plugin('users-permissions').config('callback');

                await validateCallback(customCallback, grantConfig[provider]);

                grantConfig[provider].callback = customCallback;
            } catch (e) {
                throw new ValidationError('Invalid callback URL provided', { callback: customCallback });
            }
        }

        // Build a valid redirect URI for the current provider
        grantConfig[provider].redirect_uri = getService('providers').buildRedirectUri(provider);

        return grant(grantConfig)(ctx, next);
    },

    async forgotPassword(ctx) {
        const { email } = await validateForgotPasswordBody(ctx.request.body);

        const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

        const emailSettings = await pluginStore.get({ key: 'email' });
        const advancedSettings: any = await pluginStore.get({ key: 'advanced' });

        // Find the user by email.
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: email.toLowerCase() } });

        if (!user || user.blocked) {
            return ctx.send({ ok: true });
        }

        // Generate random token.
        const userInfo = await sanitizeUser(user, ctx);

        const resetPasswordToken = crypto.randomBytes(64).toString('hex');

        const resetPasswordSettings: any = _.get(emailSettings, 'reset_password.options', {});
        const emailBody = await getService('users-permissions').template(resetPasswordSettings.message, {
            URL: advancedSettings.email_reset_password,
            SERVER_URL: strapi.config.get('server.absoluteUrl'),
            ADMIN_URL: strapi.config.get('admin.absoluteUrl'),
            USER: userInfo,
            TOKEN: resetPasswordToken,
        });

        const emailObject = await getService('users-permissions').template(resetPasswordSettings.object, {
            USER: userInfo,
        });

        const emailToSend = {
            to: user.email,
            from: resetPasswordSettings.from.email || resetPasswordSettings.from.name ? `${resetPasswordSettings.from.name} <${resetPasswordSettings.from.email}>` : undefined,
            replyTo: resetPasswordSettings.response_email,
            subject: emailObject,
            text: emailBody,
            html: emailBody,
        };

        // NOTE: Update the user before sending the email so an Admin can generate the link if the email fails
        await getService('user').edit(user.id, { resetPasswordToken });

        // Send an email to the user.
        await strapi.plugin('email').service('email').send(emailToSend);

        ctx.send({ ok: true });
    },
}