export default {
    upload: {
      config: {
        provider: 'local',
        providerOptions: {
          sizeLimit: 500 * 1024 * 1024, // 500MB
        },
        allowedFileTypes: ['*/*'],
      },
    },
  };