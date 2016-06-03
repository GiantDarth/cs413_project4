'use strict';
// Copyright (c) 2016 Christopher Robert Philabaum
// Use self-closing anonymous function (using arrow-notation) to avoid flooding the 'namespace'
(() => {
    const TILE_SIZE = 8;
    const SCORE_HEIGHT = 1;
    const LEVEL_WIDTH = 20;
    const LEVEL_HEIGHT = 20;
    const SAFE_ZONE_HEIGHT = 8;
    const ZOOM = 3;
    var RENDER_WIDTH, RENDER_HEIGHT;

    const PALLETE_COUNT = 4;

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
            RENDER_HEIGHT = TILE_SIZE * (LEVEL_HEIGHT + SAFE_ZONE_HEIGHT + SCORE_HEIGHT) * ZOOM;

            this.title = "Arthroploid";
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
            this.screen = new PIXI.Container();
            this.level = new PIXI.Container();
            this.screenMap.set('overlay', new PIXI.Container());
            this.screenMap.set('credits', new PIXI.Container());

            this.screen.scale.x = ZOOM;
            this.screen.scale.y = ZOOM;

            this.paused = false;

            PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
            PIXI.loader
                .add('assets/img/assets.json')
                .load(() => {
                    this.load(render);
                });
        }

        load(render) {
            this.initScreens();
            this.initLevel(false);
            this.initMouseHandlers();
            this.initKeyHandlers();

            // Initialize render loop
            render();
        }

        reset() {
            this.objContainer.removeChildren();

            this.enemies = [];

            this.loseText.visible = false;

            this.paused = false;
        }

        initScreens() {
            this.screen.addChild(this.level);
        }

        initLevel(isDemo) {
            this.level.position.y = SCORE_HEIGHT * TILE_SIZE;

            this.objContainer = new PIXI.Container();
            this.bulletLayer = new PIXI.Container();
            this.mushroomLayer = new PIXI.Container();

            this.enemies = [];
            this.bullets = [];
            this.mushrooms = [];
            if(!isDemo) {
                this.player = new Player();
            }

            let centipede = new Centipede(10);
            this.enemies.push(centipede);

            for(let m = 0; m < 20; m++) {
                let x = getRandomInt(1, LEVEL_WIDTH - 1) * TILE_SIZE;
                let y = getRandomInt(0, LEVEL_HEIGHT - 1) * TILE_SIZE;
                let mushroom = new Mushroom(x, y);
                this.mushrooms.push(mushroom);
                this.mushroomLayer.addChild(mushroom.container);
            }

            this.saveLayer = new PIXI.Container();
            this.saveLayer.y = LEVEL_HEIGHT * TILE_SIZE;
            if(this.player) {
                this.saveLayer.addChild(this.player.container);
            }

            this.enemyContainer = new PIXI.Container();
            for(let enemy of this.enemies) {
                this.enemyContainer.addChild(enemy.container);
            }
            this.objContainer.addChild(this.enemyContainer);
            this.objContainer.addChild(this.saveLayer);
            this.objContainer.addChild(this.bulletLayer);
            this.objContainer.addChild(this.mushroomLayer);

            this.level.addChild(this.objContainer);
        }

        initMouseHandlers() {
            if(this.player) {
                this.player.sprite.interactive = true;

                this.player.sprite.on('mousemove', (e) => {
                    this.player.x = Math.max(TILE_SIZE, Math.min(e.data.global.x / ZOOM, (LEVEL_WIDTH - 1) * TILE_SIZE));
                    this.player.y = Math.max(0, Math.min(e.data.global.y / ZOOM - (LEVEL_HEIGHT + SCORE_HEIGHT) * TILE_SIZE, (SAFE_ZONE_HEIGHT - 1) * TILE_SIZE));
                });

                this.player.sprite.on('mousedown', (e) => {
                    let bullet = new Bullet(this.player.x, this.player.y + LEVEL_HEIGHT * TILE_SIZE);
                    this.bullets.push(bullet);
                    this.bulletLayer.addChild(bullet.container);
                });
            }
        }

        initKeyHandlers() {
            document.addEventListener('keydown', e => {

            });

            document.addEventListener('keyup', e => {

            });
        }

        update() {
            if(this.demo) {
                for(let enemy of this.enemies) {
                    enemy.update();
                }
            }
            else if(!this.paused) {
                for(let enemy of this.enemies) {
                    enemy.update(this.player);
                }

                for(let bullet of this.bullets) {
                    bullet.update();
                }

                let oldBullets = this.bullets.filter(bullet => !bullet.isAlive);
                for(let bullet of oldBullets) {
                    this.bulletLayer.removeChild(bullet.container);
                }
                this.bullets = this.bullets.filter(bullet => bullet.isAlive);

                for(let mushroom of this.mushrooms) {
                    mushroom.update();
                }
            }

            // Final step
            this.renderer.render(this.screen);
        }
    }

    class Object {
        constructor() {
            this.container = new PIXI.Container();
        }

        update() {}

        get x() {
            return this.container.position.x;
        }

        set x(pos) {
            this.container.position.x = pos;
        }

        get y() {
            return this.container.position.y;
        }

        set y(pos) {
            this.container.position.y = pos;
        }
    }

    class Entity extends Object {
        constructor(url, frameCount, paletteCount = PALLETE_COUNT) {
            super();

            this.palettes = [];
            for(let s = 0; s < paletteCount; s++) {
                let palette = [];
                // Create walk cycle frames.
                for(let frame = 0; frame < frameCount; frame++) {
                    palette.push(PIXI.Texture.fromFrame(`${url}${frame + 1 + s * frameCount}.png`));
                }

                let clip = new PIXI.extras.MovieClip(palette);
                clip.play();
                clip.animationSpeed = 0.2;
                clip.anchor.x = 0.5;
                clip.anchor.y = 0.5;
                this.palettes.push(clip);
            }

            this.container.addChild(this.palettes[0]);

            this.states = {
                death: StateMachine.create({
                    initial: 'false',
                    events: [
                        { name: 'die', from: 'false', to: 'true' }
                    ]
                })
            }
        }

        update() {
            super.update();
        }

        get isAlive() {
            return this.states.death.is('false');
        }

        die() {
            this.states.death.die();
        }
    }

    class Bullet extends Entity {
        constructor(x, y) {
            super('bullet', 1, 1);

            this.x = x;
            this.y = y;
            this.velocity = (LEVEL_HEIGHT + SAFE_ZONE_HEIGHT) * 20;

            createjs.Tween.get(this).to({ y: -TILE_SIZE }, this.velocity)
                .call(() => {
                    if(this.isAlive) {
                        this.die();
                    }
                });
        }

        update() {
            super.update();
        }
    }

    class Mushroom extends Entity {
        constructor(x, y) {
            super('mushroom', 1, 1);

            this.x = x;
            this.y = y;
        }

        update() {
            super.update();
        }
    }

    class Player extends Entity {
        constructor() {
            super('player', 1, 1);
        }

        get sprite() {
            return this.palettes[0];
        }

        set sprite(value) {
            this.palettes[0] = value;
        }

        update() {
            super.update();
        }
    }

    class Enemy extends Entity {
        static get FRAME_COUNT() {
            return 5;
        }

        constructor(url) {
            super(url, 5);
        }

        update(player) {
            super.update();

            // TODO
        }
    }

    class Centipede extends Object {
        constructor(length = 1) {
            super();

            let startX = 0;
            let speed = 1000;
            this.segments = [ new Segment(Segment.TYPE.HEAD, speed) ];
            this.segments[0].x = startX * TILE_SIZE;

            for(let s = 1; s < length; s++) {
                let segment = new Segment(Segment.TYPE.BASE, speed);
                segment.x = (-s + startX) * TILE_SIZE;

                segment.states.death.ondie = () => {};

                this.segments.push(segment);
            }

            for(let segment of this.segments) {
                this.container.addChild(segment.container);
            }
        }

        get isAlive() {
            return this.segments.every(segment => segment.isAlive);
        }

        update(player) {
            super.update();

            if(this.isAlive) {
                for(let seg of this.segments) {
                    seg.update(player);
                }

                let deaths = this.segments.filter(segment => !segment.isAlive);
            }
        }
    }

    class Segment extends Enemy {
        static get TYPE() {
            return {
                HEAD: "HEAD",
                BASE: "BASE"
            }
        }

        static get DIR() {
            return {
                LEFT: "left",
                RIGHT: "right"
            }
        }

        constructor(type, speed = 1) {
            switch(type) {
                case(Segment.TYPE.HEAD):
                    super('head');
                    break;
                case(Segment.TYPE.BASE):
                    super('base');
                    break;
            }

            this.type = type;
            this.progression = 0;
            this.states.dir;
            this.speed = speed;
            let callback = (event, from, to) => {
                this.moving = true;
                this.container.rotation = 0;

                if(this.y >= (LEVEL_HEIGHT + SAFE_ZONE_HEIGHT - 1) * TILE_SIZE || (this.y < 0 && this.progression % 2 === 1)) {
                    this.progression++;
                }
                let step = TILE_SIZE * (this.progression % 2 === 0 ? 1 : -1);
                createjs.Tween.get(this).to({ y: this.y + step }, 1000 / this.speed)
                    .call(function() {
                        this.moving = false;
                        this.states.dir.transition();
                    });

                return StateMachine.ASYNC;
            };
            this.states.dir = StateMachine.create({
                initial: 'right',
                events: [
                    { name: 'collide', from: 'left', to: 'right' },
                    { name: 'collide', from: 'right', to: 'left' }
                ],
                callbacks: {
                    onenterleft: (event, from, to) => {
                        this.container.rotation = Math.PI / 2;
                    },
                    onenterright: (event, from, to) => {
                        this.container.rotation = -Math.PI / 2;
                    },
                    onleaveleft: callback,
                    onleaveright: callback
                }
            });
            this.moving = false;
        }

        update(player) {
            super.update(player);
            if(this.isAlive) {
                // console.log(this.container.toGlobal(new PIXI.Point(0, 0)));
                // console.log(this.x, this.container.x)

                if(!this.moving) {
                    if((this.x <= TILE_SIZE / 2 && this.states.dir.is('left')) || (this.x >= (LEVEL_WIDTH - 0.5) * TILE_SIZE && this.states.dir.is('right'))) {
                        this.states.dir.collide();
                    }
                }

                if(!this.moving) {
                    this.moving = true;
                    let dx;
                    switch(this.states.dir.current) {
                        case('left'):
                            dx = -TILE_SIZE;
                            break;
                        case('right'):
                            dx = TILE_SIZE;
                            break;
                    }
                    createjs.Tween.get(this).to({
                            x: this.x + dx
                        },
                        1000 / this.speed
                    )
                    .call(() => {
                        this.moving = false;
                    });
                }
            }
        }
    }

    class Arthropleura extends Centipede {
        constructor(length) {
            super(length);

            this.container.scale.x = 4;
            this.container.scale.y = 4;
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
