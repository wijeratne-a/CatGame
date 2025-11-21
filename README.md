# Laser Kitty vs. The Grilled Poopocalypse

A 2D platformer game built with HTML5 Canvas and JavaScript.

## How to Run

### Method 1: Direct File Opening (Simplest)

1. **Locate the project folder** on your computer
2. **Double-click** `index.html` to open it in your default web browser
3. The game will load automatically and you'll see the title screen

### Method 2: Using a Local Web Server (Recommended)

If you encounter any issues with Method 1, or if you're a developer, use a local web server:

#### Option A: Python (if installed)
1. Open a terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd /path/to/CatGame
   ```
3. Run one of these commands:
   - **Python 3:**
     ```bash
     python3 -m http.server 8000
     ```
   - **Python 2:**
     ```bash
     python -m SimpleHTTPServer 8000
     ```
4. Open your browser and go to:
   ```
   http://localhost:8000
   ```

#### Option B: Node.js (if installed)
1. Install a simple HTTP server globally:
   ```bash
   npm install -g http-server
   ```
2. Navigate to the project folder:
   ```bash
   cd /path/to/CatGame
   ```
3. Start the server:
   ```bash
   http-server
   ```
4. Open your browser and go to the URL shown (usually `http://localhost:8080`)

#### Option C: VS Code Live Server Extension
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## System Requirements

- **Browser:** Modern desktop browser (Chrome, Firefox, Safari, Edge)
- **Platform:** Desktop only (no touch/mobile support)
- **No additional dependencies:** The game runs entirely in the browser with no external libraries

## Controls

- **Left Arrow** - Move left
- **Right Arrow** - Move right
- **Up Arrow** - Jump (press again while airborne for double jump)
- **Spacebar** - Fire laser (BOSS phase only)
- **ESC** - Pause/Unpause
- **Enter** - Start game (from menu) / Restart (from game over/victory screens)

## Gameplay

- You have **3 lives**, each with **100% HP** (7 hits = 1 life lost)
- Collect coins for points
- Collect sushi to restore HP
- Stomp enemies from above to defeat them
- Reach the boss arena and defeat the boss with your laser
- Kill all grunt enemies to earn an extra life

## Troubleshooting

**Game doesn't load:**
- Make sure all three files (`index.html`, `style.css`, `game.js`) are in the same folder
- Try using Method 2 (local web server) instead of opening the file directly
- Check browser console for errors (F12 → Console tab)

**Controls not working:**
- Make sure the browser window/tab has focus
- Try refreshing the page (F5 or Ctrl+R / Cmd+R)

**Performance issues:**
- Close other browser tabs to free up resources
- The game targets 60 FPS; lower frame rates may indicate system performance issues

## File Structure

```
CatGame/
├── index.html    # Main HTML file
├── style.css     # Styling
├── game.js       # Game logic and mechanics
└── README.md     # This file
```

## Notes

- The game is self-contained with no external dependencies
- No audio/music is included in this version
- All game parameters can be tweaked in the `CONFIG` object at the top of `game.js`

