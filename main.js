const DEBUG = true;

window.onload = function () {
    let animation = new Animation(document.getElementById('output'));
    animation.start();
    window.onresize = function (e) {
        animation.onload();
    }
}

class Animation {
    width = 0 | window.innerWidth;
    height = 0 | window.innerHeight;
    count = 0
    graphicManager = new PerspectiveManager()
    sun = new Sun({ manager: this.graphicManager })

    ctx
    objs = []

    constructor(canvas) {
        canvas.width = this.width;
        canvas.height = this.height;

        let animation = this;
        canvas.onmousemove = function (e) {
            animation.graphicManager.move(e.offsetX, e.offsetY);
            return true;
        }

        this.ctx = canvas.getContext('2d');
        this.ctx.translate(this.width / 2, this.height / 2);

        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        this.objs.push(this.sun);
        if (DEBUG) this.objs.push(new Axes({ manager: this.graphicManager }));
        for (let i = 0; i < 500; i++)
            this.objs.push(new Particle({ manager: this.graphicManager }));
    }

    start() {
        requestAnimationFrame(this.proc.bind(this));
    }

    proc() {
        this.draw();
        this.next(++this.count);
        this.graphicManager.keyMove();
        requestAnimationFrame(this.proc.bind(this));
    }

    draw() {
        this.drawBackground();

        this.objs.sort((a, b) => a.getPriority() - b.getPriority());

        for (let obj of this.objs)
            obj.draw(this.ctx);
    }

    drawBackground() {
        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.fillStyle = "#222222";
        this.ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        this.ctx.restore();
    }

    next(count) {
        for (let i = 0; i < this.objs.length; i++) {
            let obj = this.objs[i];
            obj.next(count);

            if (this.sun != obj && obj.pos != undefined && obj.pos.squareSize() <= (this.sun.r + obj.r) ** 2) {
                this.sun.r += 3;
                this.graphicManager.baseLength += 3;
                this.objs.splice(i--, 1);
            }
        }

        if (count % 200 == 0)
            this.objs.push(new Planet({ manager: this.graphicManager, offset: this.sun.r }));
    }

    onload() {
        this.width = 0 | window.innerWidth;
        this.height = 0 | window.innerHeight;

        this.ctx.canvas.width = this.width;
        this.ctx.canvas.height = this.height;

        this.ctx = this.ctx.canvas.getContext('2d');
        this.ctx.translate(this.width / 2, this.height / 2);

        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
    }
}

class Planet {
    alpha = "FF"
    r = 0 | Math.random() * 10 + 15
    g = 0.0002
    pos = Vector.randVector(300, 400)
    velocity = Planet.makeVelocity(this.pos, 5, 6)
    color = `#${new Array(3).fill(0).map(_ => (255 - (0 | Math.random() * 128)).toString(16).padStart(2, '0')).join('')}${this.alpha}`
    graphicManager

    constructor(obj) {
        if (!obj) return;

        this.graphicManager = obj.manager;
        if (obj.offset == undefined) obj.offset = 0;
        this.pos = Vector.randVector(300 + obj.offset, 400 + obj.offset);
    }

    draw(ctx) {
        let pos = this.graphicManager.projection(this.pos);

        if (pos.z >= 0) return;

        ctx.save();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.r * PerspectiveManager.screenLength / pos.z, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();

        if (DEBUG) {
            var velocityPos = this.graphicManager.projection(this.pos.plus(this.velocity.resize(20)));
            if (velocityPos.z < 0) {
                ctx.strokeStyle = "#FF00FF";
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(velocityPos.x, velocityPos.y);
                ctx.closePath();
                ctx.stroke();
            }

            var posVector = this.graphicManager.projection(this.pos.plus(this.pos.resize(20)));
            if (posVector.z < 0) {
                ctx.strokeStyle = "#00FF00";
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(posVector.x, posVector.y);
                ctx.closePath();
                ctx.stroke();
            }

            if (this.pos.squareSize()) {
                ctx.fillStyle = "#000000";
                if (pos.squareSize())
                    ctx.fillText(0 | Math.sqrt(this.pos.squareSize()), pos.x, pos.y);
                else
                    ctx.fillText(0 | this.r * PerspectiveManager.screenLength / pos.z, pos.x, pos.y);
            }
        }

        ctx.restore();
    }

    next(count) {
        this.pos = this.pos.plus(this.velocity);
        this.velocity = this.velocity.plus(this.pos.scalarProduct(-this.g));

        if (count % 10 == 0)
            this.velocity = this.velocity.scalarProduct(0.99);
    }

    getPriority() {
        return this.graphicManager.projection(this.pos).z;
    }

    static makeVelocity(pos, minr, maxr) {
        if (minr >= maxr) minr = 0;

        while (true) {
            let v = Vector.randVector(minr, maxr);
            let inner = pos.unit().innerProduct(v.unit());

            if (inner <= 0.1 && inner >= -0.1)
                return v;
        }
    }
}

class Sun extends Planet {
    constructor(obj) {
        super(obj);

        super.r = 20
        super.pos = new Vector(0, 0, 0);
        super.color = `#FFFFFF${this.alpha}`;
        super.velocity = new Vector(0, 0, 0);
    }

