// YouTube's panels for the VR shell (`ns.ytVr.panels`): which panels there are, where they
// go (each zone's in its toolbar's order, top to bottom), the style each one uses
// (vr-panel/styles/), its size, and the controller that fills it. The provider hands this
// list to the shell (provider.js session().site); vr-panel.js builds everything from it
// (ARCHITECTURE.md, "Chevron panels").
//
// A registration: { id, zone ('left' | 'right': beside the Safe Zone, one open per side;
//   'controls': a popup from a pill on the controls panel; 'top': a search bar above the
//   Safe Zone, the panel in its middle), label (the toolbar item's name,
//   or a function giving it in the interface language), icon (its Material Symbols name,
//   symbols.js), style ('queue' | 'catalog' | 'profile' | 'info' | 'options'), size ('wide'
//   | 'tall' | 'standard', see vr-panel/config.js), overrides (the style's slots, optional),
//   default (optional: the panel open the first time on its side, before one is
//   remembered), available (optional, side panels: st => bool, asked every frame: while
//   false, its toolbar item is hidden and it can't be open), autoOpen (optional: open it
//   whenever it becomes available, without remembering it; the panel it replaced comes back
//   when it goes), stays (optional: it doesn't fade with the rest while you watch),
//   create(host) -> controller }.
// host (given by vr-panel.js): { actions (the session's: provider + shell), style (this panel's style instance:
//   maxScroll(), shownScroll() ...), perPage (cards / rows per page), open(), close(),
//   isOpen() (this panel), closeMenu() (the controls panel's open menu), openMenu(control)
//   (a floating menu on one of this panel's controls, e.g. 'action:bell': its items from the
//   controller's menu(control) -> { items: [{ id, text, on, disabled, icons }], note, stay },
//   a choice arriving as { type: 'menu', value: item id, menu: control }), panel(id) (another
//   panel's controller), confirm(d) (ask
//   in the shell's dialog: d = { title, text, confirm, cancel, danger } -> Promise of bool),
//   typeInto(on, opts) (opts.emojis: [{ text, image, label }], the panel's own emojis for the
//   keyboard's emoji pages; ask
//   for the keys, or give them back (asking brings up the in-VR keyboard): while on and
//   shown, each key arrives as an event
//   { type: 'key', value: a character | 'Backspace' | 'Enter' | 'Escape' }) }.
// controller: {
//   model(frame) -> { model, key }   while shown, every frame: what the style draws, and a
//                                    key that changes whenever the drawing would (frame:
//                                    { st: actions.state(), now (ms) }). A 'top' panel's
//                                    is asked every frame while the panels are up, and also
//                                    returns bar (its search bar: grid.js's field model, with
//                                    suggestions) and open (show the panel); the bar's
//                                    controls reach event() like the panel's own
//   event(ev)                        a control was used: ev = { type, value, fraction? }
//                                    from the style's control id '<type>:<value>'; also
//                                    { type: 'scroll', value: px } for dragging / the stick
//   tick(frame)       (optional)     every frame, shown or not
//   afterDraw()       (optional)     after the style drew the model
//   opened()          (optional)     its toolbar item (or pill) opened the panel
//   menu(control)     (optional)     while a menu it opened (host.openMenu) is up, every
//                                    frame: what it lists (null closes it)
//   ...anything else the controls panel calls (e.g. channel.openChannel) }
(function (ns) {
  'use strict';

  const yt = ns.ytVr;
  const footer = { slots: { threadFooter: yt.comments.footer } };     // a comment row's likes / heart
  ns.ytVr.panels = [
    // left of the Safe Zone: about what's playing
    { id: 'desc', zone: 'left', label: () => ns.i18n.t('yt.panel.desc'), icon: 'info', style: 'info', size: 'wide', create: yt.descriptionPanel.create, default: true },
    { id: 'comments', zone: 'left', label: () => ns.i18n.t('yt.panel.comments'), icon: 'comment', style: 'info', size: 'wide', create: yt.commentsPanel.create,
      overrides: footer },
    { id: 'channel', zone: 'left', label: () => ns.i18n.t('yt.panel.channel'), icon: 'account_box', style: 'profile', size: 'tall', create: yt.channelPanel.create,
      overrides: footer },                                                   // an opened post's comments
    // right of the Safe Zone: a live stream's chat (only then; it stays while you watch), and what to watch
    { id: 'chat', zone: 'right', label: () => ns.i18n.t('yt.panel.chat'), icon: 'chat_bubble', style: 'info', size: 'tall', create: yt.liveChatPanel.create,
      available: st => !!st.liveChat, autoOpen: true, stays: true },
    { id: 'recs', zone: 'right', label: () => ns.i18n.t('yt.panel.recs'), icon: 'playlist_play', style: 'queue', size: 'wide', create: yt.upNextPanel.create, default: true },
    { id: 'browse', zone: 'right', label: () => ns.i18n.t('yt.panel.browse'), icon: 'explore', style: 'catalog', size: 'wide', create: yt.browsePanel.create },   // Explore
    { id: 'you', zone: 'right', label: () => ns.i18n.t('yt.panel.you'), icon: 'person', style: 'catalog', size: 'wide', create: yt.youPanel.create },
    // the search bar above the Safe Zone, its results in the middle
    { id: 'search', zone: 'top', label: () => ns.i18n.t('yt.panel.search'), icon: 'search', style: 'catalog', size: 'wide', create: yt.searchPanel.create },
    // the pill on the controls panel
    { id: 'settings', zone: 'controls', label: () => ns.i18n.t('yt.panel.settings'), icon: 'settings', style: 'options', size: 'standard', create: yt.settingsPanel.create },
  ];
})(globalThis.__streamxr = globalThis.__streamxr || {});
