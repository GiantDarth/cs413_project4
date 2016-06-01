'use strict';
// Copyright (c) 2016 Christopher Robert Philabaum
// Use self-closing anonymous function (using arrow-notation) to avoid flooding the 'namespace'
(() => {
    const TILE_SIZE = 8;
    const SCORE_HEIGHT = 1;
    const LEVEL_WIDTH = 20;
    const LEVEL_HEIGHT = 20;
    const SAVE_ZONE_HEIGHT = 8;
    const ZOOM = 3;
    var RENDER_WIDTH, RENDER_HEIGHT;

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
            RENDER_WIDTH = TILE_SIZE * LEVEL_WIDTH * ZOOM;
            RENDER_HEIGHT = TILE_SIZE * (LEVEL_HEIGHT + SAVE_ZONE_HEIGHT + SCORE_HEIGHT) * ZOOM;

            this.title = "Centipede?";

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
                .add('assets/img/assets.json')
                .load(() => {
                    this.load(render);
                });
        }

        load(render) {
            this.initScreens();
            this.initWorld();
            this.initKeyHandlers();

            // Initialize render loop
            render();
        }

        reset() {
            this.entityContainer.removeChildren();

            this.enemies = new Array();

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
            this.enemies = new Array();

            this.entityContainer = new PIXI.Container();

            this.world.addChild(this.entityContainer);
        }

        initKeyHandlers() {
            document.addEventListener('keydown', e => {

            });

            document.addEventListener('keyup', e => {

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
    }

    // Returns a random number between min (inclusive) and max (exclusive)
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
})();
