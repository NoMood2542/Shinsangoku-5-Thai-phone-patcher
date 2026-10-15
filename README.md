# THAI100 OfficialThai Full Causal Regression — iPhone v0.9.1 PICKER HARDFIX

This is the iPhone/Safari build of the v0.9 full causal regression candidate.

## iOS picker hardfix
This build specifically fixes the recurring case where Files closes after ISO selection but the page appears to do nothing.

It now:
- arms a 45-second picker watcher before Files opens;
- polls `input.files` every 200 ms after the picker returns;
- also watches change/input/focus/visibility/pageshow;
- keeps a visible **เช็คไฟล์ที่เลือก** button when picker recovery is armed;
- has a background poll fallback even if iOS drops the normal change event;
- shows a visible boot marker: `iOS picker hardfix active`.

## Use
1. Open `index.html` in Safari (prefer HTTPS/static hosting if Files only previews HTML).
2. Tap the ISO picker and choose the exact clean official CN ISO.
3. After returning from Files, the filename should appear automatically. If not, tap **เช็คไฟล์ที่เลือก** once.
4. Build the ISO.
5. Test Character Select -> Cutscene -> Battle Preparation -> Start Battle -> Gameplay.
6. Record PASS / HANG / CRASH once and save the generated state JSON.

The source ISO is never overwritten.
