// Where the frames StreamXR shows come from: a "media source". Today there is one kind,
// the site's own <video> element (its provider's video()), followed when the site swaps it
// for another, or when one appears (VR can start on a page with no video: the session shows
// a placeholder until there is one). The renderers (video-sphere.js, cinema-screen.js) only
// ever see a <video>, so another kind of source (e.g. a <video> playing a captured tab's
// stream, for BrowseXR one day; docs/Future-Plans.md) can be added here without touching them.
//
//   const src = ns.mediaSource.fromProvider(provider);
//   src.element()          the <video> to draw now, or null (no video yet)
//   src.follow()           once per frame: picks up a swapped or new element (a video opened);
//                          true when it changed
//   src.hasNewFrame()      is there a frame to upload (a new one, and the video has data)?
//   src.uploaded()         the frame was uploaded (until the next one arrives)
//   src.invalidate()       upload again at the next frame (e.g. a new renderer)
//   src.stop()             the session is over: stop listening
(function (ns) {
  'use strict';

  // requestVideoFrameCallback fires when the video shows a new frame, so frames are only
  // uploaded when there is a new one; browsers without it upload every frame.
  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

  function fromProvider(provider) {
    let video = null, dirty = true, stopped = false;  // dirty: a new frame needs uploading

    // Listen for new frames of `v` (each callback asks for the next one, while it's still the video).
    const watch = v => {
      if (!hasRVFC) return;
      const onFrame = () => { if (v !== video || stopped) return; dirty = true; v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
    };

    // The site may swap the <video> element when the video changes, or have none yet; follow it.
    function follow() {
      const current = provider.video() || null;
      if (current === video) return false;
      video = current;
      dirty = true;
      if (video) watch(video);
      return true;
    }
    follow();

    return {
      element: () => video,
      follow,
      hasNewFrame: () => !!video && (dirty || !hasRVFC) && video.readyState >= 2,
      uploaded: () => { dirty = false; },
      invalidate: () => { dirty = true; },
      stop: () => { stopped = true; },
    };
  }

  ns.mediaSource = { fromProvider };
})(globalThis.__streamxr = globalThis.__streamxr || {});
