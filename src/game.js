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
            this.credits = [
                'Creator: Christopher Philabaum',
                'Sound Design: Christopher Philabaum',
                'Music: Christopher Philabaum',
                'Art: Christopher Philabaum',
            ];
            this.tools = [
                'Pixijs',
                'Pixi-Audio',
                'TweenJS',
                'Bfxr',
                'Bosca Ceoil',
                'fre:ac',
                'Atom'
            ]

            // Append renderer to gameport
            this.gameport = document.getElementById("gameport");
            this.renderer = PIXI.autoDetectRenderer(RENDER_WIDTH, RENDER_HEIGHT, { backgroundColor: 0x000000 });
            gameport.appendChild(this.renderer.view);

            // Add screens
            this.screenMap = new Map();
            this.currentScreen = 'demo';
            this.screenMap.set('screen', new PIXI.Container());
            this.screenMap.set('overlay', new PIXI.Container());
            this.screenMap.set('demo', new PIXI.Container());
            this.screenMap.set('level', new PIXI.Container());
            this.screenMap.set('credits', new PIXI.Container());

            this.screenMap.get('screen').scale.x = ZOOM;
            this.screenMap.get('screen').scale.y = ZOOM;

            this.paused = false;

            // PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
            PIXI.loader
                .add('assets/img/assets.json')
                .load(() => {
                    this.load(render);
                });
        }

        load(render) {
            // this.initScreens();
            this.initLevel(true);
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
            this.options = ['Play', 'Credits'];
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

        initWorld(isDemo) {
            this.level = new PIXI.Container();
            this.enemies = new Array();
            this.player;

            this.entityContainer = new PIXI.Container();
            this.level.addChild(this.entityContainer);


        }

        initKeyHandlers() {
            document.addEventListener('keydown', e => {

            });

            document.addEventListener('keyup', e => {

            });
        }

        update() {
            if(this.demo) {

            }
            else if(!this.paused) {

            }

            // Final step
            this.renderer.render(this.screenMap.get(this.currentScreen));
        }
    }

    const

    // Returns a random number between min (inclusive) and max (exclusive)
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
})();
