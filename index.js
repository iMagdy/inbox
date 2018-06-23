const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const chalk = require('chalk');
const ora = require('ora');

const arguments = process.argv;
const interpreter = arguments[0];
const file = arguments[1];
const commands = arguments.splice(2);
const defaultDisplayLimit = 25;

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// https://developers.google.com/gmail/api/quickstart/nodejs
const TOKEN_PATH = 'credentials.json';


const helpMessage = `
  Welcome to mail checker:
  ----------------------------
  - No commands/args = all inbox
  - You can pass a keyword to search  (ex: node mail someone@mail.com)
  - You can pass a modifier to list other dirs  (ex: node mail someone@mail.com --sent)
`;

const authorize = (credentials, callback) => {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

const userInfo = auth => {
  const gmail = google.gmail({ version: 'v1', auth });
  const spinner = ora('Loading user info').start();

  return new Promise((resolve, reject) => {
    gmail.users.getProfile({ userId: 'me' }, (err, res) => {

      spinner.stop();

      if (err) {
        reject(chalk.red(err));
        process.exit(1);
      }

      let { data } = res;

      console.log(`
        ${chalk.yellow('Showing messages for:')} ${chalk.yellow(data.emailAddress)}
        ---------------------------------------------
        - Total messages count: ${chalk.red(data.messagesTotal)}
        - Total threads count: ${chalk.red(data.threadsTotal)}
      `);
      resolve();
    });
  });
}

const getThreadById = (id, auth) => {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.threads.get({ userId: 'me', id, format: 'minimal' }, (err, res) => {
      if (err) {
        reject(chalk.red(err));
        process.exit(1);
      }
      resolve(res.data.messages);
    });
  });
};

const listInbox = auth => {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.threads.list({
      userId: 'me',
      maxResults: getDisplayLimit(),
      q: `is:unread ${getCommands().join()}`
    }, (err, res) => {
      if (err) {
        reject(chalk.red(err));
        process.exit(1);
      }

      let { data } = res;

      console.log(`
          ${chalk.yellow('----------------------------------------------------------------')}
                                      ${chalk.yellow('THREADS')}
          ${chalk.yellow('----------------------------------------------------------------')}
      `);
      data.threads.forEach(async function(thread) {
        if (data.threads.length) {
          const messages = await getThreadById(thread.id, auth);
          console.log(`
              ${chalk.yellow('----------------------------------------------------------------')}
                        ${chalk.green(`MESSAGES FOR THREAD ID: ${thread.id}`)}
              ${chalk.yellow('----------------------------------------------------------------')}
          `);
          messages.forEach(message => {
            console.log(`
              DATE: ${chalk.green(new Date(parseInt(message.internalDate)))}
              MESSAGE ID: ${chalk.green(message.id)}
              THREAD ID: ${chalk.green(message.threadId)}
              LABELS: ${chalk.green(message.labelIds)}
              Subject: ${chalk.green(message.snippet.substring(0, 150))}...
            `);
          });
        } else {
          console.log(`
            THREAD ID: ${chalk.green(thread.id)}
            Subject: ${chalk.green(thread.snippet.substring(0, 150))}...
          `);
        }
      });
      resolve();
    });
  });
}

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), async function(auth) {
    // listLabels(auth)
    await userInfo(auth)
    await listInbox(auth);
  });
});

const getCommands = () => {
  return commands.filter(x => x.search('--') && isNaN(x));
}

const getModifiers = () => {
  return commands.filter(x => !x.search('--'));
}

const getDisplayLimit = () => {
  return (commands.filter(x => !isNaN(x)).length && 
    commands.filter(x => !isNaN(x))[0]) || defaultDisplayLimit;
}

const hasCommands = () => {
  return getCommands().length > 0;
}

const hasModifiers = () => {
  return getModifiers().length > 0;
}


// if(!hasCommands()) {
//   console.error(helpMessage);
//   process.exit(1);
// }

