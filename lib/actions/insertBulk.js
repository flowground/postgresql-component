const pgp = require('pg-promise')({});
const { messages } = require('elasticio-node');
const clientPgPromise = require('../clientPgPromise.js');
const utils = require('../utils.js');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
async function processAction(msg, cfg) {
  const self = this;
  const { columns, tableName } = cfg;
  const { values } = msg.body;

  if (Array.isArray(values)) {
    const newColumns = columns.replace(/(\r\n|\n|\r)/gm, ' ') // remove newlines
      .replace(/\s+/g, ' ') // excess white space
      .split(',') // split into all statements
      .map(Function.prototype.call, String.prototype.trim);

    const tableNameOption = utils.getTableNameOption(tableName);

    const cs = new pgp.helpers.ColumnSet(newColumns, tableNameOption);
    const queryInsert = pgp.helpers.insert(values, cs);

    const db = clientPgPromise.getDb(cfg, self.logger);
    await db.none(queryInsert)
      .then(async () => {
        self.logger.info('Query successfully executed, emitting result ...');
        await self.emit('data', messages.newMessageWithBody({ result: 'Ok' }));
        await self.emit('end');
      })
      .catch((error) => {
        self.logger.error('Error when executing the query occurred');
        self.emit('error', error);
        return self.emit('end');
      });
    db.$pool.end();
  } else {
    self.emit('error', new Error('Values is not an array'));
    self.emit('end');
  }
}

module.exports.process = processAction;
