const JiraApi = require('jira').JiraApi;
const bluebird = require('bluebird');
const jsonfile = require('jsonfile')
const path = require('path')
const os = require('os')
const JSON5 = require('json5')
const fse = require('fs-extra')
const getAttachments = require('./getAttachments')
const del = require('del');
const archiver = require('archiver-promise');
// const archiver = require('node-archiver');

const archive = archiver(`./compressedfiles/file.zip`, {
  store: true
});

const dataPath = path.join(__dirname, 'data');
const configPath = path.join(__dirname, 'config')
const privateConfigPath = path.join(os.homedir(), '.sercojira')
const privateConf = JSON5.parse(fse.readFileSync(privateConfigPath, 'UTF8'))
const localConf = jsonfile.readFileSync(path.join(configPath, 'config.json'))
const config = Object.assign({}, localConf, privateConf);

if (localConf.user || localConf.password) {
  console.error('Do not put username or password in local config/jira.json. Put them in ' + privateConfigPath);
  process.exit(1);
} else if (!config.user || !config.password) {
  console.error(`No username or password set in ${privateConfigPath}`);
  process.exit(1);
}

const jira = new JiraApi(config.protocol, config.host, config.port, config.user, config.password, config.apiVersion)

/* Search JIRA using jql query */
const searchData = jsonfile.readFileSync(path.join(configPath, 'searchJira.json'))
searchData.searchString = `${searchData.searchString}`;
const searchAsync = bluebird.promisify(jira.searchJira.bind(jira));
bluebird.resolve()
  .then(_ => searchAsync(searchData.searchString, searchData.optional))
  .then(search => getAttachments(search.issues, config))
  // .then(_ => archiver(`${dataPath}`, './compressedfiles/my-archive.tar.gz'))
  .then(_ => archive.directory(`data/`).finalize())
  .tap(_ => {
    console.log('Files compressed to compressedfiles');
  })
  .then(_ => del([`${dataPath}/*`, `!${dataPath}/my-archive.tar.gz`]))
  .tap(paths => {
    console.log('Deleted files and folders:\n', paths.join('\n'));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
