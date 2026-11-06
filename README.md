# 🥽 StreamXR
**YouTube, all around you.** StreamXR turns YouTube in your desktop browser into a full VR
experience: 360° and VR180 videos wrap around you, regular videos play on a giant cinema
screen, and you can browse, search, subscribe, like, save and comment without ever
taking your headset off. 🎬✨

### 👉 [Install it in a minute](#-get-started-in-a-minute) 👈

**Works with:** 🥽 the Valve Steam Frame on its own (its Chromium browser), or 🖥️ Windows + 🌐 Chrome + 🎮 SteamVR with the Steam Frame, Meta Quest 2,
Pimax Crystal Light and likely other SteamVR headsets ([full requirements](#-what-you-need))<br>
**Jump to:** [Install](#-get-started-in-a-minute) · [What's new](#-whats-new-in-v010211) ·
[What you get](#-what-you-get) · [Controls](#-controls) ·
[Quick troubleshooting](#-quick-troubleshooting) · [Your privacy](#-your-privacy) ·
[Roadmap](#-roadmap) · [How you can help](#-how-you-can-help)

> **Early access** (version 0.102). Free and open source, forever. It already works every day; it's
> still growing fast, and your feedback shapes what comes next.
>
> StreamXR is vibe coded by one guy (me!), and the only headset I've got is the Steam Frame.
> Bug fixes, updates and support for more headsets and sites are coming, so please be
> patient with me. 😭🙏

## 🚀 Get started in a minute

Two ways to run it:
- 🖥️ **[On a PC](#on-a-pc):** a Windows PC with **Google Chrome** and **SteamVR**, and any
  headset that works with SteamVR.
- 🥽 **[Right on the Steam Frame](#right-on-the-steam-frame-no-pc):** in the Frame's own
  Chromium browser, no PC needed.

([Full requirements](#-what-you-need).)

### On a PC

1. **Download:** go to the [latest release](../../releases/latest), scroll to **Assets** and
   click **Source code (zip)**. Unzip it somewhere it can stay, like your Documents folder: in
   File Explorer, right-click the zip → **Extract All…** → pick the folder → **Extract**.
   (Chrome runs StreamXR from there, so don't delete it.)
2. **Install in Chrome:** type `chrome://extensions` in the address bar, turn on
   **Developer mode** (top right), click **Load unpacked** and pick the unzipped folder (the
   one with `manifest.json` inside). The **StreamXR Dashboard** opens with a short welcome.
   *(Developer mode is just how extensions from outside the Chrome Web Store are installed.
   StreamXR is coming to the Web Store soon.)*
3. **Start SteamVR** on your PC, and connect your headset to it.
   - **Steam Frame:** in the headset, go to **Streaming Status**, find the PC that's running
     SteamVR, open the **Advanced** drop-down and pick **Stream VR without game**.
   - **Other headsets:** connect them to SteamVR the way you usually do, with SteamVR set as
     your OpenXR runtime ([how](#-quick-troubleshooting)).
4. **Then open Chrome.** ⚠️ Chrome only looks for a headset when it starts: if SteamVR
   wasn't running yet, close every Chrome window and open it again.
5. **Pin StreamXR** to the toolbar: click the 🧩 puzzle icon at the top right of Chrome, then
   the 📌 pin next to StreamXR.
6. **Check your setup (optional):** click StreamXR's button in the toolbar → **Open StreamXR
   Dashboard** → **Test VR**. If something's wrong, the Dashboard says what's most likely the
   problem.
7. **Watch!** On YouTube, click the 🥽 **VR button** (in the top bar next to **+ Create**, or in
   a video's player), then **Enter VR**. The first time, Chrome asks to use virtual reality
   devices: choose **Allow while visiting the site**. That's it! 🍿

No video playing yet? No problem: you'll see YouTube's logo on the big screen; pick
something from **Explore**, **You** or **Search** right inside VR.

**Want to skip ads from inside VR?** Load the `skip-helper` folder (inside the StreamXR folder)
with **Load unpacked** too. It's optional ([what it is](#-skipping-ads)); YouTube Premium
members don't need it.

**Updating to a new version:** download the new release, replace the old folder's contents
with the new ones, then press the ↻ reload button on StreamXR's card in `chrome://extensions`
**and** reload your YouTube tab. Your settings stay. (Once StreamXR is on the Chrome Web Store,
updates will be automatic.)

### Right on the Steam Frame (no PC)

StreamXR runs right in the Frame's own web browser, Chromium. No PC needed, and no typing of
your own: you'll copy one line into the Frame's terminal app.

**You'll need:** SteamOS **0.5.7 or newer** on the Frame. For now that's a **Beta**: in the
Frame's **System** settings, under **Beta Participation**, set **System Update Channel** to
**Beta**, then install the update.

1. **Install or update Chromium** (VR needs version 157 or newer): open **Discover**, the
   Frame's app store, search for **Chromium** and press **Install**. Already have it? Open
   Discover's **Updates** page and update it there.
2. **Open Konsole,** the terminal app (it's in the app menu).
3. **Download StreamXR.** Copy the line below (the copy button at its right end does it in
   one click), paste it into Konsole with **Ctrl + Shift + V** (or right-click by Clicking the Right Analog Stick on the Steam Frame Controller → **Paste**),
   and press **Enter**:
   ```bash
   mkdir -p ~/Downloads/StreamXR && curl -L https://github.com/FauxxYT/StreamXR/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1 -C ~/Downloads/StreamXR
   ```
   It downloads the newest StreamXR into a **StreamXR** folder in your **Downloads**. Leave
   that folder there: Chromium runs StreamXR from it.
4. **Add it to Chromium.** Open Chromium and go to `chrome://extensions`. Turn on
   **Developer mode** (top right) and click **Load unpacked**. In the window that opens, go to
   **Downloads**, select the **StreamXR** folder, and confirm (**Open** / **Select**).
5. **Watch!** On YouTube, click the 🥽 **VR button** (in the top bar next to **+ Create**, or in
   a video's player), then **Enter VR**. It can take a second or two. The first time, choose
   **Allow while visiting the site**. 🍿
6. **Make the text sharp** (recommended): while you're in VR, press the **Steam button** to open
   Chromium's **VR video settings**, and set the **per-eye resolution** to the highest value
   (**3408**). The default makes text look blurry.

**Updating to a new version:** run the line from step 3 again. Then, in `chrome://extensions`,
press the ↻ button on StreamXR, and reload your YouTube tab. Your settings stay.

**Tips for the Frame:**
- **Right-click = click the right stick** (press it in) on the Frame's desktop.
- **Load unpacked only shows folders,** not `.zip` or `.tar.gz` files. The line in step 3
  unpacks StreamXR for you; if you downloaded it some other way, unpack it first, then pick
  the folder that has `manifest.json` in it.
- **Prefer the terminal for Chromium too?** This line installs or updates it:
  `flatpak install -y --or-update flathub org.chromium.Chromium`

Stuck? See [Quick troubleshooting](#-quick-troubleshooting).

## ✅ What you need

| | Works | Notes |
|---|---|---|
| 🖥️ **Computer** | **Windows 10 / 11**, or **none** on the Steam Frame | Tested on Windows 11. macOS and Linux PCs aren't supported (Chrome's WebXR there needs Windows + SteamVR). On the Steam Frame, StreamXR runs in its own browser, no PC needed ([how](#right-on-the-steam-frame-no-pc)). |
| 🌐 **Browser** | **Google Chrome** on a PC<br>**Chromium 157+** on the Steam Frame | Tested. On the Frame: SteamOS 0.5.7 or later. Other Chromium browsers (Edge, Brave) should work but haven't been tried. Firefox can't yet: desktop Firefox has no WebXR (a 🦊 Firefox version will come once it does). |
| 🥽 **Headset** | **Valve Steam Frame**<br>**Meta Quest 2** (reported by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack))<br>**Pimax Crystal Light** (reported by [u/Livid-Escape-4820](https://www.reddit.com/user/Livid-Escape-4820)) | **Steam Frame:** tested and tuned for it, controller models and all, either streamed from your PC or right in the Frame's own Chromium browser (no PC).<br>**Quest 2:** reported working through SteamVR, 8K videos included. Its controllers show as Steam Frame models.<br>**Pimax Crystal Light:** reported working through SteamVR.<br>Other SteamVR headsets may well work too; their buttons may be mapped differently ([help add yours](#-adding-a-headset)). |
| 🎮 **VR software** | **SteamVR** (on a PC) | Running **before** you open Chrome, and set as your OpenXR runtime. To use the Steam Frame from a PC, stream it with **Stream VR without game** ([how](#on-a-pc)). Nothing extra on the Frame's own browser. |
| 📺 **Site** | **YouTube** | Signed in or out. With YouTube Premium, even better (no ads). |
| 🧩 **Optional** | **Skip Helper** | A tiny second extension that lets you skip ads from inside VR ([why it's separate](#-skipping-ads)). |

## ✨ What's new in v0.102.11

- 🥽 **Runs right on the Steam Frame, no PC needed!** The Frame's own Chromium browser
  supports WebXR from Chromium 157 (SteamOS 0.5.7), and StreamXR works there as it is.
  [How to install it on the Frame](#right-on-the-steam-frame-no-pc).
- 🔤 **Cleaner text on the panels:** no more jagged, shimmering letters where the headset
  draws fewer pixels than the panels have (like the Frame's own browser), and a new **Text
  sharpness** slider (Settings → Appearance) to make it crisper. Captions are smoother too.
- 🏠 **See your room on the Steam Frame:** in the Frame's own browser, turn on **Passthrough**
  any time in VR (Settings → Appearance), or **See your room** in the VR button's popup before
  entering, and the cinema screen hangs in your actual room. **Strength** sets how much of
  the room shows, from fully visible to hidden.

Missed **v0.102.0**? It brought commenting in VR, the StreamXR Dashboard, Shorts in Explore,
3D Top & Bottom with the 3D Cinema settings, and better troubleshooting: see the
[changelog](CHANGELOG.md#01020).

## 🌟 What you get
### 🎥 Every kind of video, the way it was meant to be seen
- **360° and VR180** wrap around you (YouTube's cubemap "mesh" format included); the format
  is detected automatically and can be changed any time. **3D side-by-side** videos play in
  real 3D, as VR180 or on the cinema screen, and **3D top & bottom** ones on the cinema screen
  (pick it in the Format menu).
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
- **Quality** (8K, 4K, 60 fps, and **1080p Premium** 💎 with Premium), **speed**, **volume**,
  **format**, **recenter** and exit; **Jump ahead** 💎 at the seek bar's end when YouTube offers it.
- **💬 Captions** in any language the video has, drawn right in VR.
- **🔖 Save** to Watch later or any of your playlists.
- **ℹ️ Info cards** with their teasers at the right moment, and **Autoplay** with its
  "Up next" countdown.
- Playlists get **Previous / Next** with a preview card; live streams get a **LIVE** label
  that jumps you back to live.
- It fades away while you watch, and one pull of the trigger brings it back.

### 🗂️ Panels around the video, never on top of it
Laid out around a **Safe Zone** you can tune, so the picture always stays clear, with
glassy toolbars on each side:
- ⬅️ **About this video:** **Description** (with chapters and the transcript), **Comments**
  (write, reply, edit and delete your own, with threaded replies) and **Channel** (videos,
  Shorts, live streams, playlists, podcasts, posts, membership, About, Subscribe).
- 🔎 **Search** above the video, with suggestions as you type on the **VR keyboard**.
- ➡️ **What to watch:** **Up Next** (with your **queue** and the video's **end screen**),
  **Explore** (your Home feed with all its topic chips, "Immersive videos" included, plus
  Shorts, Live, Gaming, Music, News, Hype, Courses, Podcasts and Memberships) and **You**
  (Subscriptions, your Channels with their notification bells, Your channel, History,
  Playlists, Watch later, Liked videos). Any playlist opens as a page you can browse before
  playing, and any video card can be **added to the queue**.
- 💬 **Live chat** on live streams (and **chat replays** on finished ones, playing along with the
  video): it opens by itself and stays up while you watch. Read it with emojis, badges, Super
  Chats and the pinned message; send reactions and type messages on the VR keyboard (with your
  channel's member emojis); see your **XP** and the **Top fans**. Every side can be moved
  by the grab bar beside its toolbar.

### 🎨 Make it yours (Settings)
- Looks: **YouTube** or **Material 3** colors, **glass** panels with an adjustable tint, the
  **panel size**, the **text sharpness**, and **Passthrough** (your room around the video, with its strength).
- The cinema screen's **curve**, **distance** and **glow**, and **Follow your head** (the screen
  and panels catch up when you turn).
- **3D Cinema:** **3D depth** (push everything back if the 3D feels harsh) and **Swap eyes**,
  for 3D videos.
- The **Safe Zone**, how long each part waits before it **fades**, the **laser's
  steadiness**, the **keyboard layout** and the **language**.

### 🏠 The StreamXR Dashboard
A page of StreamXR's own, before any site is open: click StreamXR's button in Chrome's toolbar
(its popup shows the headset's status and the sites too) → **Open StreamXR Dashboard**.
- **Your headset:** whether it's ready, and **Quick troubleshooting** when it isn't.
- **Test VR:** StreamXR's VR interface with nothing playing, to check your setup without any
  site.
- **Sites:** open YouTube from here; more sites are coming.

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

## 🎮 Controls

| Input | Does |
|---|---|
| Trigger | click the panels with the laser; hold on the seek bar to scrub; drag a scrolling area; on empty space, hides the panels, toolbars and search bar at once (another pull brings them back, with the lasers) |
| A (right) | play / pause |
| B (right) | swap the controls panel for the keyboard (same place), and back: click its keys with the laser to type into a text box (Search, a comment); the bar under it moves it (and the controls panel with it), its bottom corners resize it |
| Left D-pad | show / hide the panels |
| Grip | recenter, or grab (its icon turns into a hand when it will grab): the bar under the panel moves it (the bar beside a side's toolbar moves that whole side; recentering keeps what you moved, unless you turn on Settings → Safe zone → "Recenter resets panels", and holding the right stick for 3 s puts it all back); on the cinema screen the corner arcs resize it and the bar under it moves it (remembered) |
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

## 🔧 Quick troubleshooting

VR won't start? Click StreamXR's button in Chrome's toolbar (or the 🥽 VR button's popup on
YouTube): its **Quick troubleshooting** section shows the **most likely issue** on your PC,
with a short checklist. The **StreamXR Dashboard** has it too, and **Test VR** checks your
setup without any site.

| If... | Try this |
|---|---|
| 🚫 **"No VR headset found"** / Enter VR is greyed out | Chrome only looks for a headset when it starts. Start **SteamVR**, connect your headset (Steam Frame: **Streaming Status** → your PC → **Advanced** → **Stream VR without game**), then close **every** Chrome window and open Chrome again. |
| 🧩 **Still "No VR headset found"** with SteamVR running | Chrome reaches your headset through the **OpenXR runtime**, and other VR software (Quest Link, Virtual Desktop and others) can take it over. In SteamVR, open **Settings → OpenXR** and set **SteamVR as the OpenXR runtime**. Then quit Chrome fully: turn off **Settings → System → Continue running background apps when Chrome is closed** (in Edge, also **Startup boost**), close every window and open it again. |
| 🧪 **Not sure it's StreamXR?** | With SteamVR running, open the [WebXR samples](https://immersive-web.github.io/webxr-samples/) in Chrome. If their **Enter VR** is greyed out too, Chrome can't see your headset on any site: it's your PC's VR setup (the two rows above, or the next one), not StreamXR. |
| 🛠️ **SteamVR says it's already the OpenXR runtime, but nothing finds the headset** (the WebXR samples too) | SteamVR's registration as the runtime can be broken even while its settings say it's set (often after other VR software was installed and removed). **Reinstall SteamVR**: in Steam's Library, right-click **SteamVR → Manage → Uninstall**, then install it again, and say **yes** when it asks to become the OpenXR runtime. Then quit Chrome fully and open it again. (Found with [u/Timtronic125](https://www.reddit.com/user/Timtronic125).) |
| 🪟 **"Another tab is already in VR"** | Chrome allows one VR session at a time. The popup names the tab that's in VR: click **Exit VR there**, then Enter VR again. |
| ⚠️ **"Couldn't start VR: InvalidStateError…"** | The headset was found but SteamVR wouldn't start a session. Close any other browser or app that's in VR, check the headset for a SteamVR prompt or error, then restart SteamVR and try again. |
| 🔍 **No VR button on YouTube** | Make sure StreamXR is turned on in `chrome://extensions`, then reload the YouTube tab. |
| 🔄 **Just updated StreamXR and nothing changed** | Reload your YouTube tab too: an open tab keeps the old version until it's reloaded. |
| 🌀 **A video looks stretched, doubled or split into squares** | Pick another format in the popup before entering VR, or with the **Format** button on the controls panel. |
| 🎯 **The laser feels jittery** | Settings → **Laser** → turn up the steadiness. |
| 🔍 **Want it sharper?** | For the panels' text: Settings → Appearance → **Text sharpness** (too high can make it shimmer). On a PC, StreamXR draws at the size SteamVR asks for: raise it in **SteamVR → Settings → Video → Render Resolution** (or a custom resolution for Chrome alone): sharper text and video, more work for your graphics card. The Steam Frame's stream can still limit how much you see. |
| 🫥 **The panels are in the way, or out of reach** | Press **Grip** (pointing at nothing) to recenter, or tune the **Safe Zone** in Settings. |
| ⏩ **The panel says "Skip on desktop"** | That's normal without the optional [Skip Helper](#-skipping-ads): click Skip ad in the browser window, or install the helper. |
| ♻️ **Settings got into a weird state** | Hold the **right stick click** for 3 seconds to reset everything to the defaults. |

Still stuck? See [Something not working?](#-something-not-working) for how to report it.

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

## 🔒 Your privacy

StreamXR only talks to the sites it supports (today that's just YouTube), as you, the same way
their own websites do. That's it.

- **Only the supported sites:** today that's one permission, `www.youtube.com`. Each new site
  (like Twitch, on the roadmap) adds just that site. No access to other sites, your tabs or
  your history.
- **No servers, no analytics, no tracking.** I don't collect anything, and there's nowhere for
  it to go.
- **Your settings stay in your browser.**
- **The StreamXR Dashboard and the toolbar popup** run on your PC: they check your headset
  right there, and show each site's own icon, loaded from that site. A small background script
  only opens the Dashboard once after you install StreamXR, opens sites when you pick them, and
  finds which StreamXR tab is in VR when another one wants to start. No new permissions.
- **Copy details** (in the VR button's menu) copies troubleshooting info to your clipboard only
  when you click it, so you can paste it into a bug report if you want to: your browser and
  operating system versions, your graphics cards, whether a headset is found, headset and
  video-format info, and StreamXR's own recent warnings (with video, playlist and channel IDs
  removed). It never includes what you watch or your account, and it never leaves your PC
  unless you paste it somewhere yourself.
- **The [Skip Helper](#-skipping-ads)** asks for Chrome's scary-sounding `debugger` permission
  because it's the only way to press YouTube's Skip button for real. It only works in YouTube
  tabs, only presses Skip (and StreamXR's own Enter VR button, only when StreamXR asks; that
  feature is switched off for now), and lets go right away. It's optional and
  [short enough to read](skip-helper/service-worker.js) (about 110 lines).
- It's all open source, so you don't have to take my word for it. 🙂

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
  controllers. Besides the Steam Frame, the Quest 2 (by
  [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack)) and the Pimax Crystal Light (by
  [u/Livid-Escape-4820](https://www.reddit.com/user/Livid-Escape-4820)) have been reported working; other headsets are untested. **Got 3D models of your controllers?** 🧊
  Share them in a **Headset / controller compatibility** issue (with where they came from and
  their license) and I'll integrate them once I start accepting pull requests. They need a
  license that lets them be shared and changed in a free project, with credit (for example
  CC BY, CC BY-SA, CC BY-NC-SA or CC0), like the Steam Frame models' (CC BY-NC-SA 4.0).

**🎬 Video**
- **Most 3D (stereo) videos play flat.** On desktop, YouTube sends only one eye's picture for
  most 3D videos (and caps some VR180 videos at 4K), while the Meta Quest app gets both eyes.
  StreamXR shows what YouTube's own player plays and won't bypass it: [why](docs/decisions/0002-site-player-only.md).
  The 3D videos that do arrive with both eyes side by side or stacked (top & bottom) play in
  3D (Format menu).
- **8K videos stutter a little on the Steam Frame's own browser** (no PC): the headset's chip
  is doing everything itself. 4K at 60 fps plays smoothly: pick it with the **Quality**
  button. (Streamed from a PC, 8K is fine.)
- **Captions on 180° / 360° videos** sit low in front of you and glide after your view;
  they work, but their placement still needs polish.
- **YouTube's movies can't play in VR** (they're copy-protected, the free ones too). They're
  first on the ["as soon as it's possible" roadmap](#-roadmap).

**🗂️ Panels and YouTube**
- **YouTube changes can break things** for a while: StreamXR reads YouTube's own page and
  data, and YouTube changes them often.
- **Best with YouTube in English.** A few panels recognize YouTube's own English words
  (the "All" chip, "Joined", an ad's "1 of 2"), so some labels can go missing in other
  languages. StreamXR's own words follow your language setting either way.
- **Glass menus blur only the video,** not the panels behind them.
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

No dates, just what I'll work on next, in this order:

1. 🐛 **Immediate bug fixes:** whatever the first wave of users runs into.
2. ✅ **Add to queue:** done (v0.101.7): line up videos to watch next from any panel,
   then clear it or save it as a playlist.
3. ✅ **Explore page tabs:** done: Live, Gaming, Music, Hype, Courses, Podcasts and Memberships
   (v0.101.7), and Shorts (v0.102.0). Movies & TV can't play in VR (they're copy-protected).
4. ✅ **Live Chat:** done (v0.88.1): read, react and type in a live stream's chat.
5. ✅ **YouTube Premium:** done (v0.93.3): 1080p Premium and Jump ahead, marked with the Diamond.
6. ✅ **Commenting in-headset:** done (v0.102.0): write, reply to, edit and delete comments
   with the VR keyboard.
7. 🏪 **Chrome Web Store release, StreamXR 1.0:** install StreamXR in one click and get updates
   automatically, no more downloading new versions by hand. Still free, of course.
8. 🟣 **Twitch.tv support:** the first site after YouTube.
9. 🪼 **Jellyfin** and 🟠 **Plex support:** your own media server's movies and shows in VR, on the
   cinema screen. Your own files aren't copy-protected, so they will be able to play.
10. 🎵 **Music streaming**, starting with **Spotify:** listen while you're in VR, with the player's
    controls, album art and queue around you.
11. 🌐 **Barebones mode (experimental):** any video on any website on the cinema screen, with the
    basic controls (play, seek, volume, format), for sites without full support. Some sites
    won't allow it.
12. 🔐 **Groundwork for YouTube Movies, Netflix, HBO Max, Disney+ and other protected videos:** the
    infrastructure to play them in VR, ready for the day they allow it
    ([why they don't yet](#-what-about-netflix-max-and-the-others)).
13. ✨ **Whatever else I can think of** (and whatever you ask for!).

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
- ✅ **Native Steam Frame support:** done! StreamXR runs right in the Steam Frame's own
  Chromium browser (Chromium 157, SteamOS 0.5.7), with no PC and no SteamVR streaming needed
  ([how](#right-on-the-steam-frame-no-pc)).
- 🔐 **Streaming services**, starting with 🎬 **HBO Max** and 🍿 **Netflix** (the ones I'd use
  most!), then Disney+, Prime Video and the rest: as soon as they allow their protected
  videos in VR in desktop browsers ([why they can't yet](#-what-about-netflix-max-and-the-others),
  and how you can help make it happen).

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
  too, a cinema screen hanging in your actual living room. It already works on the Steam
  Frame's own browser: turn on Passthrough in Settings → Appearance (or "See your room" in
  the popup), and set how much of your room shows with its Strength.

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

## 🙌 How you can help

You don't have to write code to make StreamXR better:

- 🐞 **Report bugs:** on GitHub, go to **Issues → New issue**, pick the form that fits, and paste
  the **Copy details** report from the VR button's popup.
- 🧪 **Help test the live chat:** these parts are built from what YouTube is known to send, but I
  haven't caught them on a real stream yet. If you see one in VR, tell me whether it looked
  right (a **Bug report** if it didn't, or a comment on the **Live chat: help test** issue if it did):
  - 💰 **Super Chats** and **Super Stickers** (colored cards with the amount)
  - 🎉 **New members** and **gifted memberships** (green cards)
  - 🛡️ The **channel owner's** name on a yellow chip, and **moderators** in blue with a wrench
  - 🗑️ A **deleted message** disappearing, and a **pinned message** in the banner at the top
  - 😺 **Your channel's member emojis** inside a message you send
  - 🚫 A chat you **can't type in** (members only, slow mode...): YouTube's reason should show
    instead of the message field
  - 📺 An **ad** during a chat replay: the chat should carry on where it was
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
  ([why it matters](#-what-about-netflix-max-and-the-others)).
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

---

# 🛠️ For developers

Everything below is about how StreamXR is built. You don't need any of it to use it.

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

## 🧑‍💻 How it's built

A reusable VR **shell** in two parts, the **core** (`src/core/`: the VR interface) and
**StreamXR** (`src/streamxr/`: the video player on it), plus one folder per supported
**site** (`src/sites/youtube/`). The shell never names a site; each site registers itself
and plugs in through its **provider** (a middle layer), its panels (built on five standard
styles) and its page buttons. No build step and no ES modules: plain scripts loaded in
order by `manifest.json` (one vendored library, Google's Material Color Utilities, in
`third_party/`). Most 3D videos reach desktop as one eye only, and StreamXR never bypasses the site's player to get more ([decision 0002](docs/decisions/0002-site-player-only.md)).

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

The extension is built and tested on the Steam Frame, because that's the only headset I
have; [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack) has reported the **Meta Quest 2** working through SteamVR too, and [u/Livid-Escape-4820](https://www.reddit.com/user/Livid-Escape-4820) the **Pimax Crystal Light**. Help for other
headsets is very welcome; this section is the map. Open an
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
