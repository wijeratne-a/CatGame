/*
 * LASER KITTY VS. THE GRILLED POOPOCALYPSE
 * 
 * ARCHITECTURE:
 * 
 * Game States:
 * - MENU: Title screen with start prompt
 * - PLAYING: Main level traversal with grunts and collectibles
 * - BOSS: Boss arena encounter with laser mechanic
 * - PAUSED: Pause overlay (ESC to toggle)
 * - VICTORY: Win screen after boss defeat
 * - GAME_OVER: Game over screen when all lives lost
 * 
 * Main Entities:
 * - Player: The cat hero with health, lives, movement, and laser ability
 * - Enemy: Grunt poops that patrol platforms
 * - Boss: Large angry poop with fireball attacks
 * - Coin: Collectible for score
 * - Sushi: Healing item
 * - Checkpoint: Respawn points
 * - Projectile: Laser shots (boss phase only)
 * - Fireball: Boss projectiles
 * 
 * Main Loop:
 * - requestAnimationFrame drives the game loop
 * - update(deltaTime) handles all game logic per frame
 * - render(ctx) draws everything to canvas
 * 
 * Collision System:
 * - AABB (Axis-Aligned Bounding Box) collision detection
 * - Special stomp detection (downward velocity + top collision)
 * - Knockback and invincibility frames on damage
 * 
 * Camera:
 * - Follows player horizontally (centered)
 * - Locks position in boss arena
 * 
 * Dynamic Spawning:
 * - Enemies spawn as player progresses through level
 * - Enemies despawn when far behind player
 * 
 * TWEAKABLE PARAMETERS:
 * - Movement speeds: CONFIG.playerSpeed, CONFIG.jumpStrength, CONFIG.doubleJumpStrength
 * - Physics: CONFIG.gravity
 * - Health: CONFIG.hitsPerLife (currently 7), CONFIG.maxLives (3)
 * - Boss: CONFIG.bossMaxHP (20), CONFIG.fireballInterval
 * - Laser: CONFIG.laserCooldown (0.5s)
 * - Invincibility: CONFIG.invincibilityDuration
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
    // Canvas
    canvasWidth: 800,
    canvasHeight: 450,
    
    // Player physics
    playerSpeed: 4.5,
    jumpStrength: -12,
    doubleJumpStrength: -10,
    gravity: 0.6,
    playerWidth: 32,
    playerHeight: 32,
    
    // Health & lives
    maxLives: 3,
    hitsPerLife: 7,
    invincibilityDuration: 60, // frames (1 second at 60fps)
    
    // Knockback
    knockbackX: 8,
    knockbackY: -4,
    
    // Enemy
    enemyWidth: 28,
    enemyHeight: 28,
    enemySpeed: 1.5,
    enemyPatrolDistance: 150,
    
    // Boss
    bossWidth: 128,
    bossHeight: 128,
    bossMaxHP: 20,
    fireballInterval: 180, // frames (3 seconds at 60fps)
    fireballIntervalFast: 120, // frames (2 seconds) - phase 2
    fireballSpeed: 4,
    fireballWidth: 24,
    fireballHeight: 24,
    
    // Laser
    laserCooldown: 30, // frames (0.5 seconds)
    laserSpeed: 15,
    laserWidth: 40,
    laserHeight: 8,
    
    // Collectibles
    coinWidth: 20,
    coinHeight: 20,
    sushiWidth: 24,
    sushiHeight: 24,
    
    // Level
    levelWidth: 8000,
    groundY: 380,
    platformHeight: 280,
    platformThickness: 20,
    
    // Checkpoints
    checkpoint1X: 2666, // ~1/3
    checkpoint2X: 5333, // ~2/3
    bossArenaX: 7500,
    bossArenaWidth: 500,
    
    // Spawn zones (enemy spawn triggers)
    spawnZones: [
        { x: 500, count: 2 },
        { x: 1000, count: 2 },
        { x: 1500, count: 2 },
        { x: 2000, count: 2 },
        { x: 2500, count: 2 },
        { x: 3000, count: 2 },
        { x: 3500, count: 2 },
        { x: 4000, count: 2 },
        { x: 4500, count: 2 },
        { x: 5000, count: 2 }
    ]
};

// Game states
const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    BOSS: 'BOSS',
    PAUSED: 'PAUSED',
    VICTORY: 'VICTORY',
    GAME_OVER: 'GAME_OVER'
};

// ============================================================================
// INPUT HANDLING
// ============================================================================

const keys = {
    left: false,
    right: false,
    up: false,
    space: false,
    enter: false,
    esc: false
};

const keyState = {
    upPressed: false,
    spacePressed: false,
    enterPressed: false,
    escPressed: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') {
        keys.up = true;
        if (!keyState.upPressed) {
            keyState.upPressed = true;
        }
    }
    if (e.key === ' ') {
        keys.space = true;
        if (!keyState.spacePressed) {
            keyState.spacePressed = true;
        }
    }
    if (e.key === 'Enter') {
        keys.enter = true;
        if (!keyState.enterPressed) {
            keyState.enterPressed = true;
        }
    }
    if (e.key === 'Escape') {
        keys.esc = true;
        if (!keyState.escPressed) {
            keyState.escPressed = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') {
        keys.up = false;
        keyState.upPressed = false;
    }
    if (e.key === ' ') {
        keys.space = false;
        keyState.spacePressed = false;
    }
    if (e.key === 'Enter') {
        keys.enter = false;
        keyState.enterPressed = false;
    }
    if (e.key === 'Escape') {
        keys.esc = false;
        keyState.escPressed = false;
    }
});

// ============================================================================
// ENTITY CLASSES
// ============================================================================

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.playerWidth;
        this.height = CONFIG.playerHeight;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        
        // Health & lives
        this.lives = CONFIG.maxLives;
        this.hits = 0; // Current hits in this life (0-7)
        this.invincible = false;
        this.invincibilityTimer = 0;
        
        // Laser
        this.laserCooldownTimer = 0;
    }
    
    getHP() {
        return Math.max(0, 100 - (this.hits / CONFIG.hitsPerLife) * 100);
    }
    
    takeDamage(knockbackX, knockbackY) {
        if (this.invincible) return;
        
        this.hits++;
        this.vx = knockbackX;
        this.vy = knockbackY;
        this.invincible = true;
        this.invincibilityTimer = CONFIG.invincibilityDuration;
        
        if (this.hits >= CONFIG.hitsPerLife) {
            this.lives--;
            this.hits = 0;
            return true; // Life lost
        }
        return false; // Just damage
    }
    
    update(platforms) {
        // Update invincibility
        if (this.invincible) {
            this.invincibilityTimer--;
            if (this.invincibilityTimer <= 0) {
                this.invincible = false;
            }
        }
        
        // Update laser cooldown
        if (this.laserCooldownTimer > 0) {
            this.laserCooldownTimer--;
        }
        
        // Horizontal movement (arcade style - constant speed, immediate stop)
        if (keys.left) {
            this.vx = -CONFIG.playerSpeed;
        } else if (keys.right) {
            this.vx = CONFIG.playerSpeed;
        } else {
            this.vx = 0;
        }
        
        // Jump (only in PLAYING state, not BOSS)
        if (gameState === GameState.PLAYING) {
            if (keys.up && keyState.upPressed) {
                if (this.onGround) {
                    this.vy = CONFIG.jumpStrength;
                    this.onGround = false;
                    this.canDoubleJump = true;
                    this.hasDoubleJumped = false;
                    keyState.upPressed = false;
                } else if (this.canDoubleJump && !this.hasDoubleJumped) {
                    this.vy = CONFIG.doubleJumpStrength;
                    this.hasDoubleJumped = true;
                    keyState.upPressed = false;
                }
            }
        }
        
        // Apply gravity
        this.vy += CONFIG.gravity;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Ground collision
        this.onGround = false;
        if (this.y + this.height >= CONFIG.groundY) {
            this.y = CONFIG.groundY - this.height;
            this.vy = 0;
            this.onGround = true;
            this.canDoubleJump = false;
            this.hasDoubleJumped = false;
        }
        
        // Platform collision
        for (const platform of platforms) {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {
                
                // Check if landing on top
                if (this.vy >= 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                    this.canDoubleJump = false;
                    this.hasDoubleJumped = false;
                }
                // Check if hitting from below
                else if (this.vy < 0 && this.y + this.height > platform.y) {
                    this.y = platform.y + platform.height;
                    this.vy = 0;
                }
                // Side collision
                else if (this.vx > 0) {
                    this.x = platform.x - this.width;
                } else if (this.vx < 0) {
                    this.x = platform.x + platform.width;
                }
            }
        }
        
        // Boundary check (falling into pit = death)
        if (this.y > CONFIG.canvasHeight + 100) {
            this.hits = CONFIG.hitsPerLife; // Trigger life loss
        }
        
        // Level boundaries
        this.x = Math.max(0, Math.min(CONFIG.levelWidth - this.width, this.x));
    }
    
    canShootLaser() {
        return gameState === GameState.BOSS && this.laserCooldownTimer <= 0;
    }
    
    shootLaser() {
        if (this.canShootLaser()) {
            this.laserCooldownTimer = CONFIG.laserCooldown;
            return new Projectile(this.x + this.width, this.y + this.height / 2, 1);
        }
        return null;
    }
    
    render(ctx, cameraX) {
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Flash when invincible
        if (this.invincible && Math.floor(this.invincibilityTimer / 5) % 2 === 0) {
            return; // Skip rendering this frame
        }
        
        // Draw cat body (rounded rectangle)
        ctx.fillStyle = '#ffb6c1'; // Pastel pink
        ctx.beginPath();
        ctx.roundRect(screenX, screenY, this.width, this.height, 8);
        ctx.fill();
        
        // Draw ears
        ctx.fillStyle = '#ffb6c1';
        ctx.beginPath();
        ctx.ellipse(screenX + 6, screenY + 4, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + this.width - 6, screenY + 4, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(screenX + 10, screenY + 12, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + this.width - 10, screenY + 12, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw nose
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + 18, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.enemyWidth;
        this.height = CONFIG.enemyHeight;
        this.vx = -CONFIG.enemySpeed;
        this.startX = x;
        this.patrolLeft = x;
        this.patrolRight = x + CONFIG.enemyPatrolDistance;
        this.alive = true;
    }
    
    update(platforms) {
        if (!this.alive) return;
        
        // Patrol behavior
        this.x += this.vx;
        
        if (this.x <= this.patrolLeft || this.x + this.width >= this.patrolRight) {
            this.vx = -this.vx;
        }
        
        // Check for platform edges
        let onPlatform = false;
        for (const platform of platforms) {
            if (this.x + this.width / 2 >= platform.x &&
                this.x + this.width / 2 <= platform.x + platform.width &&
                Math.abs(this.y + this.height - platform.y) < 5) {
                onPlatform = true;
                break;
            }
        }
        
        // If at ground level, check ground
        if (Math.abs(this.y + this.height - CONFIG.groundY) < 5) {
            onPlatform = true;
        }
        
        // Reverse if hitting edge
        if (!onPlatform && this.vx < 0) {
            this.vx = -this.vx;
        }
    }
    
    render(ctx, cameraX) {
        if (!this.alive) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Draw poop body (brown rounded rectangle)
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.roundRect(screenX, screenY, this.width, this.height, 6);
        ctx.fill();
        
        // Draw cute face
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(screenX + 8, screenY + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + this.width - 8, screenY + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw smile
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + 16, 5, 0, Math.PI);
        ctx.stroke();
        
        // Draw spatula
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(screenX + this.width - 4, screenY + 8, 8, 12);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(screenX + this.width - 2, screenY + 6, 4, 3);
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.bossWidth;
        this.height = CONFIG.bossHeight;
        this.hp = CONFIG.bossMaxHP;
        this.maxHP = CONFIG.bossMaxHP;
        this.fireballTimer = 0;
        this.flashTimer = 0;
        this.alive = true;
        this.bobOffset = 0;
        this.bobDirection = 1;
    }
    
    update() {
        if (!this.alive) return;
        
        // Small bobbing movement
        this.bobOffset += 0.1 * this.bobDirection;
        if (Math.abs(this.bobOffset) > 5) {
            this.bobDirection = -this.bobDirection;
        }
        
        // Flash before attack
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }
        
        // Fireball attack timer
        this.fireballTimer++;
        const interval = this.hp <= this.maxHP / 2 ? CONFIG.fireballIntervalFast : CONFIG.fireballInterval;
        
        if (this.fireballTimer >= interval - 30 && this.flashTimer === 0) {
            this.flashTimer = 30; // Flash for 30 frames before firing
        }
    }
    
    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            this.alive = false;
        }
    }
    
    shouldFireFireball() {
        const interval = this.hp <= this.maxHP / 2 ? CONFIG.fireballIntervalFast : CONFIG.fireballInterval;
        // Fire when timer reaches interval and flash is done
        if (this.fireballTimer >= interval && this.flashTimer === 0) {
            this.fireballTimer = 0; // Reset timer after firing
            return true;
        }
        return false;
    }
    
    render(ctx, cameraX) {
        if (!this.alive) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y + this.bobOffset;
        
        // Flash effect
        const flashing = this.flashTimer > 0 && Math.floor(this.flashTimer / 5) % 2 === 0;
        
        // Draw boss body (large brown rounded rectangle)
        ctx.fillStyle = flashing ? '#ff4444' : '#654321';
        ctx.beginPath();
        ctx.roundRect(screenX, screenY, this.width, this.height, 12);
        ctx.fill();
        
        // Draw angry eyes
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX + 30, screenY + 35, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screenX + this.width - 30, screenY + 35, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw angry eyebrows
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX + 20, screenY + 25);
        ctx.lineTo(screenX + 40, screenY + 30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX + this.width - 20, screenY + 25);
        ctx.lineTo(screenX + this.width - 40, screenY + 30);
        ctx.stroke();
        
        // Draw spatulas
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(screenX - 8, screenY + 40, 12, 40);
        ctx.fillRect(screenX + this.width - 4, screenY + 40, 12, 40);
    }
}

class Projectile {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.laserWidth;
        this.height = CONFIG.laserHeight;
        this.vx = CONFIG.laserSpeed * direction;
        this.active = true;
    }
    
    update() {
        if (!this.active) return;
        this.x += this.vx;
        
        // Deactivate if off screen
        if (this.x < cameraX - 100 || this.x > cameraX + CONFIG.canvasWidth + 100) {
            this.active = false;
        }
    }
    
    render(ctx, cameraX) {
        if (!this.active) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Draw laser beam (bright horizontal line)
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(screenX, screenY, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, screenY + 2, this.width, 4);
    }
}

class Fireball {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.fireballWidth;
        this.height = CONFIG.fireballHeight;
        
        // Calculate arcing trajectory
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        this.vx = Math.cos(angle) * CONFIG.fireballSpeed;
        this.vy = Math.sin(angle) * CONFIG.fireballSpeed - 2; // Slight upward arc
        this.active = true;
    }
    
    update(platforms) {
        if (!this.active) return;
        
        // Apply gravity
        this.vy += CONFIG.gravity * 0.5;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Check collision with ground
        if (this.y + this.height >= CONFIG.groundY) {
            this.active = false;
        }
        
        // Check collision with platforms
        for (const platform of platforms) {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {
                this.active = false;
                break;
            }
        }
        
        // Deactivate if off screen
        if (this.x < cameraX - 200 || this.x > cameraX + CONFIG.canvasWidth + 200 ||
            this.y > CONFIG.canvasHeight + 200) {
            this.active = false;
        }
    }
    
    render(ctx, cameraX) {
        if (!this.active) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Draw fireball (orange/red circle)
        const gradient = ctx.createRadialGradient(
            screenX + this.width / 2, screenY + this.height / 2, 0,
            screenX + this.width / 2, screenY + this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.5, '#ff8800');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, screenY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.coinWidth;
        this.height = CONFIG.coinHeight;
        this.collected = false;
        this.animationTimer = 0;
    }
    
    update() {
        if (!this.collected) {
            this.animationTimer++;
        }
    }
    
    render(ctx, cameraX) {
        if (this.collected) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Animated coin (yellow circle with pulse)
        const scale = 1 + Math.sin(this.animationTimer * 0.1) * 0.1;
        const offsetX = (this.width * (1 - scale)) / 2;
        const offsetY = (this.height * (1 - scale)) / 2;
        
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(
            screenX + this.width / 2,
            screenY + this.height / 2,
            this.width / 2 * scale,
            this.height / 2 * scale,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(
            screenX + this.width / 2,
            screenY + this.height / 2,
            this.width / 3 * scale,
            this.height / 3 * scale,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }
}

class Sushi {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.sushiWidth;
        this.height = CONFIG.sushiHeight;
        this.collected = false;
        this.animationTimer = 0;
    }
    
    update() {
        if (!this.collected) {
            this.animationTimer++;
        }
    }
    
    render(ctx, cameraX) {
        if (this.collected) return;
        
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Draw sushi (pink rectangle with rice grains)
        ctx.fillStyle = '#ffb6c1';
        ctx.fillRect(screenX, screenY, this.width, this.height);
        
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(screenX + 6 + i * 6, screenY + this.height / 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Checkpoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.activated = false;
    }
    
    render(ctx, cameraX) {
        const screenX = this.x - cameraX;
        const screenY = this.y;
        
        // Draw checkpoint flag
        ctx.fillStyle = this.activated ? '#00ff00' : '#888888';
        ctx.fillRect(screenX, screenY, 8, this.height);
        
        ctx.fillStyle = this.activated ? '#ffff00' : '#aaaaaa';
        ctx.beginPath();
        ctx.moveTo(screenX + 8, screenY);
        ctx.lineTo(screenX + 8, screenY + 20);
        ctx.lineTo(screenX + 20, screenY + 10);
        ctx.closePath();
        ctx.fill();
    }
}

// ============================================================================
// LEVEL DATA
// ============================================================================

let platforms = [];
let coins = [];
let sushi = [];
let enemies = [];
let checkpoints = [];
let projectiles = [];
let fireballs = [];

let boss = null;
let lastCheckpoint = { x: 50, y: CONFIG.groundY - CONFIG.playerHeight };

let score = 0;
let totalGruntEnemies = 0;
let gruntEnemiesKilled = 0;
let spawnedZones = new Set();

function initializeLevel() {
    // Create platforms
    platforms = [
        // Ground level platforms (gaps)
        { x: 0, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 600, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 1200, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 1800, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 2400, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 3000, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 3600, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 4200, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 4800, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 5400, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 6000, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 6600, y: CONFIG.groundY, width: 400, height: CONFIG.platformThickness },
        { x: 7200, y: CONFIG.groundY, width: 300, height: CONFIG.platformThickness },
        
        // Raised platforms (require double jump)
        { x: 500, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 1100, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 1700, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 2300, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 2900, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 3500, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 4100, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 4700, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 5300, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 5900, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness },
        { x: 6500, y: CONFIG.platformHeight, width: 200, height: CONFIG.platformThickness }
    ];
    
    // Create coins (some on raised platforms)
    coins = [
        { x: 300, y: CONFIG.platformHeight - 30 },
        { x: 900, y: CONFIG.platformHeight - 30 },
        { x: 1500, y: CONFIG.platformHeight - 30 },
        { x: 2100, y: CONFIG.platformHeight - 30 },
        { x: 2700, y: CONFIG.platformHeight - 30 },
        { x: 3300, y: CONFIG.platformHeight - 30 },
        { x: 3900, y: CONFIG.platformHeight - 30 },
        { x: 4500, y: CONFIG.platformHeight - 30 },
        { x: 5100, y: CONFIG.platformHeight - 30 },
        { x: 5700, y: CONFIG.platformHeight - 30 },
        { x: 6300, y: CONFIG.platformHeight - 30 },
        { x: 200, y: CONFIG.groundY - 30 },
        { x: 800, y: CONFIG.groundY - 30 },
        { x: 1400, y: CONFIG.groundY - 30 },
        { x: 2000, y: CONFIG.groundY - 30 }
    ].map(pos => new Coin(pos.x, pos.y));
    
    // Create sushi (healing items)
    sushi = [
        { x: 1000, y: CONFIG.groundY - 30 },
        { x: 2500, y: CONFIG.groundY - 30 },
        { x: 4000, y: CONFIG.groundY - 30 },
        { x: 5500, y: CONFIG.groundY - 30 }
    ].map(pos => new Sushi(pos.x, pos.y));
    
    // Create checkpoints
    checkpoints = [
        new Checkpoint(CONFIG.checkpoint1X, CONFIG.groundY - 60),
        new Checkpoint(CONFIG.checkpoint2X, CONFIG.groundY - 60),
        new Checkpoint(CONFIG.bossArenaX - 50, CONFIG.groundY - 60)
    ];
    
    // Enemies will be spawned dynamically
    enemies = [];
    totalGruntEnemies = 0;
    gruntEnemiesKilled = 0;
    spawnedZones.clear();
    
    // Boss
    boss = new Boss(CONFIG.bossArenaX + CONFIG.bossArenaWidth / 2 - CONFIG.bossWidth / 2, 
                    CONFIG.groundY - CONFIG.bossHeight);
    
    projectiles = [];
    fireballs = [];
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

let gameState = GameState.MENU;
let player = null;
let cameraX = 0;
let bossDefeatTimer = 0;

function enterMenu() {
    gameState = GameState.MENU;
    initializeLevel();
    player = new Player(50, CONFIG.groundY - CONFIG.playerHeight);
    cameraX = 0;
    score = 0;
}

function startGame() {
    gameState = GameState.PLAYING;
    player = new Player(50, CONFIG.groundY - CONFIG.playerHeight);
    cameraX = 0;
    lastCheckpoint = { x: 50, y: CONFIG.groundY - CONFIG.playerHeight };
    initializeLevel();
}

function startBoss() {
    gameState = GameState.BOSS;
    // Lock camera to boss arena
    cameraX = CONFIG.bossArenaX;
}

function pauseGame() {
    if (gameState === GameState.PLAYING || gameState === GameState.BOSS) {
        gameState = GameState.PAUSED;
    }
}

function unpauseGame() {
    if (gameState === GameState.PAUSED) {
        // Return to previous state
        if (player.x >= CONFIG.bossArenaX) {
            gameState = GameState.BOSS;
        } else {
            gameState = GameState.PLAYING;
        }
    }
}

function respawnPlayer() {
    player.x = lastCheckpoint.x;
    player.y = lastCheckpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.hits = 0;
    player.invincible = false;
    player.invincibilityTimer = 0;
    
    // If respawning in boss arena, ensure boss state
    if (player.x >= CONFIG.bossArenaX) {
        gameState = GameState.BOSS;
        cameraX = CONFIG.bossArenaX;
    }
}

function checkGameOver() {
    if (player.lives <= 0) {
        gameState = GameState.GAME_OVER;
    }
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

function checkAABBCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkStomp(player, enemy) {
    // Stomp: player moving down, collision from top
    return player.vy > 0 &&
           player.y < enemy.y &&
           player.y + player.height < enemy.y + enemy.height / 2;
}

// ============================================================================
// MAIN UPDATE LOOP
// ============================================================================

function update() {
    // Handle ESC for pause
    if (keyState.escPressed) {
        keyState.escPressed = false;
        if (gameState === GameState.PAUSED) {
            unpauseGame();
        } else if (gameState === GameState.PLAYING || gameState === GameState.BOSS) {
            pauseGame();
        }
    }
    
    if (gameState === GameState.MENU) {
        // Check for Enter to start
        if (keyState.enterPressed || keys.enter) {
            keyState.enterPressed = false;
            startGame();
        }
        return;
    }
    
    if (gameState === GameState.PAUSED) {
        return;
    }
    
    if (gameState === GameState.VICTORY || gameState === GameState.GAME_OVER) {
        // Check for restart (Enter or Space)
        if (keyState.enterPressed || keys.enter || keyState.spacePressed) {
            keyState.enterPressed = false;
            keyState.spacePressed = false;
            enterMenu();
        }
        return;
    }
    
    // Update player
    if (player) {
        player.update(platforms);
        
        // Check if player reached boss arena
        if (gameState === GameState.PLAYING && player.x >= CONFIG.bossArenaX) {
            // Activate boss checkpoint
            if (checkpoints.length > 2) {
                checkpoints[2].activated = true;
                lastCheckpoint = { x: checkpoints[2].x, y: checkpoints[2].y - CONFIG.playerHeight };
            }
            startBoss();
        }
        
        // Update camera (follow player, lock in boss arena)
        if (gameState === GameState.PLAYING) {
            cameraX = player.x - CONFIG.canvasWidth / 2;
            cameraX = Math.max(0, Math.min(CONFIG.levelWidth - CONFIG.canvasWidth, cameraX));
        } else if (gameState === GameState.BOSS) {
            // Lock camera in boss arena
            cameraX = CONFIG.bossArenaX;
        }
        
        // Dynamic enemy spawning
        if (gameState === GameState.PLAYING) {
            for (const zone of CONFIG.spawnZones) {
                if (!spawnedZones.has(zone.x) && player.x >= zone.x - 200) {
                    spawnedZones.add(zone.x);
                    for (let i = 0; i < zone.count; i++) {
                        const platform = platforms[Math.floor(Math.random() * platforms.length)];
                        const enemyY = platform.y - CONFIG.enemyHeight;
                        enemies.push(new Enemy(platform.x + i * 100, enemyY));
                        totalGruntEnemies++;
                    }
                }
            }
        }
        
        // Despawn enemies far behind player
        enemies = enemies.filter(enemy => {
            if (enemy.x < player.x - 500) {
                return false;
            }
            return true;
        });
        
        // Update enemies
        enemies.forEach(enemy => enemy.update(platforms));
        
        // Player-enemy collision
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            if (checkAABBCollision(player, enemy)) {
                if (checkStomp(player, enemy)) {
                    // Stomp kill
                    enemy.alive = false;
                    gruntEnemiesKilled++;
                    player.vy = -8; // Bounce
                    score += 100;
                    
                    // Check for extra life (all grunts killed)
                    if (gruntEnemiesKilled >= totalGruntEnemies && totalGruntEnemies > 0) {
                        player.lives++;
                    }
                } else {
                    // Damage player
                    const knockbackX = player.x < enemy.x ? -CONFIG.knockbackX : CONFIG.knockbackX;
                    const lifeLost = player.takeDamage(knockbackX, CONFIG.knockbackY);
                    if (lifeLost) {
                        if (player.lives > 0) {
                            respawnPlayer();
                        } else {
                            checkGameOver();
                        }
                    }
                }
            }
        });
        
        // Checkpoint collision
        checkpoints.forEach(checkpoint => {
            if (checkAABBCollision(player, checkpoint)) {
                checkpoint.activated = true;
                lastCheckpoint = { x: checkpoint.x, y: checkpoint.y - CONFIG.playerHeight };
            }
        });
        
        // Coin collection
        coins.forEach(coin => {
            if (!coin.collected && checkAABBCollision(player, coin)) {
                coin.collected = true;
                score += 50;
            }
        });
        
        // Sushi collection
        sushi.forEach(item => {
            if (!item.collected && checkAABBCollision(player, item)) {
                item.collected = true;
                player.hits = 0; // Full heal
            }
        });
        
        // Boss collision
        if (gameState === GameState.BOSS && boss && boss.alive) {
            boss.update();
            
            // Player-boss collision
            if (checkAABBCollision(player, boss)) {
                const knockbackX = player.x < boss.x ? -CONFIG.knockbackX : CONFIG.knockbackX;
                const lifeLost = player.takeDamage(knockbackX, CONFIG.knockbackY);
                if (lifeLost) {
                    if (player.lives > 0) {
                        respawnPlayer();
                    } else {
                        checkGameOver();
                    }
                }
            }
            
            // Boss fireball attack
            if (boss.shouldFireFireball()) {
                fireballs.push(new Fireball(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2,
                    player.x + player.width / 2,
                    player.y + player.height / 2
                ));
            }
            
            // Fireball updates and collision
            fireballs.forEach(fireball => {
                fireball.update(platforms);
                if (fireball.active && checkAABBCollision(player, fireball)) {
                    fireball.active = false;
                    const knockbackX = player.x < fireball.x ? -CONFIG.knockbackX : CONFIG.knockbackX;
                    const lifeLost = player.takeDamage(knockbackX, CONFIG.knockbackY);
                    if (lifeLost) {
                        if (player.lives > 0) {
                            respawnPlayer();
                        } else {
                            checkGameOver();
                        }
                    }
                }
            });
            
            fireballs = fireballs.filter(f => f.active);
            
            // Laser shooting
            if (keyState.spacePressed && player.canShootLaser()) {
                keyState.spacePressed = false;
                const laser = player.shootLaser();
                if (laser) {
                    projectiles.push(laser);
                }
            }
            
            // Projectile updates and collision
            projectiles.forEach(projectile => {
                projectile.update();
                if (projectile.active && checkAABBCollision(projectile, boss)) {
                    projectile.active = false;
                    boss.takeDamage();
                }
            });
            
            projectiles = projectiles.filter(p => p.active);
            
            // Boss defeat
            if (!boss.alive) {
                bossDefeatTimer++;
                if (bossDefeatTimer >= 60) {
                    gameState = GameState.VICTORY;
                }
            }
        }
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function render(ctx) {
    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Draw ground
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, CONFIG.groundY, CONFIG.levelWidth, CONFIG.canvasHeight - CONFIG.groundY);
    
    if (gameState === GameState.MENU) {
        renderMenu(ctx);
        return;
    }
    
    if (gameState === GameState.PAUSED) {
        renderGame(ctx);
        renderPauseOverlay(ctx);
        return;
    }
    
    if (gameState === GameState.VICTORY) {
        renderVictoryScreen(ctx);
        return;
    }
    
    if (gameState === GameState.GAME_OVER) {
        renderGameOverScreen(ctx);
        return;
    }
    
    // Draw platforms
    ctx.fillStyle = '#8b4513';
    platforms.forEach(platform => {
        const screenX = platform.x - cameraX;
        if (screenX > -100 && screenX < CONFIG.canvasWidth + 100) {
            ctx.fillRect(screenX, platform.y, platform.width, platform.height);
        }
    });
    
    // Draw checkpoints
    checkpoints.forEach(checkpoint => checkpoint.render(ctx, cameraX));
    
    // Draw coins
    coins.forEach(coin => coin.update() && coin.render(ctx, cameraX));
    
    // Draw sushi
    sushi.forEach(item => item.update() && item.render(ctx, cameraX));
    
    // Draw enemies
    enemies.forEach(enemy => enemy.render(ctx, cameraX));
    
    // Draw boss
    if (boss && (gameState === GameState.BOSS || player.x >= CONFIG.bossArenaX - 200)) {
        boss.render(ctx, cameraX);
    }
    
    // Draw fireballs
    fireballs.forEach(fireball => fireball.render(ctx, cameraX));
    
    // Draw projectiles
    projectiles.forEach(projectile => projectile.render(ctx, cameraX));
    
    // Draw player
    if (player) {
        player.render(ctx, cameraX);
    }
    
    // Draw HUD
    renderHUD(ctx);
}

function renderMenu(ctx) {
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Laser Kitty vs.', CONFIG.canvasWidth / 2, 150);
    ctx.fillText('The Grilled Poopocalypse', CONFIG.canvasWidth / 2, 200);
    
    // Instructions
    ctx.font = '24px Arial';
    ctx.fillText('Press Enter to Start', CONFIG.canvasWidth / 2, 300);
    
    // Draw cute cat preview
    ctx.fillStyle = '#ffb6c1';
    ctx.beginPath();
    ctx.roundRect(CONFIG.canvasWidth / 2 - 40, 350, 80, 80, 10);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(CONFIG.canvasWidth / 2 - 20, 370, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CONFIG.canvasWidth / 2 + 20, 370, 6, 0, Math.PI * 2);
    ctx.fill();
}

function renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    
    ctx.font = '24px Arial';
    ctx.fillText('Press ESC to Resume', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 50);
}

function renderVictoryScreen(ctx) {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText('Laser Kitty saved the kitchen!', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    ctx.fillText('Final Score: ' + score, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 50);
    ctx.fillText('Press Enter to Restart', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 100);
}

function renderGameOverScreen(ctx) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 - 50);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText('Final Score: ' + score, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    ctx.fillText('Press Enter to Restart', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 50);
}

function renderHUD(ctx) {
    // Score (top-left)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);
    
    // HP bar (top-right)
    const hp = player.getHP();
    const barWidth = 200;
    const barHeight = 20;
    const barX = CONFIG.canvasWidth - barWidth - 10;
    const barY = 10;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = hp > 50 ? '#00ff00' : hp > 25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(barX, barY, (barWidth * hp) / 100, barHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HP: ' + Math.ceil(hp) + '%', barX + barWidth / 2, barY + 15);
    
    // Lives
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Lives: ' + player.lives, 10, 60);
    
    // Boss HP bar (during boss fight)
    if (gameState === GameState.BOSS && boss && boss.alive) {
        const bossBarWidth = 300;
        const bossBarHeight = 25;
        const bossBarX = (CONFIG.canvasWidth - bossBarWidth) / 2;
        const bossBarY = 10;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(bossBarX, bossBarY, bossBarWidth, bossBarHeight);
        
        const bossHPPercent = (boss.hp / boss.maxHP) * 100;
        ctx.fillStyle = bossHPPercent > 50 ? '#ff0000' : '#880000';
        ctx.fillRect(bossBarX, bossBarY, (bossBarWidth * bossHPPercent) / 100, bossBarHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS: ' + boss.hp + '/' + boss.maxHP, CONFIG.canvasWidth / 2, bossBarY + 18);
    }
}

// ============================================================================
// GAME INITIALIZATION & LOOP
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

// Add roundRect polyfill for older browsers
if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Initialize game
enterMenu();

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update();
    render(ctx);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ============================================================================
// HOW TO PLAY
// ============================================================================

/*
 * HOW TO PLAY
 * 
 * CONTROLS:
 * - Left/Right Arrow: Move left/right
 * - Up Arrow: Jump (press again while airborne for double jump)
 * - Spacebar: Fire laser (BOSS phase only)
 * - ESC: Pause/Unpause
 * 
 * GOAL:
 * - Traverse the level, collect coins, defeat grunt enemies, and reach the boss
 * - Defeat the boss by hitting it 20 times with your laser
 * - Avoid taking damage from enemies, fireballs, and pits
 * 
 * LIVES & HP:
 * - You have 3 lives
 * - Each life has 100% HP (7 hits = 1 life lost)
 * - When a life is lost, you respawn at the last checkpoint
 * - Collect sushi to restore HP
 * - Kill all grunt enemies to earn an extra life
 * - Falling into pits or taking 7 hits will cost you a life
 */

