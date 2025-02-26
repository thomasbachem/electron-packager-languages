const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const debug = require('debug');

const d = debug('electron-packager-languages');

function getLanguageFolderPath(givenPath, platform) {
  switch (platform) {
    case 'darwin':
    case 'mas':
      return path.resolve(givenPath, '..');
    case 'win32':
    case 'linux':
      return path.resolve(givenPath, '..', '..', 'locales');
    default:
      return path.resolve(givenPath);
  }
}

function getLanguageFileExtension(platform) {
  switch (platform) {
    case 'darwin':
    case 'mas':
      return 'lproj';
    case 'win32':
    case 'linux':
      return 'pak';
    default:
      return '';
  }
}

function walkLanguagePaths(dir, platform) {
  const regex = new RegExp(`.(${getLanguageFileExtension(platform)})$`);
  const paths = fs.readdirSync(dir);

  switch (platform) {
    case 'darwin':
    case 'mas':
      return paths.filter(currentPath => fs
        .statSync(path.resolve(dir, currentPath)).isDirectory() && regex.test(currentPath));
    case 'win32':
    case 'linux':
      return paths;
    default:
      return [];
  }
}

module.exports = function setLanguages(languages, { allowRemovingAll = false } = {}) {
  return function electronPackagerLanguages(buildPath, electronVersion, platform, arch, callback) {
    const resourcePath = getLanguageFolderPath(buildPath, platform);
    const languageFolders = walkLanguagePaths(resourcePath, platform);

    const includedLanguages = languages.flatMap(l => {
      // Make sure possible variations of language identifiers across
      // platforms are covered, e.g. "en_US", "en-US", "en_us", "en-us"
      return [
        `${l.replace('_', '-').toLowerCase()}.${getLanguageFileExtension(platform)}`,
        `${l.replace('-', '_').toLowerCase()}.${getLanguageFileExtension(platform)}`,
      ];
    });

    const excludedFolders = languageFolders.filter(langFolder => !includedLanguages.includes(langFolder.toLowerCase()));

    if (allowRemovingAll !== true && excludedFolders.length === languageFolders.length) {
      throw new Error('electron-packager-languages: Refusing to remove all languages from the packaged app! Double check the supplied locale identifiers or suppress this error via the "allowRemovingAll" option.');
    }

    d('Removing %d of %d languages from the packaged app.', excludedFolders.length, languageFolders.length);
    excludedFolders.forEach(langFolder => rimraf.sync(path.resolve(resourcePath, langFolder)));

    callback();
  };
};
