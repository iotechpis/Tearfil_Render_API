export default [
  {
    name: "strapi::body",
    config: {
      formidable: { maxFileSize: 500 * 1024 * 1024 }, // até 500 MB
      formLimit: "512mb",
      jsonLimit: "512mb",
      textLimit: "512mb",
    },
  },
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
