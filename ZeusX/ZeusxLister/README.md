# ZeusX Auto-Lister (GUI)

Manage up to 10 listings, each with its own fields and its own relist interval.
The app attaches to a Chrome you control, so it never logs in itself.

## One-time: build the .exe (on Windows)

1. Put `zeusx_lister_gui.py` and `build_exe.bat` in the same folder.
2. Double-click `build_exe.bat` (or run it in a terminal).
3. When it finishes, your app is at `dist\ZeusXAutoLister.exe`.

You can also just run it without building:

```
pip install playwright
python zeusx_lister_gui.py
```

(No `playwright install` needed — the app attaches to your own Chrome over the
debug port, so it doesn't download or launch its own browser.)

## Every time you use it

1. Close all Chrome windows. Start Chrome with a debug port and a dedicated profile:

   ```
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
       --remote-debugging-port=9222 --user-data-dir="C:\Users\Jay\zeusx-chrome"
   ```

2. In that Chrome, log in at zeusx.com. Leave it open.
3. Launch the app (exe or script).
4. **Listings tab:** pick a slot on the left, fill in the fields on the right,
   tick **Enabled**, click **Apply to slot**. Repeat for up to 10 slots.
5. **Settings tab:** set the default interval and (for first tests) keep
   **Dry run** ticked. Save settings.
6. Click **Start**. Watch the **Log** tab.

When the dry run shows `OK [dry-run-stopped-before-create]`, untick Dry run in
Settings, Save, and Start again to go live.

## Field notes

- **Image**: only photo categories need it. Leave blank for duration items.
- **Attributes**: `id=value, id=value` (e.g. `84=2347, 83=2334`). These encode
  the item's dropdown selections for its category.
- **Days / Hours**: only for duration categories (e.g. category 2). Leave blank
  otherwise.
- **Interval min**: per-listing override; blank uses the Settings default.
- Each slot relists independently: old offer is **cancelled** first, then the
  new one is posted, and the new offer id is remembered in `zeusx_state.json`.

## Files the app writes (next to the exe/script)

- `zeusx_config.json` — your slots + settings (auto-saved)
- `zeusx_state.json` — last offer id per slot (for cancelling on relist)
- `zeusx_lister.log` — not used by the GUI; logs show in the Log tab
