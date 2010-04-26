// Asteroids.js
// Copyright (c) 2010 James Socol <me@jamessocol.com>
// See LICENSE.txt for license terms.

// Game settings
GAME_HEIGHT = 480;
GAME_WIDTH = 640;
FRAME_PERIOD = 60; // 1 frame / x frames/sec
LEVEL_TIMEOUT = 2000; // How long to wait after clearing a level.

// Player settings
ROTATE_SPEED = Math.PI/10; // How fast do players turn?  (radians)
MAX_SPEED = 15; // Maximum player speed
THRUST_ACCEL = 1;
DEATH_TIMEOUT = 2000; // milliseconds
PLAYER_LIVES = 3;
POINTS_PER_SHOT = 1; // How many points does a shot cost? (Should be >= 0.)

// Bullet settings
BULLET_SPEED = 20;
MAX_BULLETS = 3;
MAX_BULLET_AGE = 25;

// Asteroid settings
ASTEROID_COUNT = 2; // This + current level = number of asteroids.
ASTEROID_GENERATIONS = 3; // How many times to they split before dying?
ASTEROID_CHILDREN = 2; // How many does each death create?
ASTEROID_SPEED = 3;
ASTEROID_SCORE = 10; // How many points is each one worth?


var Asteroids = function(home) {
    // Constructor
    // Order matters.

    // Set up logging.
    this.log_level = Asteroids.LOG_DEBUG;
    this.log = Asteroids.logger(this);

    // Create the info pane, player, and playfield.
    home.innerHTML = '';
    this.info = Asteroids.infoPane(this, home);
    this.playfield = Asteroids.playfield(this, home);
    this.player = Asteroids.player(this);

    // Set up the event listeners.
    this.keyState = Asteroids.keyState(this);
    this.listen = Asteroids.listen(this);

    // Useful functions.
    this.asteroids = [];
    this.level = Asteroids.level(this);
    this.gameOver = Asteroids.gameOver(this);

    // Play the game.
    Asteroids.play(this);
    return this;
}

Asteroids.infoPane = function(game, home) {
    var pane = document.createElement('div');
    pane.innerHTML = 'ASTEROIDS';

    var lives = document.createElement('span');
    lives.className = 'lives';
    lives.innerHTML = 'LIVES: ' + PLAYER_LIVES;

    var score = document.createElement('span');
    score.className = 'score';
    score.innerHTML = 'SCORE: 0';

    var level = document.createElement('span');
    level.className = 'level';
    level.innerHTML = 'LEVEL: 1';

    pane.appendChild(lives);
    pane.appendChild(score);
    pane.appendChild(level);
    home.appendChild(pane);

    return {
        setLives: function(game, l) {
            lives.innerHTML = 'LIVES: ' + l;
        },
        setScore: function(game, s) {
            score.innerHTML = 'SCORE: ' + s;
        },
        setLevel: function(game, _level) {
            level.innerHTML = 'LEVEL: ' + _level;
        },
        getPane: function() {
            return pane;
        }
    }
}

Asteroids.playfield = function(game, home) {
    var canvas = document.createElement('canvas');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    home.appendChild(canvas);
    return canvas;
}

Asteroids.logger = function(game) {
    if (typeof console != 'undefined' &&
        typeof console.log != 'undefined') {
        return {
            info: function(msg) {
                if (game.log_level <= Asteroids.LOG_INFO)
                    console.log(msg);
            },
            debug: function(msg) {
                if (game.log_level <= Asteroids.LOG_DEBUG)
                    console.log(msg);
            },
            warning: function(msg) {
                if (game.log_level <= Asteroids.LOG_WARNING)
                    console.log(msg);
            },
            error: function(msg) {
                if (game.log_level <= Asteroids.LOG_ERROR)
                    console.log(msg);
            },
            critical: function(msg) {
                if (game.log_level <= Asteroids.LOG_CRITICAL)
                    console.log(msg);
            }
        }
    }
    else {
        return {
            info: function(msg){},
            debug: function(msg){},
            warning: function(msg){},
            error: function(msg){},
            critical: function(msg){},
        }
    }
}

