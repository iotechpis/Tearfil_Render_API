
const getService = (name) => {
    return strapi.plugin('users-permissions').service(name);
};

//! IOTECH - Added this line to export getService
export { getService };

export default {
    getService,
};
