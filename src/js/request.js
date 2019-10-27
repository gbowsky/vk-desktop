import { promises as dns } from 'dns';
import https from 'https';
import fs from 'fs';
import { timer } from './utils';

const requests = {};

function request(params, post) {
  const symbol = Symbol();
  let url;

  if(params && params.url) url = params.url;
  else url = params;

  const promise = new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
      const chunks = [];
      const MB = 1048576;
      const contentLength = +res.headers['content-length'];
      let loadedLength = 0;

      if(params.pipe) res.pipe(params.pipe);

      res.on('data', (chunk) => {
        if(!params.pipe) chunks.push(chunk);

        if(typeof params.progress == 'function') {
          loadedLength += chunk.length;

          params.progress({
            // Размер файла в МБ
            size: contentLength / MB,
            // Сколько МБ уже скачалось
            downloaded: loadedLength / MB,
            // Сколько МБ уже скачалось в процентах
            progress: loadedLength / contentLength * 100
          });
        }
      });

      res.on('end', () => {
        let data = String(Buffer.concat(chunks));

        try { data = JSON.parse(data) }
        catch(e) {}

        delete requests[symbol];

        resolve({
          data,
          headers: res.headers,
          statusCode: res.statusCode
        });
      });
    });

    requests[symbol] = req;

    req.on('error', reject);

    if(params.method == 'POST' && params.multipart) {
      const data = params.multipart;
      const names = Object.keys(data);
      const boundary = Math.random().toString(16);
      const body = renderMultipartBody(names, data, boundary);
      let length = 0;

      body.forEach((part) => length += Buffer.byteLength(part));

      names.forEach((name) => {
        if(data[name].value) {
          length += fs.statSync(data[name].value.path).size;
        }
      });

      req.setHeader('Content-Type', `multipart/form-data; boundary="${boundary}"`);
      req.setHeader('Content-Length', length + (16 * (names.length - 1)) + 8 + Buffer.byteLength(boundary));
      sendMultipartParts(boundary, body, data, names, req, 0);
    } else req.end(post || '');
  });

  return { symbol, promise };
}

function renderMultipartBody(names, data, boundary) {
  const body = [];

  names.forEach((name, i) => {
    if(data[name].value) {
      body[i] = `--${boundary}\r\n` +
                `Content-Type: ${data[name].contentType}\r\n` +
                `Content-Disposition: form-data; name="${name}"; filename="${data[name].filename}"\r\n` +
                'Content-Transfer-Encoding: binary\r\n\r\n'
    } else {
      body[i] = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${data[name]}`;
    }
  });

  return body;
}

function sendMultipartParts(boundary, body, data, names, req, i) {
  req.write(`\r\n${body[i]}`);

  function write() {
    if(names.length-2 >= i) {
      req.write(`\r\n--${boundary}`);
      sendMultipartParts(boundary, body, data, names, req, i+1);
    } else req.end(`\r\n--${boundary}--`);
  }

  if(data[names[i]].value) {
    data[names[i]].value.on('end', write).pipe(req, { end: false });
  } else write();
}

async function waitConnection() {
  let firstValue, connection;

  while(!connection) {
    try {
      connection = !!(await dns.lookup('google.com'));
    } catch(e) {
      connection = false;
    }

    if(firstValue == null) firstValue = connection;
    if(!connection) await timer(1500);
  }

  return firstValue;
}

export function abortAllRequests() {
  const symbols = Object.getOwnPropertySymbols(requests);

  symbols.forEach((symbol) => {
    requests[symbol].abort();
    delete requests[symbol];
  });
}

export default function(...data) {
  return new Promise(async (resolve, reject) => {
    let done = false;

    while(!done) {
      const { symbol, promise } = request(...data);

      try {
        resolve(await promise);
        done = true;
      } catch(err) {
        if(!requests[symbol]) done = true;
        else if(await waitConnection()) {
          reject(err);
          done = true;
        } else delete requests[symbol];
      }
    }
  });
}