Asteroids.player = function(game) {
    var position = [GAME_WIDTH/2, GAME_HEIGHT/2],
        velocity = [0, 0],
        direction = -Math.PI/2,
        dead = false,
        lives = PLAYER_LIVES,
        score = 0,
        path = [
            [10, 0],
            [-5, 5],
            [-5, -5],
            [10, 0],
        ];

    return {
        getPosition: function() {
            return position;
        },
        getVelocity: function() {
            return velocity;
        },
        getSpeed: function() {
            with (Math) {
                return sqrt(pow(velocity[0], 2) + pow(velocity[1], 2));
            }
        },
        getDirection: function() {
            return direction;
        },
        getScore: function() {
            return score;
        },
        addScore: function(pts) {
            score += pts;
        },
        lowerScore: function(pts) {
            score -= pts;
            if (score < 0) {
                score = 0;
            }
        },
        getLives: function() {
            return lives;
        },
        rotate: function(rad) {
            if (!dead) {
                direction += rad;
                game.log.info(direction);
            }
        },
        thrust: function(force) {
            if (!dead) {
                velocity[0] += force * Math.cos(direction);
                velocity[1] += force * Math.sin(direction);

                if (this.getSpeed() > MAX_SPEED) {
                    velocity[0] = MAX_SPEED * Math.cos(direction);
                    velocity[1] = MAX_SPEED * Math.sin(direction);
                }

                game.log.info(velocity);
            }
        },
        move: function() {
            Asteroids.move(position, velocity);
        },
        draw: function(ctx) {
            Asteroids.drawPath(ctx, position, direction, 1, path);
        },
        isDead: function() {
            return dead;
        },
        extraLife: function(game) {
            game.log.debug('Woo, extra life!');
            lives++;
        },
        die: function(game) {
            if (!dead) {
                game.log.debug('You died!');
                dead = true;
                lives--;
                position = [GAME_WIDTH/2, GAME_HEIGHT/2];
                velocity = [0, 0];
                direction = -Math.PI/2;
                if (lives > 0) {
                    setTimeout(function (player, _game) {
                        return function() {
                            player.ressurrect(_game);
                        }
                    }(this, game), DEATH_TIMEOUT);
                }
                else {
                    game.gameOver();
                }
            }
        },
        ressurrect: function(game) {
            if (dead) {
                dead = false;
                game.log.debug('You ressurrected!');
            }
        },
        fire: function(game) {
            if (!dead) {
                game.log.debug('You fired!');
                var _pos = [position[0], position[1]],
                    _dir = direction;

                this.lowerScore(POINTS_PER_SHOT);

                return Asteroids.bullet(game, _pos, _dir);
            }
        }
    }
}

Asteroids.bullet = function(game, _pos, _dir) {
    var position = [_pos[0], _pos[1]],
        velocity = [0, 0],
        direction = _dir,
        age = 0,
        path = [
            [0, 0],
            [-4, 0],
        ];

    velocity[0] = BULLET_SPEED * Math.cos(_dir);
    velocity[1] = BULLET_SPEED * Math.sin(_dir);

    return {
        getPosition: function() {
            return position;
        },
        getVelocity: function() {
            return velocity;
        },
        getSpeed: function() {
            with (Math) {
                return sqrt(pow(velocity[0], 2) + pow(velocity[1], 2));
            }
        },
        getAge: function() {
            return age;
        },
        birthday: function() {
            age++;
        },
        move: function() {
            Asteroids.move(position, velocity);
        },
        draw: function(ctx) {
            Asteroids.drawPath(ctx, position, direction, 1, path);
        },
    }
}

Asteroids.keyState = function(game) {
    var state = [];
    state[Asteroids.LEFT] = false;
    state[Asteroids.UP] = false;
    state[Asteroids.RIGHT] = false;
    state[Asteroids.DOWN] = false;
    state[Asteroids.SPACE] = false;

    return {
        on: function(key) {
            state[key] = true;
        },
        off: function(key) {
            state[key] = false;
        },
        getState: function(key) {
            if (typeof state[key] != 'undefined')
                return state[key];
            return false;
        }
    }
}

Asteroids.listen = function(game) {
    window.addEventListener('keydown', function(e) {
        switch (e.which) {
            case Asteroids.UP:
            case Asteroids.LEFT:
            case Asteroids.RIGHT:
            case Asteroids.DOWN:
            case Asteroids.SPACE:
                e.preventDefault();
                e.stopPropagation();
                game.keyState.on(e.which)
                return false;
        }
        return true;
    }, true);

    window.addEventListener('keyup', function(e) {
        switch (e.which) {
            case Asteroids.UP:
            case Asteroids.LEFT:
            case Asteroids.RIGHT:
            case Asteroids.DOWN:
            case Asteroids.SPACE:
                e.preventDefault();
                e.stopPropagation();
                game.keyState.off(e.which)
                return false;
        }
        return true;
    }, true);
}

