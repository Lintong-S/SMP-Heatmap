"use strict";

include('scripts/utils.js');

// Configuration
const CELL_SIZE = 15;
const CELL_MARGIN = 2;
const HEADER_HEIGHT = 30;
const ARROW_SIZE = 20;
const COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

// State variables
let width = 0;
let height = 0;
let currentDate = new Date();
let playCounts = {};
let hoverDay = null;
let assetPath = "";
let config = {};

// Arrow definitions
const arrows = {
    left: {x: 0, y: 0, w: ARROW_SIZE, h: ARROW_SIZE},
    right: {x: 0, y: 0, w: ARROW_SIZE, h: ARROW_SIZE}
};

// Get full path to package assets
function getAssetPath(filename) {
    return assetPath + "\\assets\\" + filename;
}

// Initialize panel
function on_init() {
    // Get package installation path
    const scriptInfo = window.ScriptInfo;
    const packageInfo = utils.GetPackageInfo(scriptInfo.PackageId);
    assetPath = packageInfo.Directories.Root;
    
    // Load configuration
    try {
        config = utils.ReadJSON(fb.ProfilePath + "github_calendar_config.json");
    } catch (e) {
        // Create default config if missing
        config = {
            apiKey: "YOUR_LASTFM_API_KEY",
            username: "YOUR_LASTFM_USERNAME"
        };
        utils.WriteJSON(fb.ProfilePath + "github_calendar_config.json", config);
    }
    
    // Load play counts
    try {
        playCounts = utils.ReadJSON(fb.ProfilePath + "github_playcounts.json") || {};
    } catch (e) {
        playCounts = {};
    }
    
    // Schedule data refresh
    window.SetInterval(refreshData, 3600000); // Refresh hourly
}

// Main drawing function
function on_paint(gr) {
    gr.FillSolidRect(0, 0, width, height, 0xFFF6F8FA); // GitHub bg
    
    // Draw header
    drawHeader(gr);
    
    // Draw calendar grid
    drawCalendar(gr);
    
    // Draw hover tooltip
    if (hoverDay) {
        drawTooltip(gr, hoverDay);
    }
}

function drawHeader(gr) {
    const headerFont = gdi.Font('Segoe UI', 14, 1);
    const monthStr = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Position arrows
    arrows.left.x = 10;
    arrows.left.y = (HEADER_HEIGHT - ARROW_SIZE) / 2;
    arrows.right.x = width - ARROW_SIZE - 10;
    arrows.right.y = arrows.left.y;
    
    // Load and draw arrows
    const leftArrow = gdi.LoadImage(getAssetPath("left_arrow.png"));
    const rightArrow = gdi.LoadImage(getAssetPath("right_arrow.png"));
    
    if (leftArrow) {
        gr.DrawImage(leftArrow, arrows.left.x, arrows.left.y, ARROW_SIZE, ARROW_SIZE, 
                     0, 0, leftArrow.Width, leftArrow.Height);
    }
    
    if (rightArrow) {
        gr.DrawImage(rightArrow, arrows.right.x, arrows.right.y, ARROW_SIZE, ARROW_SIZE, 
                     0, 0, rightArrow.Width, rightArrow.Height);
    }
    
    // Draw month/year
    gr.GdiDrawText(monthStr, headerFont, 0xFF24292E, 
                   arrows.left.x + ARROW_SIZE + 10, 0, 
                   width - (ARROW_SIZE * 2) - 20, HEADER_HEIGHT, 
                   DT_CENTER | DT_VCENTER);
}

function drawCalendar(gr) {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startDate.getDay();
    
    // Draw day labels
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayFont = gdi.Font('Segoe UI', 9);
    for (let i = 0; i < 7; i++) {
        gr.GdiDrawText(days[i], dayFont, 0xFF586069, 
            i * (CELL_SIZE + CELL_MARGIN), HEADER_HEIGHT,
            CELL_SIZE, CELL_SIZE, DT_CENTER | DT_VCENTER);
    }
    
    // Draw cells
    let dayCount = 1;
    let row = 1;
    for (let i = 0; i < 42; i++) { // 6 weeks max
        const col = i % 7;
        if (i >= startDay && dayCount <= endDate.getDate()) {
            const x = col * (CELL_SIZE + CELL_MARGIN);
            const y = HEADER_HEIGHT + CELL_SIZE + row * (CELL_SIZE + CELL_MARGIN);
            
            // Get play count for this day
            const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth() + 1, dayCount);
            const count = playCounts[dateStr] || 0;
            
            // Determine color intensity
            const colorIndex = Math.min(Math.floor(count / 3), 4); // Adjust scaling as needed
            gr.FillSolidRect(x, y, CELL_SIZE, CELL_SIZE, COLORS[colorIndex]);
            
            // Highlight hover
            if (hoverDay && hoverDay.date === dateStr) {
                gr.DrawRect(x, y, CELL_SIZE, CELL_SIZE, 1, 0xFF000000);
            }
            
            dayCount++;
        }
        
        if (col === 6) row++;
    }
}

