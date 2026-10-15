// YouTube's "Description" panel (Info style): tabs Description (views · date, then the text
// without its chapter list; timestamps seek, links to YouTube videos open them), Chapters
// and Transcript, the last two only when the video has them (a chosen tab that's missing
// shows Description instead, and comes back on a video that has it). The tab is
// remembered. Comments are their own panel (comments-panel.js). A panel controller: see
// panels.js. Extra calls for the controls panel:
//   showDescription()   the video title was clicked: fold the panel if it shows the
//                       Description tab, else open it on that tab
//
// Chapters: the playing chapter is the last one started; the list moves to its page when the
// panel opens and whenever the chapter changes. Transcript: loaded the first time the tab
// shows for a video (spinner meanwhile); the playing line is the last one started, and the
// list follows it unless you scrolled in the last FOLLOW_PAUSE_MS. Each scrolling tab keeps
// its own position, reset for every video.
//   frame.st used: description: { id, header, text, links, hasTranscript } | null,
//   chapters: [{ title, start, thumb }], time.
//   actions used: transcript() -> Promise of [{ start, text }], seekTo(s), openVideo(id).
(function (ns) {
  'use strict';

  const TAB_KEY = 'descTab';                    // remembered tab (shell storage.js name)
  const TAB_IDS = ['description', 'chapters', 'transcript'];
  const FOLLOW_PAUSE_MS = 5000;     // how long the Transcript stops following after you scroll
  const fmt = t => ns.vrPanelUI.formatTime(t);
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    let tab = 'description', page = 0, current = -1, jump = true;
    { const t = ns.storage.get(TAB_KEY); if (TAB_IDS.includes(t)) tab = t; }
    let scroll = { description: 0, transcript: 0 }, videoId = '';
    let transcript = { id: '', status: 'none', lines: [] }, transcriptRows = { lines: null, rows: [] };
    let manualScrollUntil = 0, shownTab = 'description';
    let lastDescription = null, lastChapters = [];

    const remember = () => ns.storage.set(TAB_KEY, tab);

    // The tabs this video gets.
    const tabsFor = (d, chapters) => [{ id: 'description', label: tr('yt.desc.description') },
      ...(chapters && chapters.length ? [{ id: 'chapters', label: tr('yt.desc.chapters') }] : []),
      ...(d && d.hasTranscript ? [{ id: 'transcript', label: tr('yt.desc.transcript') }] : [])];

    // A description link is clickable when it's a time or another YouTube video.
    const linkClickable = k => !!k && (k.time != null || isFinite(ns.vrKit.parseClock(k.text)) || !!k.videoId);

    // The transcript's rows for the Info style (made once per transcript, so its layout stays cached).
    function rowsOf(lines) {
      if (transcriptRows.lines !== lines) transcriptRows = { lines, rows: lines.map(l => ({ label: fmt(l.start), text: l.text })) };
      return transcriptRows.rows;
    }

    function model(frame) {
      const st = frame.st;
      const d = st.description || null, id = d ? d.id : '';
      lastDescription = d;
      if (id !== videoId) {
        videoId = id; scroll = { description: 0, transcript: 0 }; jump = true;
        transcript = { id: '', status: 'none', lines: [] };
      }
      const chapters = lastChapters = st.chapters || [];
      const tabs = tabsFor(d, chapters);
      const t = shownTab = tabs.some(x => x.id === tab) ? tab : 'description';
      const time = st.time || 0;
      let cur = -1;
      chapters.forEach((c, i) => { if (c.start <= time + 0.25) cur = i; });
      const per = host.perPage, pageCount = Math.max(1, Math.ceil(chapters.length / per));
      if (jump || cur !== current) page = Math.max(0, Math.floor(Math.max(0, cur) / per));
      current = cur;
      page = Math.min(page, pageCount - 1);
      if (t === 'transcript' && id && transcript.id !== id && actions.transcript) {
        const forId = id;
        transcript = { id: forId, status: 'loading', lines: [] };
        Promise.resolve(actions.transcript()).then(lines => {
          if (transcript.id === forId) transcript = { id: forId, status: lines && lines.length ? 'ready' : 'none', lines: lines || [] };
        }, err => {
          console.warn('[streamxr] transcript unavailable:', err && err.message || err);
          if (transcript.id === forId) transcript = { id: forId, status: 'none', lines: [] };
        });
      }
      let line = -1;
      transcript.lines.forEach((l, i) => { if (l.start <= time + 0.25) line = i; });
      const follow = t === 'transcript' && transcript.status === 'ready' && (jump || performance.now() > manualScrollUntil);
      jump = false;
      let content, loading = false;
      if (t === 'chapters') {
        content = { kind: 'paged', current: cur, page, pageCount, emptyText: tr('yt.desc.noChapters'),
          rows: chapters.map((c, i) => ({ thumb: c.thumb, number: i + 1, title: c.title,
            label: i === cur ? tr('yt.desc.chapterNow', { time: fmt(c.start) }) : fmt(c.start) })) };
      } else if (t === 'transcript') {
        loading = transcript.status === 'loading';
        content = loading ? { kind: 'message', text: tr('yt.desc.loadingTranscript'), spinner: true }
          : transcript.status !== 'ready' || !transcript.lines.length ? { kind: 'message', text: tr('yt.desc.noTranscript') }
          : { kind: 'rows', rows: rowsOf(transcript.lines), current: line, follow };
      } else {
        content = d ? { kind: 'text', header: d.header, text: d.text, emptyText: tr('yt.desc.noDescription'),
          links: (d.links || []).map(k => ({ start: k.start, length: k.length, clickable: linkClickable(k) })) }
          : { kind: 'message', text: tr('yt.loading') };
      }
      const m = { tabs, tab: t, content, scroll: scroll[t] || 0, now: frame.now / 1000 };
      const key = [t, tabs.map(x => x.label).join(','), id, d ? d.text.length : -1, d ? d.header : '',
        chapters.map(c => `${c.start}:${c.title}`).join('|'), cur, page,
        transcript.status, transcript.lines.length, line, follow, Math.round(scroll[t] || 0),
        loading ? Math.floor(frame.now / 33) : ''].join('#');
      return { model: m, key };
    }

    // After a draw: keep the scroll where the style clamped it (or where following put it).
    function afterDraw() {
      if (shownTab in scroll) scroll[shownTab] = host.style.shownScroll();
    }

    function event(ev) {
      const v = ev.value;
      if (ev.type === 'tab') { tab = v; jump = true; remember(); }
      else if (ev.type === 'page') page = v === 'next' ? page + 1 : Math.max(0, page - 1);   // clamped at the next frame
      else if (ev.type === 'row' && shownTab === 'chapters') {                // jump to that chapter
        const c = lastChapters[+v];
        if (c) actions.seekTo(c.start);
      } else if (ev.type === 'row' && shownTab === 'transcript') {             // jump to that line
        const l = transcript.lines[+v];
        if (l) { actions.seekTo(l.start); manualScrollUntil = 0; }
      } else if (ev.type === 'link') {                                         // a timestamp, or another video
        const d = lastDescription, k = d && d.links[+v];
        const t = k && (k.time != null ? k.time : ns.vrKit.parseClock(k.text));
        if (k && k.videoId && k.videoId !== d.id) actions.openVideo(k.videoId);
        else if (k && isFinite(t)) actions.seekTo(t);
      } else if (ev.type === 'scroll' && shownTab in scroll) {                   // dragged / stick: pause following
        scroll[shownTab] = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
        manualScrollUntil = performance.now() + FOLLOW_PAUSE_MS;
      }
    }

    // The title on the controls panel: open on the Description tab, or fold if it shows it.
    function showDescription() {
      if (host.isOpen() && shownTab === 'description') { host.close(); return; }
      host.open();
      tab = 'description'; jump = true; remember();
    }

    return { model, event, afterDraw, opened: () => { jump = true; }, showDescription };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.descriptionPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
