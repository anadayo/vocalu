const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

assert(html.includes('id="music-dock"'), 'BGM dock must be present');
assert(html.includes('id="music-dock-title"'), 'BGM dock must expose the current track title');
assert(!html.includes('id="music-dock-toggle"'), 'Custom playback controls belong in settings, not over gameplay');
assert(app.includes("list:'PL4hnIvXd3nC4mvwumy4IFfY4d8vVmcVGA'"), 'Owner playlist must be configured');
assert(app.includes('if(state.music.enabled)startBattleMusic()'), 'Battle start must request BGM playback');
assert(app.includes('onAutoplayBlocked'), 'Safari autoplay blocking needs a recovery path');
assert(css.includes('width:200px;height:200px'), 'YouTube player must retain the required minimum viewport');
assert(!css.includes('#yt-player{position:fixed;width:1px'), 'YouTube player must not be hidden at 1px');

console.log('VOCALU music tests: OK');
