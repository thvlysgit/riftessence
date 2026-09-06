const { execFileSync } = require('node:child_process');

function isGitWorktree() {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim() === 'true';
  } catch {
    return false;
  }
}

if (isGitWorktree()) {
  execFileSync('git', ['config', 'core.hooksPath', '.husky'], { stdio: 'inherit' });
  console.log('Git hooks enabled from .husky.');
}
