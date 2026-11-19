// Builds the app in demo mode for GitHub Pages and publishes dist-demo/ to the gh-pages branch.
import { execSync } from 'node:child_process';
import { copyFileSync, writeFileSync, rmSync } from 'node:fs';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const remote = execSync('git remote get-url origin').toString().trim();

run('npx vite build --outDir dist-demo', {
  env: { ...process.env, BASE_PATH: '/dugsi/', VITE_DEMO_MODE: 'true' },
});
// GitHub Pages serves 404.html for unknown paths, which lets client-side routes like /dugsi/students load.
copyFileSync('dist-demo/index.html', 'dist-demo/404.html');
writeFileSync('dist-demo/.nojekyll', '');

const cwd = 'dist-demo';
rmSync(`${cwd}/.git`, { recursive: true, force: true });
run('git init -q -b gh-pages', { cwd });
run('git add -A', { cwd });
run('git -c user.name=shucab-lane commit -q -m "Deploy demo"', { cwd });
run(`git push -f ${remote} gh-pages`, { cwd });
rmSync(`${cwd}/.git`, { recursive: true, force: true });
