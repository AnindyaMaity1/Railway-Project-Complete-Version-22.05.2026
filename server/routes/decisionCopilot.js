const express = require('express');
const axios = require('axios');

const router = express.Router();

// helper that tries a list of baseUrls until one works
async function tryProxied(req, res, path) {
  const candidates = [];
  if (process.env.AI_SERVICE_URL) candidates.push(process.env.AI_SERVICE_URL);
  candidates.push('http://localhost:5002');
  candidates.push('http://localhost:5001'); // legacy fallback

  let lastErr;
  for (const base of candidates) {
    try {
      const url = `${base.replace(/\/+$/,'')}${path}`;
      const response = await axios({
        method: req.method,
        url,
        data: req.body,
        responseType: 'stream',
      });
      // copy headers
      if (response.headers['content-type']){
        res.setHeader('Content-Type', response.headers['content-type']);
      }
      if (response.headers['content-disposition']){
        res.setHeader('Content-Disposition', response.headers['content-disposition']);
      }
      response.data.pipe(res);
      return;
    } catch (err) {
      lastErr = err;
      // try next candidate
      console.warn(`proxy to ${base}${path} failed:`, err.message || (err.response && err.response.status));
    }
  }
  // if we get here, none succeeded
  console.error('All proxy attempts failed:', lastErr);
  const status = lastErr?.response?.status || 502;
  const message = lastErr?.response?.data?.error || 'Failed to reach decision-copilot service.';
  res.status(status).json({ error: message });
}

// proxy analysis call
router.post('/analyze', async (req, res) => {
  await tryProxied(req, res, '/api/analyze');
});

// proxy report request to decision-copilot microservice (which has full pdf logic)
router.post('/report', async (req, res) => {
  await tryProxied(req, res, '/api/report');
});



module.exports = router;

