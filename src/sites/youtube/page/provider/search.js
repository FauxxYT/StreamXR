// YouTube's Search (the shell's 'top' zone): the search bar standing above the Safe Zone
// (click it to type: the in-VR keyboard comes up; the keys come through host.typeInto, from
// it or the computer's keyboard), and the results of the last search in the middle panel
// (Catalog style) as the card grid, more loading as you page through. While you type,
// YouTube's suggestions drop down under the bar (asked for once typing pauses for
// SUGGEST_AFTER_MS, timed by the VR frame loop); clicking one searches for it. Enter or the
// Search button searches; × clears the search (the text and the results: the middle panel
// goes away) and stops typing; Escape, or a click on nothing (vr-panel.js sends it as
// Escape), only stops typing. A panel controller: see panels.js.
//   actions used: search(query) -> pager of video / playlist items (youtube-content.js
//   search()), suggest(text) -> Promise of [text] (youtube-home.js suggestions()),
//   openVideo(id, playlistId).
(function (ns) {
  'use strict';

  const SUGGEST_AFTER_MS = 150;              // typing pause before suggestions are asked for
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    const perPage = host.perPage;
    let text = '', focused = false;            // the field: what's typed, and whether keys go to it
    let query = '', pager = null, page = 0, loading = false, error = '', ver = 0;
    let suggestions = [], suggestFor = '';     // the list, and the text it's for
    let typedAt = 0, asked = '';               // when the text last changed; the text last asked about
    const bump = () => { ver++; };

    // The text changed: suggestions are asked for once typing pauses (see `tick`); no text,
    // no suggestions.
    function textChanged() {
      typedAt = performance.now();
      if (!text.trim()) { asked = ''; if (suggestions.length) { suggestions = []; suggestFor = ''; bump(); } }
    }

    // Every frame (the VR session's frame loop: the page's own timers can run late or rarely
    // while you're in the headset, as Chrome treats the page as hidden): once typing has
    // paused SUGGEST_AFTER_MS, ask for suggestions for the text, if not asked already. An
    // answer for older text is dropped.
    function tick(frame) {
      const t = text.trim();
      if (!focused || !t || t === asked || frame.now - typedAt < SUGGEST_AFTER_MS) return;
      asked = t;
      Promise.resolve(actions.suggest(t)).then(list => {
        if (text.trim() !== t) return;                                   // typed on since
        suggestions = list || []; suggestFor = t; bump();
      }, err => console.warn('[streamxr] search suggestions unavailable:', err && err.message || err));
    }

    const items = () => (pager ? pager.items : []);
    const pageCount = () => Math.max(1, Math.ceil(items().length / perPage));

    // Start or stop typing into the field.
    function focus(on) {
      if (focused === on) return;
      focused = on; host.typeInto(on); bump();
    }

    // Load one more page of results (one request at a time).
    function loadNext() {
      if (!pager || loading || pager.done) return;
      const p = pager;
      loading = true; bump();
      p.next().catch(err => { if (p === pager) error = tr('yt.search.failed', { error: err && err.message || err }); })
        .finally(() => { if (p === pager) loading = false; bump(); });
    }

    // Search for what's in the field (nothing to do when it's empty), and stop typing.
    function submit() {
      const q = text.trim();
      focus(false);
      if (!q) return;
      query = q; error = ''; page = 0; loading = false;
      try { pager = actions.search(q); } catch (err) { pager = null; error = String(err && err.message || err); }
      bump();
      loadNext();
    }

    // A key typed into the field.
    function key(k) {
      if (k === 'Enter') submit();
      else if (k === 'Escape') focus(false);
      else if (k === 'Backspace') { text = text.slice(0, -1); bump(); textChanged(); }
      else if (k.length === 1) { text += k; bump(); textChanged(); }
    }

    function event(ev) {
      if (ev.type === 'field') focus(true);
      else if (ev.type === 'clear') {                                    // start over: no text, no results, not typing
        text = ''; query = ''; pager = null; page = 0; loading = false; error = '';
        textChanged(); focus(false); bump();
      }
      else if (ev.type === 'submit') submit();
      else if (ev.type === 'suggest') {                                  // a suggestion: search for it
        const s = suggestions[+ev.value];
        if (s) { text = s; submit(); }
      }
      else if (ev.type === 'key') { if (focused) key(ev.value); }
      else if (ev.type === 'page') {
        page = ev.value === 'next' ? Math.min(pageCount() - 1, page + 1) : Math.max(0, page - 1); bump();
      } else if (ev.type === 'item') {
        const it = items()[page * perPage + +ev.value];
        if (it) actions.openVideo(it.id, it.playlistId);
      }
    }

    // Every frame while the panels are up (the search bar always shows): keep a page of
    // results ahead of where you are. Returns the Catalog model of the results, `bar` (the
    // search bar's field, with the suggestions while typing) and `open`: the results panel
    // shows once there's a search, until the search bar is cleared.
    function model(frame) {
      if (pager && !loading && !pager.done && page >= pageCount() - 2) loadNext();
      const done = !!pager && pager.done;
      const m = {
        title: tr('yt.panel.search'), tabs: [], pills: [], pill: null, note: query ? tr('yt.search.resultsFor', { query }) : '',
        items: items().slice(page * perPage, page * perPage + perPage).map(it => ns.ytVr.card(it)),
        page, pageCount: pageCount(), more: !!pager && !done, loading,
        emptyText: loading ? tr('yt.searching') : error || (query ? tr('yt.noResults', { query }) : tr('yt.search.hint')),
        now: frame.now / 1000,                                            // the loading indicator's clock
      };
      const bar = { id: 'query', text, placeholder: tr('yt.search.placeholder'), focused, button: tr('yt.search'), clearable: !!text || !!pager,
        // Only while typing, and only for what's typed now.
        suggestions: focused && suggestFor === text.trim() ? suggestions : [] };
      // Redraw on any change, and ~30 times a second while the loading indicator shows.
      const spinning = loading && !m.items.length;
      return { model: m, key: `${ver}|${ns.youtubeData.thumbsVersion()}|${spinning ? Math.floor(frame.now / 33) : ''}`, bar, open: !!query };
    }

    return { model, event, tick };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.searchPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
