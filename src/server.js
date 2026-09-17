import bodyParser from 'body-parser';
import express from 'express';
import log from 'loglevel';
import { wildcardMatch } from './util.js';

const app = express();
const PORT = process.env.PORT || 3000;

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
log.setLevel(LOG_LEVEL);

const bodyTextParser = bodyParser.text({
  type: ['application/json'],
});

app.use((req, res, next) => {
  log.info('Incoming WH: ' + req.originalUrl);
  const logData = {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
  };
  log.debug('Incoming WH data:\n' + JSON.stringify(logData, undefined, 2));
  next();
});

app.post('/wh', bodyTextParser, async (req, res) => {
  const refMatch = req.query.refMatch;
  const jsonBody = JSON.parse(req.body);
  const ref = (jsonBody.ref ?? '').split('/').pop();
  if (!!refMatch && !wildcardMatch(refMatch, ref)) {
    log.info(`Not forwarding WH because ref ${ref} does not match ${refMatch}`);
    return res.status(200).json({
      success: true,
      msg: 'not forwarded: ref not match',
    });
  }

  const forwardUrl = req.query.forwardUrl;
  const forwardMethod = req.query.forwardMethod;
  log.info(`Forwarding to: ${forwardMethod} ${forwardUrl}`);

  try {
    const response = await fetch(forwardUrl, {
      method: forwardMethod,
      headers: req.headers,
      body: req.body,
    });

    if (!response.ok) {
      log.error('Error during WH forwarding', await response.text());
      return res
        .status(500)
        .json({ success: false, msg: 'Error during WH forwarding' });
    }

    log.info('WH forwarded correctly');
    return res.status(response.status).json({ success: true, msg: 'ok' });
  } catch (err) {
    console.error('Exception during WH forwarding', err);
    return res.status(500).json({ error: 'Exception during WH forwarding' });
  }
});

app.listen(PORT, () => {
  log.info(`WH proxy started on port ${PORT}`);
});