Asteroids.asteroid = function (game, _gen) {
    var position = [0, 0],
        velocity = [0, 0],
        generation = _gen,
        radius = 7,
        path = [
            [1, 7],
            [5, 5],
            [7, 1],
            [5, -3],
            [7, -7],
            [3, -9],
            [-1, -5],
            [-4, -2],
            [-8, -1],
            [-9, 3],
            [-5, 5],
            [-1, 3],
            [1, 7]
        ];

    return {
        getPosition: function() {
            return position;
        },
        setPosition: function(pos) {
            position = pos;
        },
        getVelocity: function() {
            return velocity;
        },
        setVelocity: function(vel) {
            velocity = vel;
        },
        getSpeed: function() {
            with (Math) {
                return sqrt(pow(velocity[0], 2) + pow(velocity[1], 2));
            }
        },
        getRadius: function() {
            return radius * generation;
        },
        getGeneration: function() {
            return generation;
        },
        move: function() {
            position[0] += velocity[0];
            if (position[0] < 0)
                position[0] = GAME_WIDTH + position[0];
            else if (position[0] > GAME_WIDTH)
                position[0] -= GAME_WIDTH;

            position[1] += velocity[1];
            if (position[1] < 0)
                position[1] = GAME_HEIGHT + position[1];
            else if (position[1] > GAME_HEIGHT)
                position[1] -= GAME_HEIGHT;

            game.log.info(position);
        },
        draw: function(ctx) {
            ctx.setTransform(1, 0, 0, 1, position[0], position[1]);
            ctx.beginPath();
            ctx.arc(0, 0, radius*generation, 0, Math.PI*2, false);
            ctx.stroke();
            ctx.closePath();
        }
    }
}

Asteroids.collision = function (a, b) {
    // if a.getPosition() inside b.getBounds?
    var a_pos = a.getPosition(),
        b_pos = b.getPosition();

    function sq (x) {
        return Math.pow(x, 2);
    }

    var distance = Math.sqrt(sq(a_pos[0] - b_pos[0]) +
                             sq(a_pos[1] - b_pos[1]));

    if (distance <= b.getRadius())
        return true;
    return false;
}

Asteroids.level = function(game) {
    var level = 0,
        speed = ASTEROID_SPEED,
        hspeed = ASTEROID_SPEED/2;

    return {
        getLevel: function() {
            return level;
        },
        levelUp: function(game) {
            level++;
            game.log.debug('Congrats! On to level ' + level);
            while (game.asteroids.length < level+ASTEROID_COUNT) {
                var a = Asteroids.asteroid(game, ASTEROID_GENERATIONS);
                a.setPosition([Math.random() * GAME_WIDTH,
                               Math.random() * GAME_HEIGHT]);
                a.setVelocity([Math.random() * speed - hspeed,
                               Math.random() * speed - hspeed]);
                game.asteroids.push(a);
            }
        },
    }
}

Asteroids.gameOver = function (game) {

    return function () {
        game.log.debug('Game over!');

        clearInterval(game.pulse);

        var ctx = game.playfield.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillText('GAME OVER', GAME_WIDTH/2, GAME_HEIGHT/2);
    }
}

Asteroids.drawPath = function (ctx, position, direction, scale, path) {
    with (Math) {
        ctx.setTransform(cos(direction) * scale, sin(direction) * scale,
                         -sin(direction) * scale, cos(direction) * scale,
                         position[0], position[1]);
    }
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (i=1; i<path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
    }
    ctx.stroke();
    ctx.closePath();
}

Asteroids.move = function (position, velocity) {
    position[0] += velocity[0];
    if (position[0] < 0)
        position[0] = GAME_WIDTH + position[0];
    else if (position[0] > GAME_WIDTH)
        position[0] -= GAME_WIDTH;

    position[1] += velocity[1];
    if (position[1] < 0)
        position[1] = GAME_HEIGHT + position[1];
    else if (position[1] > GAME_HEIGHT)
        position[1] -= GAME_HEIGHT;
}

