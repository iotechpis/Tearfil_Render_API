module.exports = (plugin) => {
    // Sobrescreve a validação de tipos de ficheiro
    plugin.services['upload'].formatFileInfo = async function (file, fileInfo = {}, metas = {}) {
        const currentFile = await this.formatFileInfo.call(this, file, fileInfo, metas);

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'glb') {
            currentFile.ext = '.glb';
            currentFile.mime = 'model/gltf-binary';
        }
        if (ext === 'skp') {
            currentFile.ext = '.skp';
            currentFile.mime = 'application/octet-stream';
        }
        return currentFile;
    };

    return plugin;
};