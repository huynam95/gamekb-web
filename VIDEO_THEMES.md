# Video Topics

The home page uses a lightweight **Today's Topic** flow for planning Shorts.

Each topic only has two editable fields:

- **Title**: the video direction, for example `Games That Remember You`
- **Opening Hook**: the first line that should appear at the top of the generated script

Selecting a topic automatically turns on pick mode. The topic does **not** filter ideas by itself. You still browse, search, filter, randomize, and manually pick ideas that fit the selected direction.

Topics are stored in `localStorage` under:

```text
gamekb-video-themes
```

The active topic is stored under:

```text
gamekb-active-video-theme
```

The default topics live in:

```text
src/lib/videoThemes.ts
```

When you create a video script, the selected topic hook is inserted at the top of the script content automatically.