Asteroids.play = function (game) {
    var ctx = game.playfield.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';

    var speed = ASTEROID_SPEED,
        hspeed = ASTEROID_SPEED/2;

    game.level.levelUp(game);

    var bullets = [],
        last_fire_state = false,
        last_asteroid_count = 0;

    game.pulse = setInterval(function(){
        var kill_asteroids = [],
            new_asteroids = [],
            kill_bullets = [];

        ctx.save();
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        if (game.keyState.getState(Asteroids.UP)) {
            game.player.thrust(THRUST_ACCEL);
        }

        if (game.keyState.getState(Asteroids.LEFT)) {
            game.player.rotate(-ROTATE_SPEED);
        }

        if (game.keyState.getState(Asteroids.RIGHT)) {
            game.player.rotate(ROTATE_SPEED);
        }

        var fire_state = game.keyState.getState(Asteroids.SPACE);
        if (fire_state &&
            (fire_state != last_fire_state) &&
            (bullets.length < MAX_BULLETS)) {
            var b = game.player.fire(game);
            bullets.push(b);
        }
        last_fire_state = fire_state;

        if (!game.player.isDead()) {
            game.player.move();
            game.player.draw(ctx);
        }

        for (var k=0; k<bullets.length; k++) {
            if (!bullets[k])
                continue;

            if (bullets[k].getAge() > MAX_BULLET_AGE) {
                kill_bullets.push(k);
                continue;
            }
            bullets[k].birthday();
            bullets[k].move();
            bullets[k].draw(ctx);
        }

        for (var r=kill_bullets.length-1; r>=0; r--) {
            bullets.splice(r, 1);
        }

        for (var i=0; i<game.asteroids.length; i++) {
            var killit = false;
            game.asteroids[i].move();
            game.asteroids[i].draw(ctx);

            // Destroy the asteroid
            for (var j=0; j<bullets.length; j++) {
                if (!bullets[j])
                    continue;
                if (Asteroids.collision(bullets[j], game.asteroids[i])) {
                    game.log.debug('You shot an asteroid!');
                    // Destroy the bullet.
                    bullets.splice(j, 1);
                    killit = true; // JS doesn't have "continue 2;"
                    continue;
                }
            }

            // Kill the asteroid?
            if (killit) {
                var _gen = game.asteroids[i].getGeneration() - 1;
                if (_gen > 0) {
                    // Create children ;)
                    for (var n=0; n<ASTEROID_CHILDREN; n++) {
                        var a = Asteroids.asteroid(game, _gen);
                        var _pos = [asteroids[i].getPosition()[0],
                                    asteroids[i].getPosition()[1]];
                        a.setPosition(_pos);
                        a.setVelocity([Math.random() * speed - hspeed,
                                       Math.random() * speed - hspeed]);
                        new_asteroids.push(a);
                    }
                }
                game.player.addScore(ASTEROID_SCORE);
                kill_asteroids.push(i);
                continue;
            }

            // Kill the player?
            if (!game.player.isDead() &&
                Asteroids.collision(game.player, asteroids[i])) {
                game.player.die(game);
            }
        }

        kill_asteroids.sort(function(a, b) { return a - b; });
        for (var m=kill_asteroids.length-1; m>=0; m--) {
            game.asteroids.splice(kill_asteroids[m], 1);
        }

        for (var o=0; o<new_asteroids.length; o++) {
            game.asteroids.push(new_asteroids[o]);
        }

        ctx.restore();

        // Do we need to level up?
        if (0 == game.asteroids.length && 
            last_asteroid_count != 0) {
            setTimeout(function() {
                game.level.levelUp(game);
            }, LEVEL_TIMEOUT);
        }

        last_asteroid_count = game.asteroids.length;

        // Update the info pane.
        game.info.setLives(game, game.player.getLives());
        game.info.setScore(game, game.player.getScore());
        game.info.setLevel(game, game.level.getLevel());
    }, FRAME_PERIOD);
}

// Some boring constants.
Asteroids.LOG_ALL = 0;
Asteroids.LOG_INFO = 1;
Asteroids.LOG_DEBUG = 2;
Asteroids.LOG_WARNING = 3;
Asteroids.LOG_ERROR = 4;
Asteroids.LOG_CRITICAL = 5;
Asteroids.LOG_NONE = 6;

Asteroids.LEFT = 37;
Asteroids.UP = 38;
Asteroids.RIGHT = 39;
Asteroids.DOWN = 40;
Asteroids.SPACE = 32;

// Load it up!
window.onload = Asteroids(document.getElementById('asteroids'));