function drawTooltip(gr, dayInfo) {
    const tooltipWidth = 200;
    const tooltipHeight = 60;
    const x = Math.min(dayInfo.x, width - tooltipWidth - 5);
    const y = Math.min(dayInfo.y + CELL_SIZE + 5, height - tooltipHeight - 5);
    
    gr.FillSolidRect(x, y, tooltipWidth, tooltipHeight, 0xFFFFFFFF);
    gr.DrawRect(x, y, tooltipWidth, tooltipHeight, 1, 0xFFCCCCCC);
    
    const dateFont = gdi.Font('Segoe UI', 11, 1);
    const countFont = gdi.Font('Segoe UI', 10);
    
    gr.GdiDrawText(dayInfo.date, dateFont, 0xFF24292E, x + 10, y + 5, tooltipWidth - 20, 20);
    gr.GdiDrawText(`${dayInfo.count} plays`, countFont, 0xFF586069, x + 10, y + 30, tooltipWidth - 20, 20);
}

// Date helpers
function formatDate(year, month, day) {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function getDayAtPosition(x, y) {
    if (y < HEADER_HEIGHT + CELL_SIZE) return null;
    
    const col = Math.floor(x / (CELL_SIZE + CELL_MARGIN));
    const row = Math.floor((y - HEADER_HEIGHT - CELL_SIZE) / (CELL_SIZE + CELL_MARGIN));
    const dayIndex = row * 7 + col;
    
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = startDate.getDay();
    const day = dayIndex - startDay + 1;
    
    if (day < 1 || day > new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) {
        return null;
    }
    
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    return {
        date: dateStr,
        count: playCounts[dateStr] || 0,
        x: col * (CELL_SIZE + CELL_MARGIN),
        y: HEADER_HEIGHT + CELL_SIZE + row * (CELL_SIZE + CELL_MARGIN)
    };
}

// Event handlers
function on_size(w, h) {
    width = w;
    height = h;
    
    // Update arrow positions on resize
    arrows.left.y = arrows.right.y = (HEADER_HEIGHT - ARROW_SIZE) / 2;
    arrows.right.x = width - ARROW_SIZE - 10;
}

function on_mouse_move(x, y) {
    hoverDay = getDayAtPosition(x, y);
    window.Repaint();
}

function on_mouse_lbtn_up(x, y) {
    // Navigation arrows
    if (x >= arrows.left.x && x <= arrows.left.x + arrows.left.w &&
        y >= arrows.left.y && y <= arrows.left.y + arrows.left.h) {
        currentDate.setMonth(currentDate.getMonth() - 1);
        refreshData();
        window.Repaint();
    }
    else if (x >= arrows.right.x && x <= arrows.right.x + arrows.right.w &&
             y >= arrows.right.y && y <= arrows.right.y + arrows.right.h) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        refreshData();
        window.Repaint();
    }
}

function on_playback_new_track(metadb) {
    // Record local play
    const today = new Date();
    const dateStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    playCounts[dateStr] = (playCounts[dateStr] || 0) + 1;
    savePlayCounts();
    window.Repaint();
}

// Data management
function refreshData() {
    if (config.apiKey && config.username && config.apiKey !== "YOUR_LASTFM_API_KEY") {
        my_utils.fetchLastFmData(
            config.apiKey, 
            config.username,
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
        ).then(data => {
            // Merge new data with existing counts
            for (const [date, count] of Object.entries(data)) {
                playCounts[date] = (playCounts[date] || 0) + count;
            }
            savePlayCounts();
            window.Repaint();
        });
    }
}

function savePlayCounts() {
    utils.WriteJSON(fb.ProfilePath + "github_playcounts.json", playCounts);
}

// Initialize panel
on_init();
refreshData();
