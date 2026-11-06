// The Shorts run: playing YouTube's Shorts feed one after another. Picking a Short in Explore →
// Shorts (browse.js) starts a run over that feed's pager (youtube-home.js shorts()); while one
// of its Shorts plays, its end opens the next one in the feed when YouTube's Autoplay is on
// (else it stays paused, as other videos do), reading more of the endless feed as it nears the
// end of what's loaded. Picking another Short of it (Up Next's Shorts tab: upnext.js) carries on
// from there; opening any other video ends the run. The provider calls tick() every frame (provider.js state()).
//   start(pager, id): a run over `pager`'s items, at the Short `id`.
//   tick(): follow the playing video; play the next Short when this one ends (just before).
//   hasMore() -> the feed can still load more (a run is on).
//   upcoming() -> the Shorts of the run after the playing one, as loaded so far ([] with no run).
//   active() -> a run is on and one of its Shorts has played (also while the next one opens).
//   more(): read the next page of the feed (when the run's list is nearly all shown).
//   started() -> a number that changes whenever a new run starts.
//   fill(items): look up the details these Shorts still lack (youtube-home.js shorts() p.fill).
(function (ns) {
  'use strict';

  const AHEAD = 3;                 // read the next feed page once this few Shorts are left
  const WAIT = 15000;              // ms a Short of the run may take to open before the run ends
  // How close to its end (s) a Short of the run hands over to the next one: before it ends, so
  // YouTube's own autoplay (a related Short of its choosing) never starts.
  const LEAD = 0.35;
  const SETTLE = 1500;             // ms after a Short opens before it can hand over (the player's time can still be the last one's)
  // The run: { pager, id (the Short playing or opening), shown (it has opened), since (when it
  // was asked for, ms), openedAt (when it opened, ms), played (one of its Shorts has opened),
  // ended (the id whose end was handled) }, or null.
  let run = null;

  const goTo = id => { run.id = id; run.shown = false; run.since = performance.now(); };
  let runs = 0;                    // how many runs have started (started())
  function start(pager, id) { run = null; if (pager && id) { run = { pager, ended: '' }; goTo(id); runs++; } }

  const indexOf = id => (run ? run.pager.items.findIndex(it => it.id === id) : -1);

  // Autoplay: YouTube's switch, its last known value while the player hides it (null).
  let autoplayWas = false;
  function autoplayOn() {
    const a = ns.youtube.autoplay();
    if (a != null) autoplayWas = a;
    return autoplayWas;
  }

  function tick() {
    if (!run) return;
    const now = ns.youtubeData.currentVideoId();
    if (!now) return;                                             // (between pages)
    if (now === run.id) { if (!run.shown) run.openedAt = performance.now(); run.shown = run.played = true; }
    else if (run.shown && indexOf(now) >= 0) { run.id = now; run.openedAt = performance.now(); }   // (a Short of the run, opened another way)
    else {                                    // another video (or the last Short, still showing): the run is over, unless
      if (run.shown || performance.now() - run.since > WAIT) run = null;   // its Short is still opening
      return;
    }
    const i = indexOf(now), items = run.pager.items;
    if (items.length - i - 1 <= AHEAD && !run.pager.done) run.pager.next().catch(() => {});
    const v = ns.youtube.video();
    if (!v || run.ended === now || ns.youtube.loop() || performance.now() - run.openedAt < SETTLE) return;   // (Loop on: it replays)
    const d = ns.youtube.duration(), nearEnd = !v.paused && d > 1 && d - ns.youtube.currentTime() <= LEAD;
    if (!v.ended && !nearEnd) return;
    if (v.ended) ns.youtube.cancelAutoplay();                     // (YouTube's countdown, if it got that far)
    run.ended = now;
    const next = items[i + 1];
    if (!next || !autoplayOn()) return;
    goTo(next.id);
    if (!ns.youtubePage.openVideo(next.id)) console.warn('[streamxr] couldn’t open the next Short');
  }

  function upcoming() {
    if (!run) return [];
    const i = indexOf(run.id);
    return i < 0 ? [] : run.pager.items.slice(i + 1);
  }
  const started = () => runs;
  const active = () => !!(run && run.played);
  const hasMore = () => !!(run && !run.pager.done);
  function more() { if (run && !run.pager.done) run.pager.next().catch(() => {}); }
  function fill(items) { if (run && run.pager.fill) run.pager.fill(items); }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.shortsRun = { start, tick, upcoming, active, started, fill, more, hasMore };
})(globalThis.__streamxr = globalThis.__streamxr || {});
