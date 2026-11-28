'use strict';

require('../config'); // Loads .env through the existing bot configuration.
const axios = require('axios');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const BASE_URL = (process.env.MEDIA_API_BASE || 'https://web-production-a51190ef.up.railway.app').replace(/\/+$/, '');
const API_KEY = process.env.MEDIA_API_KEY || 'redx';
const DEFAULT_TIMEOUT_MS = 30000;

function authParams(params = {}) {
  return { ...params, apiKey: API_KEY };
}

function apiError(error) {
  const responseData = error?.response?.data;
  const message = responseData?.error || responseData?.message || error?.message || 'Unknown API error';
  return new Error(`Media service: ${message}`);
}

async function getJson(route, params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}${route}`, {
      params: authParams(params),
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
    });
    if (response.data?.success === false) throw new Error(response.data.error || 'Request failed');
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}

async function postJson(route, body = {}) {
  try {
    const response = await axios.post(`${BASE_URL}${route}`, body, {
      params: authParams(),
      timeout: DEFAULT_TIMEOUT_MS,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (response.data?.success === false) throw new Error(response.data.error || 'Request failed');
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function downloadToTemp(url, extension, maxBytes = 128 * 1024 * 1024) {
  const target = path.join(os.tmpdir(), `annu-don-${randomUUID()}.${extension}`);
  let received = 0;
  try {
    const response = await axios.get(url, {
      params: url.startsWith(BASE_URL) ? authParams() : undefined,
      responseType: 'stream',
      timeout: 180000,
      maxContentLength: maxBytes,
      headers: { 'User-Agent': 'ANNU-DON WhatsApp Bot', Accept: '*/*' },
    });
    const length = Number(response.headers['content-length'] || 0);
    if (length > maxBytes) {
      response.data.destroy();
      throw new Error(`The file is too large for automatic WhatsApp sending (${Math.round(length / 1048576)} MB).`);
    }
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        if (received > maxBytes) return callback(new Error('The file exceeded the configured download limit.'));
        callback(null, chunk);
      },
    });
    await pipeline(response.data, limiter, fs.createWriteStream(target));
    return target;
  } catch (error) {
    await fsp.unlink(target).catch(() => {});
    throw apiError(error);
  }
}

async function downloadJob(jobId, extension, { timeoutMs = 5 * 60 * 1000, maxBytes = 128 * 1024 * 1024 } = {}) {
  if (!jobId) throw new Error('The media service did not return a job ID.');
  const started = Date.now();
  let lastMessage = 'Media processing did not complete.';

  while (Date.now() - started < timeoutMs) {
    const data = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
    const job = data?.job || data;
    const status = String(job?.status || '').toLowerCase();
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      lastMessage = job?.error || job?.statusMessage || `Job ${status}.`;
      throw new Error(`Media job failed: ${lastMessage}`);
    }
    if (['completed', 'complete', 'done', 'success'].includes(status)) {
      const fileUrl = `${BASE_URL}/api/v1/jobs/${encodeURIComponent(jobId)}/file`;
      return downloadToTemp(fileUrl, extension, maxBytes);
    }
    await wait(2000);
  }
  throw new Error(`Timed out waiting for media processing. ${lastMessage}`);
}

async function downloadMovieFile(downloadPath, maxBytes = 64 * 1024 * 1024) {
  if (!downloadPath || typeof downloadPath !== 'string' || !downloadPath.startsWith('/api/v1/movie2/download/')) {
    throw new Error('The movie service returned an invalid download path.');
  }
  const url = new URL(downloadPath, BASE_URL).toString();
  return downloadToTemp(url, 'mp4', maxBytes);
}

module.exports = { BASE_URL, API_KEY, getJson, postJson, downloadJob, downloadMovieFile };
