# Translaty Browser Extension

## Overview
Translaty is a Chrome browser extension that provides context-aware text and image translations using Google's in-browser `.prompt` API. It supports multiple translation modes (Professional, Learning, Literature, Casual, Custom, Meme) and languages (English, Spanish, Japanese). Key features include a draggable/resizable panel, a popup for history/settings, and context menu integration. Developed using Chrome Canary. 

## Features
- **Translation Modes**: Formal, conversational, literary, and meme translations with customizable prompts.
- **Supported Languages**: English, Spanish, Japanese (expandable).
- **Image Translation**: Extracts and translates text from images (e.g., memes).
- **History Management**: View, copy, or clear translation history.
- **UI Components**: Floating panel for in-page translations, popup for settings/history.
- **Context Menu**: Right-click to translate text/images or open the panel.
- **Performance**: Debouncing for requests, persistent AI sessions, and local storage for settings.

## Installation -Used Chrome Canary for Development
### Option 1: Load Unpacked Extension (Recommended for Development)
1. Clone the repository: `git clone (https://github.com/BPbyte/Translaty)`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked" and select the `src/` folder in the repository
5. The extension will appear in Chrome and be ready to use

### Option 2: Install Packaged Extension
1. Locate the `dist/translaty-v1.0.0.crx` file in the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Drag and drop the `.crx` file onto the extensions page
5. Confirm the installation when prompted
6. Note: Chrome may restrict `.crx` installation for security reasons; use Option 1 if issues arise

### Option 3: Install from Zip
1. Extract `dist/translaty-v1.0.0.zip` to a folder
2. Follow the steps in Option 1, selecting the extracted folder as the extension root

### Chrome Canary Setup
1. Install Chrome Canary https://www.google.com/chrome/canary/
2. Enable Flags: Required
     #prompt-api-for-gemini-nano
     #optimization-guide-on-device-model
4. Enable Flags: Optional (For Preformance & Testing) 
     #prompt-api-for-gemini-nano-multimodal-input
     #enable-webgpu-developer-features
     #webnn-directml
     #force-high-performance-gpu
5. Ensure Machine REQUIRMENTS Sufficiant
   
## Usage
- Select text, right-click, and choose "Translate with Translaty" to translate.
- Right-click an image to translate its text (e.g., memes).
- Use the panel to view translations or adjust settings (mode, language).
- Open the popup (`popup.html`) via the context menu ("Open Translaty Panel") for history and detailed settings.

## File Structure
- **dist/**: Contains the packaged extension (`translaty-v1.0.0.crx`) and zipped source (`translaty-v1.0.0.zip`)
- **src/**:
  - `modes.js`: Defines translation modes and supported languages
  - `popup.js`: Manages the popup UI for settings, history, and recent translations
  - `content.js`: Handles core translation logic for text and images
  - `panel.js`: Manages the floating panel UI (drag, resize, collapse)
  - `background.js`: Sets up context menus and handles image fetching/popup creation
  - `manifest.json`: Extension configuration
  - `panel.html`, `panel.css`, `popup.html`: UI templates and styles

## Dependencies
- Google's in-browser `.prompt` API
- Chrome APIs (`chrome.contextMenus`, `chrome.storage.local`, `chrome.runtime`)

## Notes for Judges
- The `.crx` file in `dist/` is provided for convenience but requires Developer mode to install.
- The source code in `src/` is fully functional and can be loaded unpacked for review.
- Test cases:
  - Select text (e.g., "Hello, world!") and translate to Spanish in "Casual" mode.
  - Right-click a meme image with text and translate to Japanese in "Meme" mode.
  - Open the popup to view translation history and adjust settings.

## Future Improvements - ** Contributions Welcome (post hackathon submit) **
- Expand supported languages
- Add input validation for custom mode parameters
- Improve accessibility (e.g., ARIA attributes)
- Cache images for faster repeated translations
- Add bounds checking for panel dragging/resizing
- Add iamge overlay capabilities
- Batching larger context for easier page/multi-page translations 
- Stylish* Reload


## Component Requirement
- Chrome Version 127+ (Stable 138+ recommended; use Canary/Dev for latest features)
- Operating System - Windows 10/11
  - macOS 13+ (Ventura or later)
  - Linux (e.g., Ubuntu 20.04+)
  - ChromeOS (Platform 16389.0.0+ on Chromebook Plus devices only)
- CPU - Modern x86_64 or ARM64 processor (e.g., Intel Core i5 8th gen+ or AMD Ryzen 3+; Apple M1+ for macOS)
- GPU - Discrete or integrated GPU with ≥4 GB VRAM (e.g., Intel UHD Graphics 630+, NVIDIA GTX 1050+, AMD RX 550+; WebGPU support required)
- RAM - 8 GB system RAM (for model loading; 16 GB for multitasking)
- Storage - ≥22 GB free disk space (for ~2.4–20 GB model download; auto-removed if <10 GB free)
- Internet - Required once for initial model download; fully offline afterward

## Performance Notes
- General translations are speedy and concise, adjust prompt as needed to restrict verbosity with (single translations) or similar prompting.
- Literature mode largly works as intended but sometimes confuses gender roles and Names, limiting context often helps.
- Long translation context restricted by default here, adjustable in code but the longer the context runs the worse the translation becomes.

## License
MIT License

## Author
Brett Pottle