    draw(ctx) {
        super.draw(ctx);

        if (DEBUG) {
            let pos = this.graphicManager.projection(this.pos);
            ctx.save();
            ctx.fillStyle = "#000000";
            ctx.fillText(this.r, pos.x, pos.y);
            ctx.restore();
        }
    }

    next(count) { }
}

class Axes {
    graphicManager

    constructor(obj) {
        if (!obj) return;

        this.graphicManager = obj.manager;
    }

    draw(ctx) {
        let size = 100;
        let textsize = 100;

        ctx.save();

        var v = this.graphicManager.projection(new Vector(1, 0, 0).resize(size));
        if (v.z < 0) {
            ctx.strokeStyle = "#FF0000";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(v.x, v.y);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = "#00FFFF";
            ctx.beginPath();
            var v = this.graphicManager.projection(new Vector(1, 0, 0).resize(textsize));
            ctx.fillText("X", v.x, v.y);
        }

        var v = this.graphicManager.projection(new Vector(0, 1, 0).resize(size));
        if (v.z < 0) {
            ctx.strokeStyle = "#00FF00";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(v.x, v.y);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = "#FF00FF";
            ctx.beginPath();
            var v = this.graphicManager.projection(new Vector(0, 1, 0).resize(textsize));
            ctx.fillText("Y", v.x, v.y);
        }

        var v = this.graphicManager.projection(new Vector(0, 0, 1).resize(size));
        if (v.z < 0) {
            ctx.strokeStyle = "#0000FF";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(v.x, v.y);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            var v = this.graphicManager.projection(new Vector(0, 0, 1).resize(textsize));
            ctx.fillText("Z", v.x, v.y);
        }

        ctx.restore();
    }

    next() { }

    getPriority() {
        return this.graphicManager.projection(new Vector(0, 0, 0)).z;
    }
}


class Particle {
    pos = Vector.randVector(10000, 11000)
    r = Math.random() + 0.5
    color = `#${new Array(3).fill(0).map(_ => (255 - (0 | Math.random() * 64) - 64).toString(16).padStart(2, '0')).join('')}`
    graphicManager

    constructor(obj) {
        if (!obj) return;

        this.graphicManager = obj.manager;
    }

    draw(ctx) {
        let pos = this.graphicManager.projection(this.pos);
        if (pos.z >= 0) return;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }

    next() {}

    getPriority() {
        return this.graphicManager.projection(this.pos).z;
    }
}

class Vector {
    x
    y
    z

    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    squareSize() { return (this.x ** 2) + (this.y ** 2) + (this.z ** 2); }

    unit() { return this.resize(1); }
    resize(len) {
        let length = Math.sqrt(this.squareSize());
        if (length == 0) return this;
        return new Vector(len * this.x / length, len * this.y / length, len * this.z / length);
    }

    scalarProduct(k) { return new Vector(k * this.x, k * this.y, k * this.z); }

    innerProduct(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    plus(v) { return new Vector(this.x + v.x, this.y + v.y, this.z + v.z); }

    static randVector(minr, maxr) {
        if (minr >= maxr) minr = 0;

        while (true) {
            let position = new Array(3).fill(0).map(_ => Math.random() * 2 * maxr - maxr);
            let squareLength = position.reduce((a, x) => a + x ** 2, 0);

            if (squareLength >= minr ** 2 && squareLength <= maxr ** 2)
                return new Vector(position[0], position[1], position[2]);
        }
    }
}

class PerspectiveManager {
    static screenLength = -300
    baseLength = 300
    pre
    th = Math.PI * 3 / 2
    pi = 0
    keyStat = {}

    constructor() {
        window.onkeydown = (e) => { this.keyStat[e.key] = true; };
        window.onkeyup = (e) => { this.keyStat[e.key] = false; };
    }

    move(x, y) {
        let [dx, dy] = [0, 0];

        if (this.pre != null) {
            dx = x - this.pre[0];
            dy = y - this.pre[1];
        }

        this.pre = [x, y];

        this.th -= dx / 200;
        this.pi += dy / 200;

        this.normalize();
    }

    keyMove() {
        let [dx, dy] = [0, 0];

        if (this.keyStat['w']) dy--;
        if (this.keyStat['a']) dx--;
        if (this.keyStat['s']) dy++;
        if (this.keyStat['d']) dx++;

        this.th -= dx / 20;
        this.pi += dy / 20;
        this.normalize();
    }

    normalize() {
        this.th = (this.th + 2 * Math.PI) % (2 * Math.PI);
        this.pi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pi));
    }

    projection(v) {
        let sin = Math.sin;
        let cos = Math.cos;
        let basePosition = new Vector(
            cos(this.pi) * cos(this.th),
            cos(this.pi) * sin(this.th),
            sin(this.pi)
        ).resize(-this.baseLength);
        v = v.plus(basePosition);

        let s = -sin(this.th) * v.x + cos(this.th) * v.y;
        let t = sin(this.pi) * cos(this.th) * v.x + sin(this.pi) * sin(this.th) * v.y - cos(this.pi) * v.z;
        let u = cos(this.pi) * cos(this.th) * v.x + cos(this.pi) * sin(this.th) * v.y + sin(this.pi) * v.z;

        if (u == 0) u = Number.MIN_VALUE;
        return new Vector(s * PerspectiveManager.screenLength / u, t * PerspectiveManager.screenLength / u, u);
    }
}