
import { yup, validateYupSchema } from '@strapi/utils';

const callbackSchema = yup.object({
    identifier: yup.string().required(),
    password: yup.string().required(),
});


const authPINSchema = yup.object({
    mechanographicNumber: yup.string().required()
});

const registerSchema = yup.object({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: yup.string().required(),
});

const sendEmailConfirmationSchema = yup.object({
    email: yup.string().email().required(),
});

const validateEmailConfirmationSchema = yup.object({
    confirmation: yup.string().required(),
});

const forgotPasswordSchema = yup
    .object({
        email: yup.string().email().required(),
    })
    .noUnknown();

const resetPasswordSchema = yup
    .object({
        password: yup.string().required(),
        passwordConfirmation: yup.string().required(),
        code: yup.string().required(),
    })
    .noUnknown();

const changePasswordSchema = yup
    .object({
        password: yup.string().required(),
        passwordConfirmation: yup
            .string()
            .required()
            .oneOf([yup.ref('password')], 'Passwords do not match'),
        currentPassword: yup.string().required(),
    })
    .noUnknown();

//! IOTECH - Change the exports
export var validateCallbackBody = validateYupSchema(callbackSchema);
export var validateAuhPINBody = validateYupSchema(authPINSchema);

export var validateRegisterBody = validateYupSchema(registerSchema);
export var validateSendEmailConfirmationBody = validateYupSchema(sendEmailConfirmationSchema);
export var validateEmailConfirmationBody = validateYupSchema(validateEmailConfirmationSchema);
export var validateForgotPasswordBody = validateYupSchema(forgotPasswordSchema);
export var validateResetPasswordBody = validateYupSchema(resetPasswordSchema);
export var validateChangePasswordBody = validateYupSchema(changePasswordSchema);

export default {
    validateCallbackBody,
    validateRegisterBody,
    validateSendEmailConfirmationBody,
    validateEmailConfirmationBody,
    validateForgotPasswordBody,
    validateResetPasswordBody,
    validateChangePasswordBody,
};
