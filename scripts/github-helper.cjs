// GitHub Helper Script for TokTickIT
// Usage: node scripts/github-helper.cjs <command> [args...]
const https = require('https');

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
          console.log(`PR #${pr.number} [${pr.state}] ${pr.title} <- ${pr.head.ref}`);
        });
      } else {
        console.log(JSON.stringify(res.data, null, 2));
      }
      break;
    }
    case 'create-pr': {
      const title = process.argv[3];
      const head = process.argv[4];
      const base = process.argv[5] || 'lab3-staging';
      const body = process.argv[6] || '';
      const res = await githubRequest('POST', '/pulls', { title, head, base, body });
      if (res.data.number) {
        console.log(`Created PR #${res.data.number}: ${res.data.html_url}`);
      } else {
        console.log(`Error (${res.status}): ${JSON.stringify(res.data, null, 2)}`);
      }
      break;
    }
    case 'create-issue': {
      const title = process.argv[3];
      const body = process.argv[4] || '';
      const labels = process.argv[5] ? process.argv[5].split(',') : [];
      const res = await githubRequest('POST', '/issues', { title, body, labels });
      if (res.data.number) {
        console.log(`Created Issue #${res.data.number}: ${res.data.html_url}`);
      } else {
        console.log(`Error (${res.status}): ${JSON.stringify(res.data, null, 2)}`);
      }
      break;
    }
    case 'list-issues': {
      const state = process.argv[3] || 'open';
      const res = await githubRequest('GET', `/issues?state=${state}&per_page=20&sort=created&direction=desc`);
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
    default:
      console.log('Usage: node scripts/github-helper.cjs <list-prs|create-pr|create-issue|list-issues> [args...]');
  }
}

main().catch(console.error);
