# 🥽 StreamXR

**YouTube, all around you.** StreamXR turns YouTube in your desktop browser into a full VR
experience: 360° and VR180 videos wrap around you, regular videos play on a giant cinema
screen, and you can browse, search, subscribe, like, save and read comments without ever
taking your headset off. 🎬✨

**Works with:**<br> 🖥️ Windows · 🌐 Chrome · 🎮 SteamVR · 🥽 Valve Steam Frame · ([full requirements](#-what-you-need))<br> 
**Jump to:** [Get started](#-get-started-in-a-minute) ·
[Quick troubleshooting](#-quick-troubleshooting) · [Controls](#-controls) ·
[Your privacy](#-your-privacy) · [Roadmap](#-roadmap) · [How you can help](#-how-you-can-help)

> **Early access** (version 0.78). Free and open source, forever. It already works every day; it's
> still growing fast, and your feedback shapes what comes next.
>
> StreamXR is vibe coded by one guy (me!), and the only headset I've got is the Steam Frame.
> Bug fixes, updates and support for more headsets and sites are coming, so please be
> patient with me. 😭🙏

## 💡 Why I made this

Two reasons:

1. **There was no way to watch YouTube on desktop in VR with the Steam Frame.** So I built
   one.
2. **I love movies, and I love IMAX.** 🎞️ That giant screen, the picture filling your whole
   view, the feeling of being *inside* the film: I wanted that magic at home. And I want
   everyone who doesn't live anywhere near an IMAX theater to be able to feel it too. Check out
   some IMAX movie trailers/clips on YouTube with the extension to see what I mean.

That's why the cinema screen is the heart of StreamXR, and why **YouTube Movies** are first on
my wish list. 🍿 They're copy-protected, so they can't play in VR yet, but I'm building the
groundwork now, and the moment YouTube allows them in VR, they're going on the big screen
([roadmap](#-roadmap)).

### 🫶 It's here to stay
I'm a heavy YouTube user, and StreamXR is how I watch it now: I use it myself, all the time,
and I genuinely love it. So this isn't a weekend project that'll be abandoned next month
(even though it took me a week to vibecode lol).
I'll keep fixing it, improving it and supporting it, because I want it to be great too. 💪
And it'll stay **free and open source, forever**: no paywalls, no ads, no "pro" version. 💚

## 💭 Why "StreamXR" and not "YouTube VR" or "StreamVR"?

It started life as "YouTube VR for SteamVR", then briefly "StreamVR" (a little *too* close to
Valve's SteamVR 😅). The name it has now says what it's meant to become:

- 📺 **Stream, not just YouTube.** Thanks to the [three-layer design](#-built-to-grow-three-layers),
  StreamXR isn't tied to one website: YouTube is simply the first site plugged into it, with
  Twitch and others to follow.
- 🥽 **XR, not just VR.** **XR** ("extended reality") is the umbrella for both **VR** (virtual
  reality, a whole world around you) and **AR** (augmented reality: your real room, with
  things floating in it). I want StreamXR to work on **AR glasses and passthrough devices**
  too, a cinema screen hanging in your actual living room. It's already prepared for it: the
  popup has a "See your room" option that switches on as soon as the browser offers
  passthrough.

I believe XR is the future of how we'll watch, and StreamXR is built to be there for it. 🚀

## 🔐 What about Netflix, MAX and the others?

I'd love StreamXR to play **YouTube's own movies, Netflix, MAX, Disney+, Prime Video** and the
rest. 🍿 But today, those can't be fully brought into VR, and it isn't something an extension
can get around.

**Why:** they protect their videos with **DRM** (copy protection). It's built so that no web
page, and no extension, can read the picture itself. That's great for stopping piracy, but
it also means StreamXR can't take the picture and draw it on a cinema screen in your
headset. There's a web feature that could show protected video in a headset without the page
reading the picture (WebXR "media layers"), but browsers *and* the services would have to
support and allow it, and today they don't.

**What I'll do:** I can (and will!) build the infrastructure for it: the player, the panels
and a provider for each service, ready to go (it's on the [roadmap](#-roadmap)). The
[three-layer design](#-built-to-grow-three-layers) means a new site is just a provider, so
the rest of StreamXR is ready for them already.

**What you can do:** 📣 **Let the streaming services know you want XR support in desktop
browsers!!!** Tell them on social media, in their feedback and support channels, in your
reviews: "I want to watch on my VR headset, from my browser." The more people ask, the
more likely they are to open the door. **If and when they do, I'll make it work ASAP.** 🚀

## 🌟 What you get

### 🎥 Every kind of video, the way it was meant to be seen
- **360° and VR180** wrap around you (YouTube's cubemap "mesh" format included); the format
  is detected automatically and can be changed any time.
- **Regular videos** play on a **cinema screen** you can **curve**, **resize**, **move** and
  **push away**, with **rounded corners** and an optional **ambient glow** that spills the
  picture's colors around it, like a TV with backlighting. 🌈
- **Every aspect ratio, natively:** the cinema screen takes the exact shape of whatever
  YouTube sends, so **ultrawide** (21:9, 2.39:1 "scope") films stretch wide and short, and
  **IMAX** ratios (1.90:1, the tall 1.43:1) fill the screen top to bottom, just like they
  would in the theater. When a video is uploaded at its true ratio, there are no black bars
  and no settings to fiddle with. 🎞️
- **Ads** play on the cinema screen, then your video comes right back.

### 🎛️ A controls panel made for VR
- Title, views, date and the channel, with **Subscribe**, **Like** and **Dislike**.
- A **seek bar** with chapter marks, a **preview frame**, YouTube's **Most Replayed** curve
  and how much has **loaded**.
- **Quality** (8K, 4K, 60 fps...), **speed**, **volume**, **format**, **recenter** and exit.
- **💬 Captions** in any language the video has, drawn right in VR.
- **🔖 Save** to Watch later or any of your playlists.
- Playlists get **Previous / Next** with a preview card; live streams get a **LIVE** label
  that jumps you back to live.
- It fades away while you watch, and one pull of the trigger brings it back.

### 🗂️ Panels around the video, never on top of it
Laid out around a **Safe Zone** you can tune, so the picture always stays clear, with
glassy toolbars on each side:
- ⬅️ **About this video:** **Description** (with chapters and the transcript), **Comments**
  and **Channel** (videos, Shorts, live streams, playlists, posts, About, Subscribe).
- 🔎 **Search** above the video, with suggestions as you type on the **VR keyboard**.
- ➡️ **What to watch:** **Up Next**, **Explore** (your Home feed with all its topic chips,
  "Immersive videos" included, plus News) and **You** (Subscriptions, Your channel,
  History, Playlists, Watch later, Liked videos).

### 🎨 Make it yours (Settings)
- Looks: **YouTube** or **Material 3** colors, **glass** panels with an adjustable tint, the
  **panel size**.
- The cinema screen's **curve**, **distance** and **glow**.
- The **Safe Zone**, how long each part waits before it **fades**, the **laser's
  steadiness**, the **keyboard layout** and the **language**.

### 🌍 Speaks your language
StreamXR's own words (buttons, menus, settings, the popup) come in **English** 🇺🇸 and
**Español** 🇪🇸, and it picks your browser's language by default (you can switch in
Settings → Language). Everything YouTube itself writes (titles, comments, "1.2M views")
already arrives in your YouTube language.

**Adding your language is easy, no coding needed:** open a **Translation** issue on GitHub,
copy the English word lists (three small files) into its boxes, translate the right-hand side
of each line, and submit. I'll add it from there! Anything you haven't translated yet simply
shows in English, so even a partial translation works. More tips in
[CONTRIBUTING.md](CONTRIBUTING.md#translating). 🗣️

## 🔒 Your privacy

StreamXR only talks to the sites it supports (today that's just YouTube), as you, the same way
their own websites do. That's it.

- **Only the supported sites:** today that's one permission, `www.youtube.com`. Each new site
  (like Twitch, on the roadmap) adds just that site. No access to other sites, your tabs or
  your history.
- **No servers, no analytics, no tracking.** I don't collect anything, and there's nowhere for
  it to go.
- **Your settings stay in your browser.**
- **Copy details** (in the VR button's menu) only copies headset and video-format info to your
  clipboard when you click it, so you can paste it into a bug report if you want to.
- **The [Skip Helper](#-skipping-ads)** asks for Chrome's scary-sounding `debugger` permission
  because it's the only way to press YouTube's Skip button for real. It only works in YouTube
  tabs, only presses Skip, and lets go right away. It's optional and
  [short enough to read](skip-helper/service-worker.js) (under 100 lines).
- It's all open source, so you don't have to take my word for it. 🙂

## 🎨 Designed like a real XR app

StreamXR's interface wasn't improvised: it's modeled on how the big platforms design for
headsets. 📐

- 📱 **Inspired by the YouTube app on Android XR and by Apple's visionOS.** The way
  panels float beside the video instead of on top of it, the toolbars on its edges, the
  search bar above it, the frosted-glass look that lets the video glow softly through.
- 📚 **Built on Google's Material 3 Expressive design system and the Android XR design
  guidelines.** Their documentation and XR UI/UX principles shaped the details: how far
  away panels sit and how big text is, where your eyes rest comfortably, how big a button
  needs to be to hit with a laser, how menus and dialogs rise toward you in depth, and how
  everything moves (smooth, never bouncy for big panels).
- 🧘 **Comfort first:** the video stays clear in a **Safe Zone** you can tune, panels get
  out of the way while you watch, and nothing is glued to your head.

The full design story is in [docs/Materials-Redesign.md](docs/Materials-Redesign.md) and
[docs/Spatial-Layout.md](docs/Spatial-Layout.md).

## ✅ What you need

| | Works | Notes |
|---|---|---|
| 🖥️ **Computer** | **Windows 10 / 11** | Tested on Windows 11. macOS and Linux aren't supported (Chrome's WebXR needs Windows + SteamVR). |
| 🌐 **Browser** | **Google Chrome** | Tested. Other Chromium browsers (Edge, Brave) should work but haven't been tried. Firefox can't yet: desktop Firefox has no WebXR (a 🦊 Firefox version will come once it does). |
| 🥽 **Headset** | **Valve Steam Frame** | Tested and tuned for it, controller models and all. Other SteamVR headsets may well play video, but they're untested and their buttons may be mapped differently ([help add yours](#-adding-a-headset)). |
| 🎮 **VR software** | **SteamVR** | Running **before** you open Chrome, and set as your OpenXR runtime. On the Steam Frame, stream it with **Stream VR without game** ([how](#-get-started-in-a-minute)). |
| 📺 **Site** | **YouTube** | Signed in or out. With YouTube Premium, even better (no ads). |
| 🧩 **Optional** | **Skip Helper** | A tiny second extension that lets you skip ads from inside VR ([why it's separate](#-skipping-ads)). |

## 🚀 Get started in a minute

1. **Download:** on the [latest release](../../releases/latest), under **Assets**, click
   **Source code (zip)**. Unzip it somewhere it can stay, like your Documents folder (Chrome
   runs it from there, so don't delete it).
2. **Install:** open `chrome://extensions`, turn on **Developer mode** (top right), click
   **Load unpacked** and pick the unzipped folder (the one with `manifest.json` inside).
   Want to skip ads in VR? Load its `skip-helper` folder the same way
   ([what it is](#-skipping-ads)).
3. **Start SteamVR** on your PC.
4. **Get the Steam Frame streaming:** in the headset, go to **Streaming Status**, find the PC
   that's running SteamVR, open the **Advanced** drop-down and pick **Stream VR without
   game**. Now the Frame is ready for StreamXR.
5. **Then open Chrome.** ⚠️ Chrome only looks for a headset when it starts: if SteamVR
   wasn't running yet, close every Chrome window and open it again.
6. **Click the 🥽 VR button** on YouTube: in the top bar next to **+ Create** (on any page),
   or in a video's player. Then press **Enter VR**. That's it!

No video playing yet? No problem: you'll see YouTube's logo on the big screen; pick
something from **Explore**, **You** or **Search** right inside VR. 🍿

**Updating:** download the new release, replace the old folder's contents with the new ones,
then press the ↻ reload button on StreamXR's card in `chrome://extensions` and reload your
YouTube tab. Your settings stay. (Once StreamXR is on the Chrome Web Store, updates will be
automatic.)

## 🔧 Quick troubleshooting

| If... | Try this |
|---|---|
| 🚫 **"No VR headset found"** / Enter VR is greyed out | Chrome only looks for a headset when it starts. Start **SteamVR**, get the Steam Frame streaming (**Streaming Status** → your PC → **Advanced** → **Stream VR without game**), then close **every** Chrome window and open Chrome again. |
| 🔍 **No VR button on YouTube** | Make sure StreamXR is turned on in `chrome://extensions`, then reload the YouTube tab. |
| 🔄 **Just updated StreamXR and nothing changed** | Reload your YouTube tab too: an open tab keeps the old version until it's reloaded. |
| 🌀 **A video looks stretched, doubled or split into squares** | Pick another format in the popup before entering VR, or with the **Format** button on the controls panel. |
| 🎯 **The laser feels jittery** | Settings → **Laser** → turn up the steadiness. |
| 🫥 **The panels are in the way, or out of reach** | Press **Grip** (pointing at nothing) to recenter, or tune the **Safe Zone** in Settings. |
| ⏩ **The panel says "Skip on desktop"** | That's normal without the optional [Skip Helper](#-skipping-ads): click Skip ad in the browser window, or install the helper. |
| ♻️ **Settings got into a weird state** | Hold the **right stick click** for 3 seconds to reset everything to the defaults. |

Still stuck? See [Something not working?](#-something-not-working) for how to report it.

## 🎮 Controls

| Input | Does |
|---|---|
| Trigger | click the panels with the laser; hold on the seek bar to scrub; drag a scrolling area; brings the panels (and lasers) back when they're hidden |
| A (right) | play / pause |
| B (right) | swap the controls panel for the keyboard (same place), and back: click its keys with the laser to type into a text box (Search); the bar under it moves it (and the controls panel with it), its bottom corners resize it |
| Left D-pad | show / hide the panels |
| Grip | recenter, or grab: the bar under the panel moves it; on the cinema screen the corner arcs resize it and the bar under it moves it (remembered) |
| Stick left / right | ±10 s. On a panel with page arrows: previous / next page (the stick's icon changes to ◀▯▶) |
| Stick up / down | on a scrolling area (Description, Transcript, Comments, a long menu): scroll (icon ▲≡▼) |
| Right stick click, held 3 s | reset all settings to their defaults and recenter (the stick's icon counts down 3-2-1 with a ring; let go to cancel) |

You don't have to memorize it: the same list is in the "Watch in VR" popup (**Controls**),
and the controllers in VR show little icons on their buttons.

> 🎮 **About the Steam Frame controllers:** Chrome doesn't know them by name yet, so it
> reports them as **Oculus Touch** controllers. That's why only these buttons are available
> today, and why **B, X and Y act as one button** (they all arrive as the same one). Full
> Steam Frame controller support, every button on its own, will come once Chrome adds
> support for the Steam Frame's own controller profile.

## ⏩ Skipping ads

Want to skip an ad without lifting your headset? There's a small, optional companion for
that: the **Skip Helper**. 🙌

**Why it's separate:** YouTube only accepts a *real* click on its Skip button; it quietly
ignores any click an extension makes. The only way an extension can make a real click is
Chrome's `debugger` permission, and Chrome shows a scary-sounding warning for it ("Read and
change all your data on all websites"). Rather than put that warning on everyone,
StreamXR keeps it in its own tiny extension that does exactly one thing: press the Skip
button you asked for. The main extension only ever needs access to youtube.com. 🔒

**Who needs it:**
- 💎 **YouTube Premium members:** you don't! No ads, nothing to skip.
- 📺 **Everyone else:** only if you want to skip from inside VR. Without it, everything else
  works, and when an ad can be skipped the panel says **Skip on desktop** (click Skip ad in
  the browser window).

**The details:**
- **Install:** in `chrome://extensions`, click **Load unpacked** again and pick the
  `skip-helper` folder inside your StreamXR folder. It shows up as a second extension,
  "StreamXR Skip Helper for YouTube". Nothing to set up: StreamXR finds it by itself.
- **What it can do:** one thing. When StreamXR asks from a YouTube tab, it presses the Skip
  button in that tab. It can't be told to click anything else, and it ignores every other
  site.
- **What you'll see:** each time it skips, Chrome shows a "started debugging this browser"
  bar at the top for a moment. That's normal: it's how the real click is made, and the bar
  goes away once the helper lets go.

## 🩹 Known issues

Things I already know about (no need to report these, but a 👍 on a matching issue tells me
what bugs you most):

**🎮 Controllers and headsets**
- **B, X and Y act as one button.** Chrome reports the Steam Frame controllers as Oculus
  Touch controllers, so those three arrive as the same button
  ([more](#-controls)).
- **No controller vibration.** Chrome doesn't give the Steam Frame controllers a way to
  vibrate yet, so Settings → Appearance → Vibration is greyed out.
- **Only Steam Frame controller models.** Other controllers are drawn as Steam Frame
  controllers, and other headsets are untested. **Got 3D models of your controllers?** 🧊
  Share them in a **Headset / controller compatibility** issue (with where they came from and
  their license) and I'll integrate them once I start accepting pull requests. They need a
  license that lets them be shared and changed in a free project, with credit (for example
  CC BY, CC BY-SA, CC BY-NC-SA or CC0), like the Steam Frame models' (CC BY-NC-SA 4.0).

**🎬 Video**
- **No 3D (stereo) videos.** On desktop, YouTube only sends one eye's picture, so 3D videos
  play flat.
- **Shorts are very tall** on the cinema screen: they keep their vertical shape at the
  screen's full width. Honestly, I left this in because I think it's funny, but I'll fix it
  eventually lol 😂
- **Captions on 180° / 360° videos** sit low in front of you and glide after your view;
  they work, but their placement still needs polish.
- **YouTube's movies can't play in VR** (they're copy-protected). They're first on the
  ["as soon as it's possible" roadmap](#-roadmap).

**🗂️ Panels and YouTube**
- **YouTube changes can break things** for a while: StreamXR reads YouTube's own page and
  data, and YouTube changes them often.
- **Best with YouTube in English.** A few panels recognize YouTube's own English words
  (the "All" chip, "Joined", an ad's "1 of 2"), so some labels can go missing in other
  languages. StreamXR's own words follow your language setting either way.
- **Comments show one level of replies;** YouTube's newer replies-to-replies aren't shown
  yet.
- **Glass menus blur only the video,** not the panels behind them.
- **Some Explore tabs say "Coming Soon"** (Shorts, Music, Live, Gaming and more): they're
  on the roadmap.
- A channel's **Featured** tab only shows for channels you subscribe to when the creator
  picked a video for returning subscribers (that's YouTube's behavior).

**🌐 Browsers**
- **Firefox can't run it yet:** desktop Firefox has no WebXR (the web's VR support). The code is
  already written to port, so a 🦊 **Firefox version will come** as soon as Firefox supports
  it ([you can help](#-how-you-can-help)). Edge and Brave are untested.
- **After updating StreamXR, reload your YouTube tab:** an open tab keeps the old version.

The developer's list, with the technical details, is in
[docs/known-issues.md](docs/known-issues.md).

## 🐞 Something not working?

First, try the [Quick troubleshooting](#-quick-troubleshooting) table, and check the
[Known issues](#-known-issues) (it may already be on the list). Still broken? Please
open an issue! 🙏

StreamXR reads YouTube's own page and data to build its VR panels. When YouTube changes its
site (it does, often!), a feature can break for a while until StreamXR catches up. 🛠️ Some
panels also expect English YouTube today, so a few labels may be missing in other languages.

**How to report it:** on GitHub, go to **Issues → New issue** and pick the form that fits.
Each form asks for exactly what's needed to fix your kind of problem:

| Form | Use it when... |
|---|---|
| 🐛 **Bug report** | Something that should work doesn't (a button does nothing, a panel stays empty, VR won't start). |
| 📺 **YouTube changed something** | Something that *used to* work stopped, probably because YouTube changed its site. |
| 🌀 **Video looks wrong in VR** | A video plays but looks stretched, doubled, split into squares, upside down or black. |
| 🥽 **Headset / controller compatibility** | It doesn't work right with your headset or controllers. |
| 💡 **New feature request** | You'd love StreamXR to do something it doesn't yet. |
| 🌐 **Support for another site** | You'd like StreamXR on Twitch or another video site. |
| 📝 **Documentation problem** | Something in this README or the docs is wrong, unclear or missing. |
| ❓ **Question or setup help** | You can't get it running, or you're not sure how something works. |
| ♿ **Accessibility or comfort** | Something in VR is hard to see, reach, press or sit through comfortably. |
| 🌍 **Translation** | You'd like to add your language, or fix words in one that's there (you paste the translation right into the form). |

🔒 **Found a security problem?** Please don't open an issue: report it privately (see
[SECURITY.md](SECURITY.md)).

**Include the details:** click the 🥽 VR button, open **Details** and press **Copy details**,
then paste it into the form. It lists what your browser, headset and controllers report,
which is often all that's needed. 📋

## 🚧 Roadmap

No dates, just what I'll work on after release, in this order:

1. 🐛 **Immediate bug fixes:** whatever the first wave of users runs into.
2. 🏪 **Chrome Web Store release:** install StreamXR in one click and get updates
   automatically, no more downloading new versions by hand. Still free, of course.
3. 💎 **YouTube Premium features:** Premium quality levels, Add to queue and more.
4. 🧭 **Explore page tabs:** Live, Gaming, Music, Podcasts and the rest of the "Coming Soon"
   tabs.
5. 💬 **Live Chat:** See the chat of a Live Stream while watching
6. 💬 **Commenting and Live Chat in-headset:** write comments, replies, and type in a live chat with the VR keyboard.
7. 🟣 **Twitch.tv support:** the first site after YouTube.
8. 🔐 **Groundwork for YouTube Movies, Netflix, HBO Max, Disney+ and other protected videos:** the
   infrastructure to play them in VR, ready for the day they allow it
   ([why they don't yet](#-what-about-netflix-hbo-max-and-the-others)).
9. ✨ **Whatever else I can think of** (and whatever you ask for!).

### ⏳ The "as soon as it's possible" roadmap\*

\***These jump to the front of the line** the moment the support they need becomes available.
They're waiting on browsers, Valve, YouTube or the streaming services, not on me:

- 🎞️ **YouTube Movies:** films on the big screen, the IMAX dream. 🍿 YouTube's movies are
  copy-protected, so they can't play in VR yet; as soon as YouTube allows its protected videos
  in VR in desktop browsers, they're first in line.
- 🦊 **Firefox support:** as soon as desktop Firefox supports WebXR (the web's VR support),
  which StreamXR needs to reach your headset. The code is already written to port. 📣 Help
  make it happen: ask Mozilla for WebXR in desktop Firefox on
  [Mozilla Connect](https://connect.mozilla.org) (Firefox's official place for ideas and
  feedback), or upvote the idea if someone already posted it.
- 🎮 **Full Steam Frame controller support:** every button on its own (no more B, X and Y
  acting as one), as soon as Chrome recognizes the Steam Frame controllers instead of
  reporting them as Oculus Touch.
- 🔐 **Streaming services**, starting with 🎬 **HBO Max** and 🍿 **Netflix** (the ones I'd use
  most!), then Disney+, Prime Video and the rest: as soon as they allow their protected
  videos in VR in desktop browsers ([why they can't yet](#-what-about-netflix-hbo-max-and-the-others),
  and how you can help make it happen).

## 🧱 Built to grow: three layers

StreamXR isn't a YouTube hack; it's a small VR platform with YouTube plugged into it. It's
built in three layers, each with one job:

1. 🥽 **The core** (`src/core/`): the VR interface itself. Panels, toolbars, lasers,
   controllers, the keyboard, settings, languages. It knows nothing about video or websites.
2. 🎬 **StreamXR** (`src/streamxr/`): the video player on top of it. The cinema screen, the
   360° / VR180 sphere, formats, captions, the "Watch in VR" popup. It knows about video,
   but still nothing about any particular website.
3. 📺 **Sites** (`src/sites/youtube/`): everything about one website, behind a single
   **provider**. The provider tells the player where the video is and what's playing, and
   fills the panels with the site's content (videos, comments, channels) using five
   standard panel styles.

So **adding a new site doesn't mean touching the VR code at all**: you add one folder with a
provider that answers the same questions YouTube's does ("where's the video?", "what's on
the Home page?", "subscribe to this channel"), register it, and the whole VR interface
lights up for it. That's what puts Twitch.tv on the [roadmap](#-roadmap). The full tour
is in [ARCHITECTURE.md](ARCHITECTURE.md).

**Building with AI agents?** 🤖 Fork away! The repo comes with a preconfigured
[AGENTS.md](AGENTS.md) that guides coding agents through the
project: the layers, where changes go, the code rules and the gotchas, so your agent can
start contributing right away.

## 🙌 How you can help

You don't have to write code to make StreamXR better:

- 🐞 **Report bugs:** on GitHub, go to **Issues → New issue**, pick the form that fits, and paste
  the **Copy details** report from the VR button's popup.
- 🥽 **Try it on your headset:** if you have a headset other than the Steam Frame, tell me
  what works and what doesn't. The **Details** report (press every controller button first)
  is often all I need to support it ([how](#-adding-a-headset)).
- 🧊 **Share 3D models of your controllers:** if you have models of your headset's controllers
  under a license that allows sharing and changing them with credit (CC BY, CC BY-SA, CC BY-NC-SA,
  CC0...), post them in a **Headset / controller compatibility** issue. I'll integrate them once
  pull requests open, so your controllers show up in VR as themselves.
- 🌐 **Try it in another browser:** Edge, Brave or another Chromium browser; tell me if it
  works.
- 🌍 **Translate:** add your language, or fix the Spanish (it needs a native speaker's eye);
  paste it into a **Translation** issue, no coding needed ([how](#-speaks-your-language)).
- 💡 **Suggest and vote:** ask for what you'd love to see with the **New feature request**
  form, and 👍 the issues you care about most so I know what to build first.
- 📺 **Help add a site:** know Twitch (or another streaming site) well? Share what you know in a
  **Support for another site** issue: the [three-layer
  design](#-built-to-grow-three-layers) means a site is just a provider.
- ⏸️ **Pull requests are paused for now:** while I focus on bug fixes and the roadmap, I'm
  not accepting pull requests. Please open an issue instead; it helps just as much!
- 📝 **Improve the docs:** spotted something unclear or wrong? Tell me with the
  **Documentation problem** form.
- 🦊 **Ask Mozilla for VR in Firefox:** post (or upvote) "WebXR support in desktop Firefox" on
  [Mozilla Connect](https://connect.mozilla.org), Firefox's official place for ideas and
  feedback. The more people ask, the sooner StreamXR can come to Firefox.
- 🔐 **Ask Netflix, HBO Max, Disney+ and co. for XR support** in desktop browsers
  ([why it matters](#-what-about-netflix-hbo-max-and-the-others)).
- ⭐ **Star the repo and share it** with anyone who has a headset and loves movies.

## 🎉 Made something cool with StreamXR? Show me!

Forked it and added your own feature? Got it running on a new headset, or a whole new
site? Built a wild new screen, theme or layout with your AI agent? 🤩 I'd love to see it!

📣 **Post it on your socials with the hashtag `#StreamXR`**: a clip from inside the headset,
a screenshot, or a link to your fork. Every cool idea out there helps make StreamXR better
for everyone (and the best ones might just end up on the [roadmap](#-roadmap)). 🚀

> 📜 A quick note for forks: the code is MIT, so go wild, but the Steam Frame controller
> models are non-commercial (CC BY-NC-SA 4.0). Keep their credit, and don't sell anything
> that includes them. Details in [License](#-license).

## 🧑‍💻 How it's built

A reusable VR **shell** in two parts, the **core** (`src/core/`: the VR interface) and
**StreamXR** (`src/streamxr/`: the video player on it), plus one folder per supported
**site** (`src/sites/youtube/`). The shell never names a site; each site registers itself
and plugs in through its **provider** (a middle layer), its panels (built on five standard
styles) and its page buttons. No build step and no ES modules: plain scripts loaded in
order by `manifest.json` (one vendored library, Google's Material Color Utilities, in
`third_party/`). There are no 3D formats: on desktop YouTube sends one eye only.

| Read | For |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | how the code is built, the folder map, where to make common changes, adding a site, gotchas |
| [docs/youtube.md](docs/youtube.md) | the YouTube modules, and what's been learned about YouTube's data, player, ads, live streams, playlists and comments |
| [docs/hardware.md](docs/hardware.md) | the Steam Frame and its controllers as Chrome sees them |
| [docs/design-choices.md](docs/design-choices.md) | how the interface is meant to look and behave (agree changes first) |
| [docs/known-issues.md](docs/known-issues.md) | what's unverified, quirky, or tried and dropped |
| [docs/whats-left.md](docs/whats-left.md) | what's still open: features, quirks, checks |
| [docs/features/](docs/features/) | backlogs: what YouTube offers that the VR interface doesn't use yet |
| [CHANGELOG.md](CHANGELOG.md) | what changed in each version |
| [CONTRIBUTING.md](CONTRIBUTING.md) | how to contribute and the code rules; issues go through the forms in `.github/ISSUE_TEMPLATE/` |
| [SECURITY.md](SECURITY.md) | how to report a security problem privately |
| [docs/decisions/](docs/decisions/) | why the big decisions were made |
| [AGENTS.md](AGENTS.md) | guidance for AI coding agents (the goals, rules and map) |

## 🥽 Adding a headset

The extension is built and tested on the Steam Frame only, because that's the only headset I
have. Help for other headsets is very welcome; this section is the map. Open an
issue before writing code (see [CONTRIBUTING.md](CONTRIBUTING.md)).

**What actually differs between headsets.** Almost nothing in the video side: WebXR hands
the page a pose and a framebuffer, and the renderer works the same on any headset the
browser can see. What differs is the **controllers**: how many buttons and axes they
report, in what order, and which physical button lands on which index. WebXR never names
the headset, and the controller's `profiles` list is often a generic or emulated one (the
Steam Frame arrives as `oculus-touch`).

**1. Collect what your hardware reports.** Enter VR, press every button and move every
stick on both controllers, exit, then open the VR button's **Details** and click
**Copy details**. The `controllers` part lists, per hand, the `profiles`, the button and
axis counts, and `seenPressed` (every button index that was pressed at least once). Note
which physical button gave which index. That report alone, posted in a "Headset /
controller compatibility" issue, is often enough.

**2. Inputs: `src/core/shared/controls.js`.** `BINDINGS` is the one table that says what each
input does, using the WebXR "xr-standard" indexes (0 trigger, 1 grip, 3 stick press, 4/5
face buttons, stick on `axes[2]`). The input handler, the panel's help text and the icons
on the controller models all read it (each binding's help line is a key in
`src/core/shared/strings-en.js`). If your controller follows xr-standard, it likely
works already. If it doesn't, the plan is per-controller overrides chosen by the
controller's `profiles`, kept next to `BINDINGS` with the default table unchanged; agree
the shape in an issue first. After editing `src/core/shared/`, run `node tools/sync-shared.js`.

**3. Controller models: `src/core/page/controllers/`.** Only the Steam Frame models exist today,
so other controllers are drawn as Steam Frame controllers (VR still works without models).
`config.js` → `buttonParts` maps button indexes to model parts for the press highlights,
and `fit` aligns the model with your hand. New models must come from a source whose
license allows redistribution, with their attribution kept like `models.js` does; per-
controller model selection isn't built yet, so discuss it in an issue first.

**4. Things not to do.**
- Don't detect a headset by refresh rate (it's a user setting) or by any single number. If
  something must differ per device, key it on the controller `profiles` and button layout.
- Don't spread device checks through the code: keep them in `controls.js` /
  `controllers/config.js` (or one new file next to them).
- Browser-specific code stays isolated (see [Browser support notes](#-browser-support-notes)).

**5. Test in a real session:** every binding does what the panel's help says, the laser
clicks the panels, grip grabs the bars, the models (if shown) line up with your hands, and
a 2D, a 360° and a VR180 video all play.

## 🤝 Contributing

**Pull requests are paused for now** ⏸️: I'm focusing on bug fixes and the roadmap, so I'm
not accepting them at the moment. **Issues are very welcome**: bug reports, headset reports,
feature requests and translations (see [Something not working?](#-something-not-working)
and [How you can help](#-how-you-can-help)). Issues use forms (`.github/ISSUE_TEMPLATE/`) so
each report arrives with what's needed to act on it. [CONTRIBUTING.md](CONTRIBUTING.md) has
the details, and the code rules for when pull requests open again.

## 🧊 Controller models

`src/core/page/controllers/models.js` is generated from Valve's Steam Frame controller CAD
(STEP files from https://gitlab.steamos.cloud/SteamHardware/SteamFrame, folder
`documents-controller`). To rebuild it:

```
git clone https://github.com/kovacsv/occt-import-js
node tools/controller-models/tessellate.js occt-import-js/dist <folder with the .stp files> work
python3 tools/controller-models/bake.py work src/core/page/controllers/models.js     # needs numpy
```

`parts.py` holds the rules that split the fused CAD solid into buttons, trigger, grip etc.;
`bake.py` moves the meshes into WebXR grip space and packs them.

`bake.py` writes the attribution and license header at the top of `models.js`; keep it there
if you change the script (see [License](#-license)).

## 🌐 Browser support notes

- **Chromium (Chrome, Edge, Brave):** works (tested in Chrome). Manifest V3, `"world": "MAIN"` content script.
- **Skip ad in VR** needs the separate Skip Helper extension (Chromium only; see above).
- **Firefox:** the code is written to port (`chrome.*` only in `src/sites/youtube/ui/skip-helper.js`, string-only messages, plain
  scripts, MAIN world supported since Firefox 128), but **Firefox desktop has no WebXR**,
  so the VR part can't run there today. A Firefox version will follow once Firefox desktop
  supports WebXR; the build would also need
  `browser_specific_settings.gecko.id` in the manifest.

## 📜 License

**Code:** [MIT](LICENSE). This covers everything in this repo except the files below.

**Icons:** `src/core/page/vr-panel/symbols.js` and `src/streamxr/ui/goggles-icon.js` hold icon
outlines from Google's [Material Symbols](https://github.com/google/material-design-icons)
(Rounded), copied unchanged, © Google LLC, used under the
[Apache License 2.0](third_party/material-symbols/LICENSE). The extension icons (`icons/`,
`skip-helper/icons/`, drawn by `tools/icons/make-icons.html`) are made from them too.

**Color library:** `third_party/material-color-utilities/material-color-utilities.js` is
Google's [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)
0.3.0, © Google LLC, used under the
[Apache License 2.0](third_party/material-color-utilities/LICENSE). Changed only to load as a
plain script (see its header).

**Controller models:** `src/core/page/controllers/models.js` is adapted from Valve's Steam Frame
controller CAD ([gitlab.steamos.cloud/SteamHardware/SteamFrame](https://gitlab.steamos.cloud/SteamHardware/SteamFrame),
folder `documents-controller`), © 2026 Valve Corporation, used under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
**Changes:** the STEP files were tessellated into triangle meshes, split into separate parts
(buttons, trigger, grip, etc.), transformed into WebXR grip space, and packed into a
JavaScript file. The adapted models are released under the same CC BY-NC-SA 4.0 license
and are provided as-is, without warranty (see the license).

Because of the models, this extension may not be used commercially, including selling it,
paid features, or ads. To use the code commercially, remove `models.js` (or replace it with
your own models). For commercial use of Valve's CAD, contact Valve
(steamframecompatible at valvesoftware com).

Not affiliated with, endorsed by, or sponsored by Valve Corporation or YouTube/Google.
Steam, SteamVR and Steam Frame are trademarks of Valve Corporation; YouTube is a trademark
of Google LLC.
