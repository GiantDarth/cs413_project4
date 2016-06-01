'use strict';
// Copyright (c) 2016 Christopher Robert Philabaum
// Use self-closing anonymous function (using arrow-notation) to avoid flooding the 'namespace'
(() => {
    const TILE_SIZE = 16;
    const TILE_VIEW = 10;
    const MAP_HEIGHT = 5;
    const ZOOM = 4;
    var RENDER_WIDTH, RENDER_HEIGHT;

    var tu = new TileUtilities(PIXI);
    var game;

    // Only run when the document is fully loaded.
    document.addEventListener("DOMContentLoaded", (event) => {
        game = new Game(render);

        function render() {
            game.update();
            requestAnimationFrame(render);
        }
    }, false);

    class Game {
        constructor(render) {
            RENDER_HEIGHT = TILE_SIZE * ZOOM * MAP_HEIGHT;
            RENDER_WIDTH = TILE_SIZE * ZOOM * TILE_VIEW;

            this.title = "Beat-'em-All!";

            // Append renderer to gameport
            this.gameport = document.getElementById("gameport");
            this.renderer = PIXI.autoDetectRenderer(RENDER_WIDTH, RENDER_HEIGHT, { backgroundColor: 0x000000 });
            gameport.appendChild(this.renderer.view);

            // Add screens
            this.screenMap = new Map();
            this.currentScreen = 'title';
            this.screenMap.set('title', new PIXI.Container());
            this.screenMap.set('tutorial', new PIXI.Container());
            this.screenMap.set('main', new PIXI.Container());
            this.screenMap.set('menu', new PIXI.Container());
            this.screenMap.set('credits', new PIXI.Container());

            this.screenMap.get('main').scale.x = ZOOM;
            this.screenMap.get('main').scale.y = ZOOM;

            this.paused = true;

            PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
            PIXI.loader
                .add('zone_json', 'assets/map/zone.json')
                .add('tiles', 'assets/img/tiles/tiles.png')
                .add('assets/assets.json')
                .add('punch', 'assets/snd/punch.mp3')
                .add('death', 'assets/snd/death.mp3')
                .add('select', 'assets/snd/select.mp3')
                .add('title_mus', 'assets/snd/title_mus.mp3')
                .add('back_mus', 'assets/snd/back_mus.mp3')
                .load(() => {
                    this.load(render);
                });
        }

        load(render) {
            this.selectSnd = PIXI.audioManager.getAudio('select');
            this.titleMusic = PIXI.audioManager.getAudio('title_mus');
            this.backMusic = PIXI.audioManager.getAudio('back_mus');

            this.initScreens();
            this.initWorld();
            this.initKeyHandlers();

            this.selectSnd.volume = 0.15;

            this.backMusic.loop = true;
            this.backMusic.volume = 0.3;

            this.titleMusic.loop = true;
            this.titleMusic.volume = 0.3;
            this.titleMusic.play();

            // Initialize render loop
            render();
        }

        reset() {
            this.entityContainer.removeChildren();

            this.currentZone = 0;
            this.zones = new Array();

            this.enemies = new Array();

            this.addZone();
            let spawn = this.zones[0].getObject('player_spawn');
            this.player = new Player(spawn.x, spawn.y);
            this.entityContainer.addChild(this.player.sprite);

            this.loseText.visible = false;

            this.paused = false;
        }

        initScreens() {
            // Title Screen
            this.options = ['New Game', 'Credits'];
            this.currentOption = 0;
            this.optTexts = new Array();
            let container = new PIXI.Container();

            let titleBox = new PIXI.Container();
            let titleText = new PIXI.Text(this.title, {font: "42px Consolas", fill: 0xFFFFFF, align: "center"});
            titleText.anchor.x = 0.5;
            titleBox.addChild(titleText);
            titleBox.y = 32;

            let optBox = new PIXI.Container();
            optBox.y = titleBox.y + titleBox.height + 32;
            let height = 0;
            for(let opt of this.options) {
                let text = new PIXI.Text(opt, {font: "36px Consolas", fill: 0xFFFFFF, align: "center"});
                text.y = height;
                text.anchor.x = 0.5;
                height += 42;
                text.selected = false;
                this.optTexts.push(text);
                optBox.addChild(text);
            }

            container.x = RENDER_WIDTH / 2;
            container.addChild(titleBox);
            container.addChild(optBox);
            this.screenMap.get('title').addChild(container);

            // Credits Screen
            let creditsTitle = new PIXI.Text('Credits', {font: "42px Consolas", fill: 0xFFFFFF, align: "center"});
            creditsTitle.anchor.x = 0.5;

            let credits = [
                'Creator: Christopher Philabaum',
                'Sound Design: Christopher Philabaum',
                'Music: Christopher Philabaum',
                'Art: Christopher Philabaum',
            ];
            let creditsText = new PIXI.Text(credits.join('\n'), {font: "32px Consolas", fill: 0xFFFFFF, align: "center"});
            creditsText.anchor.x = 0.5;
            creditsText.position.y = creditsTitle.height + 16;

            let toolsTitle = new PIXI.Text('Tools Used', {font: "36px Consolas", fill: 0xFFFFFF, align: "center"});
            toolsTitle.anchor.x = 0.5;
            toolsTitle.position.y = creditsTitle.height + creditsText.height + 16 + 32;
            let tools = [
                'Pixijs',
                'Pixi-Audio',
                'TweenJS',
                'tileUtilies',
                'Bfxr',
                'Bosca Ceoil',
                'fre:ac',
                'Atom'
            ]
            let toolsText = new PIXI.Text(tools.join('\n'), {font: "32px Consolas", fill: 0xFFFFFF, align: "center"});
            toolsText.anchor.x = 0.5;
            toolsText.position.y = creditsTitle.height + creditsText.height + toolsTitle.height + 16 + 32 + 16;

            this.screenMap.get('credits').addChild(creditsTitle);
            this.screenMap.get('credits').addChild(creditsText);
            this.screenMap.get('credits').addChild(toolsTitle);
            this.screenMap.get('credits').addChild(toolsText);

            this.screenMap.get('credits').x = RENDER_WIDTH / 2;

            // Menu Screen
            this.loseText = new PIXI.Text('', {font: "12px Arial", fill: 0xFFFFFF, dropShadow: true, dropShadowDistance: 3, align: "center"});
            this.loseText.position.x = -TILE_SIZE * 3;
            this.loseText.position.y = TILE_SIZE;

            this.scoreText = new PIXI.Text('0', {font: "12px Arial", fill: 0xFFFFFF, dropShadow: true, dropShadowDistance: 2, align: "left"});

            this.pauseText = new PIXI.Text('Paused', {font: "12px Arial", fill: 0xFFFFFF, dropShadow: true, dropShadowDistance: 2, align: "left"});
            this.pauseText.anchor.x = 0.5;
            this.pauseText.anchor.y = 0.5;
            this.pauseText.position.x = TILE_SIZE * 3;
            this.pauseText.position.y = RENDER_HEIGHT / 2 / ZOOM;

            this.screenMap.get('menu').addChild(this.loseText);
            this.screenMap.get('menu').addChild(this.scoreText);
            this.screenMap.get('menu').addChild(this.pauseText);

            this.screenMap.get('main').addChild(this.screenMap.get('menu'));
        }

        initWorld() {
            this.world = new PIXI.Container();
            this.zones = new Array();
            this.enemies = new Array();

            this.currentZone = 0;
            this.zoneContainer = new PIXI.Container();
            this.entityContainer = new PIXI.Container();

            this.world.addChild(this.zoneContainer);
            this.world.addChild(this.entityContainer);

            this.addZone();
            let spawn = this.zones[0].getObject('player_spawn');
            this.player = new Player(spawn.x, spawn.y);
            this.entityContainer.addChild(this.player.sprite);

            this.screenMap.get('main').addChildAt(this.world, 0);
        }

        initKeyHandlers() {
            document.addEventListener('keydown', e => {
                // M
                if(e.keyCode === 77) {
                    this.titleMusic.muted = !this.titleMusic.muted;
                    this.backMusic.muted = !this.backMusic.muted;
                }
                switch(this.currentScreen) {
                    case('title'):
                        let old = this.currentOption;
                        switch(e.keyCode){
                            // W
                            case(83):
                                this.currentOption = Math.min(this.currentOption + 1, this.options.length - 1);
                                if(this.currentOption !== old) {
                                    this.selectSnd.play();
                                }
                                break;
                            // S
                            case(87):
                                old = this.currentOption;
                                this.currentOption = Math.max(this.currentOption - 1, 0);
                                if(this.currentOption !== old) {
                                    this.selectSnd.play();
                                }
                                break;
                            // Space
                            case(32):
                            // Enter
                            case(13):
                                switch(this.currentOption) {
                                    case(1):
                                        this.currentScreen = 'credits';
                                        // Reset selection
                                        this.currentOption = 0;
                                        this.screenMap.get('credits').y = this.screenMap.get('credits').height;
                                        // Scroll up the credits to its height's length for 15 seconds.
                                        createjs.Tween.get(this.screenMap.get('credits')).to({y: -this.screenMap.get('credits').height},
                                            15000)
                                            .call(() => {
                                                this.currentScreen = 'title';
                                            });
                                        return;
                                    case(0):
                                    default:
                                        this.paused = false;
                                        this.titleMusic.stop();
                                        this.backMusic.play();
                                        this.reset();
                                        this.currentScreen = 'main';
                                        return;
                                }
                        }
                        break;
                    case('main'):
                        switch(e.keyCode) {
                            // Esc
                            case(27):
                                this.paused = true;
                                this.currentScreen = 'title';
                                this.backMusic.paused = false;
                                this.backMusic.stop();
                                this.titleMusic.play();
                            // R
                            case(82):
                                this.reset();
                                return;
                            // Enter
                            case(13):
                                e.preventDefault();
                                this.paused = !this.paused;
                                return;
                            // A
                            case(65):
                            // D
                            case(68):
                            // Space
                            case(32):
                                e.preventDefault();
                                if(!this.player.isAlive || this.player.moving || this.paused) {
                                    return;
                                }
                                else {
                                    this.player.move_dir = MOVE_DIR.NONE;
                                }
                        }

                        switch(e.keyCode) {
                            // A
                            case(65):
                                this.player.move_dir = MOVE_DIR.LEFT;
                                break;
                            // D
                            case(68):
                                this.player.move_dir = MOVE_DIR.RIGHT;
                                break;
                            // Space
                            case(32):
                                e.preventDefault();
                                this.player.punch();
                                if(this.currentScreen === 'main' && !this.paused && this.player.isAlive) {
                                    this.player.punchSnd.play();
                                }
                                break;
                            // Enter
                            case(13):
                                e.preventDefault();
                        }

                        this.player.move();
                        break;
                    case('credits'):
                        if(e.keyCode !== 77) {
                            this.currentScreen = 'title';
                            // Remove tween of credits.
                            createjs.Tween.removeTweens(this.screenMap.get('credits'));
                        }
                        break;
                }
            });

            document.addEventListener('keyup', e => {
                switch(e.keyCode) {
                    // A
                    case(65):
                    // D
                    case(68):
                        this.player.move_dir = MOVE_DIR.NONE;
                        break;
                    // Space
                    case(32):
                        e.preventDefault();
                }
            });
        }

        update() {
            if(!this.paused) {
                this.moveCamera();
                this.player.update(this.enemies);
                for(let enemy of this.enemies) {
                    if(!enemy.isAlive) {
                        this.entityContainer.removeChild(enemy.sprite);
                        enemy.die();
                    }
                }
                let count = this.enemies.length;
                // Only return enemies that are still alive.
                this.enemies = this.enemies.filter(enemy => enemy.isAlive);
                // Add the difference between the old list and the new list.
                this.player.kills += count - this.enemies.length;
                for(let enemy of this.enemies) {
                    enemy.update(this.player);
                }

                let zone = this.getZone();
                if(this.player.x > 0 && !this.zones[zone].entered) {
                    this.zones[zone].entered = true;
                    this.addZone();
                }
            }

            if(this.currentScreen === 'main') {
                this.backMusic.paused = this.paused;
            }

            // Result all tints.
            for(let opt of this.optTexts) {
                opt.tint = 0xFFFFFF;
            }
            this.optTexts[this.currentOption].tint = 0xCCAA00;

            // Follow the player
            // Choose the cneter based on if the player is at the leftmost edge or not.
            this.screenMap.get('menu').position.x = Math.max(RENDER_WIDTH / ZOOM / 2 - TILE_SIZE / 2, this.player.x);
            // Adjust for the amount of digits.
            this.scoreText.position.x = (TILE_SIZE * TILE_VIEW / 2) - (`${this.player.kills}`.length * 6);

            this.scoreText.text = this.player.kills;
            this.loseText.text = `You lost!\nYou had ${this.player.kills} points.\nPress R to try again.`;
            this.loseText.visible = !this.player.isAlive;

            this.pauseText.visible = this.paused;

            // Final step
            this.renderer.render(this.screenMap.get(this.currentScreen));
        }

        addZone() {
            let zone = tu.makeTiledWorld('zone_json', 'assets/img/tiles/tiles.png');
            zone.zone = this.currentZone;
            zone.entered = false;
            zone.x += zone.worldWidth * this.currentZone++;

            this.spawnEnemies(zone);

            this.zones.push(zone);
            this.zoneContainer.addChild(zone);
        }

        spawnEnemies(zone) {
            let spawn = zone.getObject('enemy_spawn');
            for(let i = 0; i < zone.zone + 1; i++) {
                let enemy = new Enemy(spawn.x + zone.x + getRandomArbitrary(-TILE_SIZE * 2, TILE_SIZE * 2), spawn.y, 100);
                this.enemies.push(enemy);
                this.entityContainer.addChild(enemy.sprite);
            }
        }

        moveCamera() {
            let x = -this.player.x * ZOOM + RENDER_WIDTH / 2 - this.player.sprite.width / 2 * ZOOM;

            this.screenMap.get('main').position.x = -Math.max(0, -x);
        }

        getZone() {
            return Math.floor(this.player.x / this.zones[0].worldWidth);
        }
    }

    // Abstract class
    class Entity {
        constructor(x, y, max, speed, dir, file_pre) {
            this.moving = false;
            this.punching = false;
            this.speed = speed;
            this.MAX_HEALTH = max;
            this.health = this.MAX_HEALTH;
            this.move_dir = DIRECTION.NONE;
            this.direction = dir;
            this.hasDied = false;

            this.flashInit = false;
            this.flash = false;

            this.deathSnd = PIXI.audioManager.getAudio('death');

            this.sprite = new PIXI.Container();
            this.sprite.x = x;
            this.sprite.y = y;

            this.state = STATE.STILL;
            this.direction = DIRECTION.RIGHT;

            this.direction_containers = new Array();
            for(let dir in DIRECTION) {
                this.direction_containers.push(new PIXI.Container());
            }

            this.states = new Array();
            for(let dir of this.direction_containers) {
                let arr = new Array();
                for(let s in STATE) {
                    arr.push(new Array());
                }
                this.states.push(arr);
            }

            this.states[DIRECTION.RIGHT][STATE.STILL] = new PIXI.Sprite(PIXI.Texture.fromFrame(`${file_pre}1.png`));
            this.states[DIRECTION.LEFT][STATE.STILL] = new PIXI.Sprite(PIXI.Texture.fromFrame(`${file_pre}2.png`));
            let frames = new Array();
            for(let f = 3; f <= 6; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.RIGHT][STATE.WALK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.RIGHT][STATE.WALK].animationSpeed = 0.25;
            this.states[DIRECTION.RIGHT][STATE.WALK].play();

            frames = new Array();
            for(let f = 7; f <= 10; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.LEFT][STATE.WALK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.LEFT][STATE.WALK].animationSpeed = 0.25;
            this.states[DIRECTION.LEFT][STATE.WALK].play();

            frames = new Array();
            for(let f = 11; f <= 12; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.RIGHT][STATE.ATTACK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.RIGHT][STATE.ATTACK].animationSpeed = 0.15;
            this.states[DIRECTION.RIGHT][STATE.ATTACK].loop = false;

            frames = new Array();
            for(let f = 13; f <= 14; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.LEFT][STATE.ATTACK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.LEFT][STATE.ATTACK].animationSpeed = 0.15;
            this.states[DIRECTION.RIGHT][STATE.ATTACK].loop = false;

            for(let dir in DIRECTION) {
                for(let state in STATE) {
                    this.direction_containers[DIRECTION[dir]].addChild(this.states[DIRECTION[dir]][STATE[state]]);
                }

                this.sprite.addChild(this.direction_containers[DIRECTION[dir]]);
            }
        }

        hurt(dmg) {
            this.health -= dmg;
            this.damaged = true;
        }

        attack(other) {};
        jump() {};
        die() {
            this.hasDied = true;
            this.deathSnd.play();
        };

        update() {
            if(this.punching && this.state !== STATE.ATTACK) {
                this.state = STATE.ATTACK;
            }
            else if(this.moving) {
                this.state = STATE.WALK;
            }
            else {
                this.state = STATE.STILL;
            }
            switch(this.move_dir) {
                case(MOVE_DIR.LEFT):
                    this.direction = DIRECTION.LEFT;
                    break;
                case(MOVE_DIR.RIGHT):
                    this.direction = DIRECTION.RIGHT;
                    break;
            }

            for(let dir in DIRECTION) {
                this.direction_containers[DIRECTION[dir]].visible = DIRECTION[dir] === this.direction;
                if(!this.states[this.direction][STATE.ATTACK].playing) {
                    for(let state in STATE) {
                        this.states[DIRECTION[dir]][STATE[state]].visible = STATE[state] === this.state;
                    }
                }
            }

            if(this.state === STATE.ATTACK) {
                this.states[this.direction][this.state].play();
                this.punching = false;
            }

            // If the entity was hit, flash them red once.
            if(this.damaged) {
                this.damaged = false;
                for(let dir in DIRECTION) {
                    for(let state in STATE) {
                        this.states[DIRECTION[dir]][STATE[state]].tint = 0xCC0000;
                    }
                }
                window.setTimeout(() => {
                    for(let dir in DIRECTION) {
                        for(let state in STATE) {
                            this.states[DIRECTION[dir]][STATE[state]].tint = 0xFFFFFF;
                        }
                    }
                }, 100);
            }
            // Flash on-and-off when the entities health is in danger status.
            if(this.danger && !this.flashInit) {
                this.flashInit = true;
                window.setInterval(() => {
                    this.flash = !this.flash;
                    for(let dir in DIRECTION) {
                        for(let state in STATE) {
                            if(this.flash) {
                                this.states[DIRECTION[dir]][STATE[state]].tint = 0xCC0000;
                            }
                            else {
                                this.states[DIRECTION[dir]][STATE[state]].tint = 0xFFFFFF;
                            }
                        }
                    }
                }, 500);

            }

            if(!this.isAlive) {
                if(!this.hasDied) {
                    this.die();
                }
                if(this.sprite.alpha > 0) {
                    this.sprite.alpha -= 0.05;
                }
            }
        };

        punch() {
            if(this.punching)
                return;
            this.punching = true;
        }

        get isAlive() {
            return this.health > 0;
        }

        get danger() {
            return this.health / this.MAX_HEALTH <= 0.25;
        }

        getRelativeDir(other) {
            if(this.x < other.x) {
                return DIRECTION.RIGHT;
            }
            else {
                return DIRECTION.LEFT;
            }
        }

        move() {
            if(!this.move_dir || this.move_dir === MOVE_DIR.NONE) {
                this.moving = false;
                return;
            }

            this.moving = true;
            switch(this.move_dir) {
                case(MOVE_DIR.LEFT):
                    createjs.Tween.get(this.sprite).to({x: this.sprite.x - TILE_SIZE / 2},
                        100 / this.speed)
                        .call(() => {
                            this.move();
                        });
                    break;
                case(MOVE_DIR.RIGHT):
                    createjs.Tween.get(this.sprite).to({x: this.sprite.x + TILE_SIZE / 2},
                        100 / this.speed)
                        .call(() => {
                            this.move();
                        });
            }
        }

        // Bounding box method.
        collide(other, range = 1) {
            return Math.abs(this.x - other.x) < TILE_SIZE * range
            && Math.abs(this.y - other.y) < TILE_SIZE * range;
        }

        get x() {
            return this.sprite.x;
        }

        set x(value) {
            return Math.max(0, value);
        }

        get y() {
            return this.sprite.y;
        }
    }

    class Player extends Entity {
        constructor(x, y) {
            super(x, y, 100, 1, DIRECTION.RIGHT, 'player');
            this.kills = 0;
            this.attacking = false;
            this.punchSnd = PIXI.audioManager.getAudio('punch');
        }

        update(enemies) {
            super.update();

            if(this.attacking) {
                for(let enemy of enemies) {
                    if(this.collide(enemy, 1)) {
                        this.attack(enemy);
                    }
                }
                this.attacking = false;
            }
        }

        punch() {
            super.punch();
            this.attacking = true;
        }

        // Override
        attack(enemy) {
            enemy.hurt(50);
        }
    }

    class Enemy extends Entity {
        constructor(x, y, max) {
            super(x, y, max, 0.5, DIRECTION.LEFT, 'enemy');
            this.timer_flag = false;
        }

        // Override
        attack(player) {
            player.hurt(2);
        }

        update(player) {
            super.update();

            let isColliding = this.collide(player, 1);
            if(!this.moving && !isColliding) {
                this.follow(player);
            }
            else {
                this.move_dir = MOVE_DIR.NONE;
                if(isColliding && !this.timer_flag && player.isAlive) {
                    this.timer_flag = true;
                    this.punch();

                    window.setTimeout(() => {
                        if(this.isAlive && this.collide(player, 1)) {
                            this.attack(player);
                        }
                    }, 250);
                    window.setTimeout(() => {
                        this.timer_flag = false;
                    }, 1000)
                }
            }
        }

        follow(player) {
            switch(this.getRelativeDir(player)) {
                case(DIRECTION.LEFT):
                    this.move_dir = MOVE_DIR.LEFT;
                    break;
                case(DIRECTION.RIGHT):
                    this.move_dir = MOVE_DIR.RIGHT;
                    break;
            }

            this.move();
        }
    }

    const STATE = {
        STILL: 0,
        WALK: 1,
        ATTACK: 2
    }

    const MOVE_DIR = {
        NONE: 0,
        LEFT: 1,
        RIGHT: 2
    }

    const DIRECTION = {
        LEFT: 0,
        RIGHT: 1
    }

    // Returns a random number between min (inclusive) and max (exclusive)
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
})();
