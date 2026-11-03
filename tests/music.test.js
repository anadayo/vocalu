const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

assert(!html.includes('music-dock'), 'Gameplay must not be covered by a media player');
assert(!html.includes('yt-player'), 'YouTube player must be removed');
assert(app.includes('if(state.music.enabled)startBattleMusic()'), 'Battle start must request BGM playback');
assert(app.includes('window.AudioContext||window.webkitAudioContext'), 'Safari-compatible Web Audio must be used');
assert(app.includes('setInterval(musicScheduler,100)'), 'BGM sequencer must keep scheduling during battle');
assert(app.includes("?'VOCALU BATTLE THEME':'VOCALU LOBBY THEME'"), 'Original game themes must be identified in settings');
assert(app.includes("'VOCALU LOBBY THEME'"), 'Lobby and collection screens need a separate theme');
assert(app.includes("bpm=battle?132:86"), 'Battle and menu themes must use distinct tempos');
assert(app.includes('scheduleBattleDrums(step,time)'), 'Battle theme needs dedicated drums');
assert(app.includes("playSfx('attack')"), 'Card attacks need a game sound effect');
assert(app.includes("playSfx('destroy')"), 'Defeated battle cards need a separate impact sound');
assert(app.includes("kind==='damage'"), 'Leader damage needs a layered impact sound');
assert(app.includes("kind==='destroy'"), 'Card destruction needs a layered burst sound');
assert(app.includes("playSfx('trigger')"), 'Trigger activations need a game sound effect');
assert(app.includes("vocalu-audio-v3"), 'Audio preferences must not inherit the quiet legacy mix');
assert(app.includes("volume: loadAudioPreference('musicVolume',65)"), 'BGM must default above sound effects');
assert(app.includes("volume: loadAudioPreference('soundVolume',45)"), 'Sound effects need a restrained default mix');
assert(app.includes("state.music.theme==='battle'?0.36:0.48"), 'Lobby music must be louder than the battle mix');
assert(app.includes("document.addEventListener('pointerdown',unlockGameAudio"), 'The first lobby interaction must unlock audio');
assert(app.includes("document.addEventListener('touchstart',unlockGameAudio"), 'iPhone touch must unlock lobby audio');
assert(app.includes("['SR','UR'].indexOf(card.rarity)"), 'High-rarity song entrances need a dedicated phrase');
assert(app.includes('card.previewAudioUrl'), 'Rights-cleared song preview clips need a supported data hook');
assert(app.includes('playGeneratedPhrase(card)'), 'Cards without cleared audio need an original fallback phrase');
assert(app.includes('duckMusic('), 'BGM must duck so entrance phrases remain audible');
assert(!app.includes('youtube.com/iframe_api'), 'BGM must not depend on YouTube');
assert(!css.includes('.music-dock'), 'Removed player styles must not remain');
assert(app.includes('▶ 公式MVを開く'), 'Song cards must retain their official MV playback link');
assert(app.includes('target="_blank"'), 'Official song links must open without replacing game progress');

console.log('VOCALU music tests: OK');
