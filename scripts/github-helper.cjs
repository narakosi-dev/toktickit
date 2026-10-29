// GitHub Helper Script for TokTickIT
// Usage: node scripts/github-helper.cjs <command> [args...]
const https = require('https');
const fs = require('fs');

const OWNER = 'narakosi-dev';
const REPO = 'toktickit';

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const { execSync } = require('child_process');
    const out = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const match = out.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch (e) {}
  return null;
}

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${path}`,
      method,
      headers: {
        'User-Agent': 'toktickit-helper',
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `token ${token}`;
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'list-prs': {
      const state = process.argv[3] || 'all';
      const res = await githubRequest('GET', `/pulls?state=${state}&per_page=15&sort=created&direction=desc`);
      if (Array.isArray(res.data)) {
        res.data.forEach((pr) => {
          console.log(`PR #${pr.number} [${pr.state}] ${pr.title} <- ${pr.head.ref} (merged: ${pr.merged_at ? 'yes' : 'no'})`);
        });
      } else {
        console.log(JSON.stringify(res.data, null, 2));
      }
      break;
    }
    case 'get-pr': {
      const prNumber = process.argv[3];
      const res = await githubRequest('GET', `/pulls/${prNumber}`);
      console.log(`PR #${res.data.number}: ${res.data.title}`);
      console.log(`State: ${res.data.state}, Merged: ${res.data.merged}`);
      console.log(`Base: ${res.data.base?.ref}, Head: ${res.data.head?.ref}`);
      console.log(`Body:\n${res.data.body}`);
      break;
    }
    case 'update-pr': {
      const prNumber = process.argv[3];
      const bodyOrFile = process.argv[4];
      let bodyText = bodyOrFile;
      if (fs.existsSync(bodyOrFile)) {
        bodyText = fs.readFileSync(bodyOrFile, 'utf8');
      }
      const title = process.argv[5];
      const payload = { body: bodyText };
      if (title) payload.title = title;
      const res = await githubRequest('PATCH', `/pulls/${prNumber}`, payload);
      console.log(`Updated PR #${prNumber}: status ${res.status}`);
      break;
    }
    case 'create-pr': {
      const title = process.argv[3];
      const head = process.argv[4];
      const base = process.argv[5] || 'lab4-staging';
      const bodyOrFile = process.argv[6] || '';
      let body = bodyOrFile;
      if (fs.existsSync(bodyOrFile)) {
        body = fs.readFileSync(bodyOrFile, 'utf8');
      }
      const res = await githubRequest('POST', '/pulls', { title, head, base, body });
      if (res.data.number) {
        console.log(`Created PR #${res.data.number}: ${res.data.html_url}`);
      } else {
        console.log(`Error (${res.status}): ${JSON.stringify(res.data, null, 2)}`);
      }
      break;
    }
    case 'merge-pr': {
      const prNumber = process.argv[3];
      const method = process.argv[4] || 'squash';
      const commitTitle = process.argv[5];
      const commitMessage = process.argv[6];
      const payload = { merge_method: method };
      if (commitTitle) payload.commit_title = commitTitle;
      if (commitMessage) payload.commit_message = commitMessage;
      const res = await githubRequest('PUT', `/pulls/${prNumber}/merge`, payload);
      console.log(`Merged PR #${prNumber}: status ${res.status}, response:`, res.data);
      break;
    }
    case 'get-issue': {
      const issueNumber = process.argv[3];
      const res = await githubRequest('GET', `/issues/${issueNumber}`);
      console.log(`Issue #${res.data.number}: ${res.data.title}`);
      console.log(`State: ${res.data.state}`);
      console.log(`Body:\n${res.data.body}`);
      break;
    }
    case 'create-issue': {
      const title = process.argv[3];
      const bodyOrFile = process.argv[4] || '';
      let body = bodyOrFile;
      if (fs.existsSync(bodyOrFile)) {
        body = fs.readFileSync(bodyOrFile, 'utf8');
      }
      const labels = process.argv[5] ? process.argv[5].split(',') : [];
      const res = await githubRequest('POST', '/issues', { title, body, labels });
      if (res.data.number) {
        console.log(`Created Issue #${res.data.number}: ${res.data.html_url}`);
      } else {
        console.log(`Error (${res.status}): ${JSON.stringify(res.data, null, 2)}`);
      }
      break;
    }
    case 'update-issue': {
      const issueNumber = process.argv[3];
      const state = process.argv[4]; // 'open' or 'closed' or ''
      const bodyOrFile = process.argv[5];
      const payload = {};
      if (state && state !== '-') payload.state = state;
      if (bodyOrFile) {
        if (fs.existsSync(bodyOrFile)) {
          payload.body = fs.readFileSync(bodyOrFile, 'utf8');
        } else {
          payload.body = bodyOrFile;
        }
      }
      const res = await githubRequest('PATCH', `/issues/${issueNumber}`, payload);
      console.log(`Updated Issue #${issueNumber}: status ${res.status}`);
      break;
    }
    case 'close-issue': {
      const issueNumber = process.argv[3];
      const res = await githubRequest('PATCH', `/issues/${issueNumber}`, { state: 'closed' });
      console.log(`Closed Issue #${issueNumber}: status ${res.status}`);
      break;
    }
    case 'list-issues': {
      const state = process.argv[3] || 'open';
      const res = await githubRequest('GET', `/issues?state=${state}&per_page=30&sort=created&direction=asc`);
      if (Array.isArray(res.data)) {
        res.data.forEach((issue) => {
          if (!issue.pull_request) {
            console.log(`Issue #${issue.number} [${issue.state}] ${issue.title}`);
          }
        });
      } else {
        console.log(JSON.stringify(res.data, null, 2));
      }
      break;
    }
    case 'comment': {
      const issueOrPrNumber = process.argv[3];
      const bodyOrFile = process.argv[4];
      let body = bodyOrFile;
      if (fs.existsSync(bodyOrFile)) {
        body = fs.readFileSync(bodyOrFile, 'utf8');
      }
      const res = await githubRequest('POST', `/issues/${issueOrPrNumber}/comments`, { body });
      console.log(`Added comment to #${issueOrPrNumber}: status ${res.status}`);
      break;
    }
    default:
      console.log('Usage: node scripts/github-helper.cjs <list-prs|get-pr|update-pr|create-pr|merge-pr|list-issues|get-issue|create-issue|update-issue|close-issue|comment> [args...]');
  }
}

main().catch(console.error);
