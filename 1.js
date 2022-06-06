const DEBUG = true;
let MIN_LENGTH;

window.onload = function () {
    MIN_LENGTH = Math.min(window.innerWidth, window.innerHeight);
    let animation = new Animation(document.getElementById('output'));
    animation.start();
}



class Animation {
    _width = 0|window.innerWidth;
    _height = 0|window.innerHeight;
    _count = 0
    _graphicManager = new OrthographicManager()
    _sun = new Sun({manager: this._graphicManager})

    _ctx
    _objs = []

    constructor(canvas) {
        canvas.width = this._width;
        canvas.height = this._height;

        let animation = this;
        canvas.onmousemove = function (e) {
            animation._graphicManager.move(e.offsetX, e.offsetY);
            return true;
        }

        this._ctx = canvas.getContext('2d');
        this._ctx.translate(this._width / 2, this._height / 2);

        this._ctx.textAlign = "center";
        this._ctx.textBaseline = "middle";

        this._objs.push(this._sun);
        if (DEBUG) this._objs.push(new Axes({manager: this._graphicManager}));
    }

    start() {
        requestAnimationFrame(this._proc.bind(this));
    }

    _proc() {
        this._draw();
        this._next(++this._count);
        this._graphicManager.keyMove();
        requestAnimationFrame(this._proc.bind(this));
    }

    _draw() {
        this._drawBackground();

        this._objs.sort((a, b) => a.getPriority() - b.getPriority());

        for (let obj of this._objs)
            obj.draw(this._ctx);
    }

    _drawBackground() {
        this._ctx.save();

        this._ctx.beginPath();
        this._ctx.fillStyle = "#222222";
        this._ctx.fillRect(-this._width / 2, -this._height / 2, this._width, this._height);

        this._ctx.restore();
    }

    _next(count) {
        for (let i = 0; i < this._objs.length; i++) {
            let obj = this._objs[i];
            obj.next(count);
            
            if (this._sun != obj && obj._pos != undefined && obj._pos.squareSize() <= (this._sun._r + obj._r) ** 2) {
                this._sun._r += 3;
                this._objs.splice(i--, 1);
            }
        }

        if (count % 200 == 0)
            this._objs.push(new Planet({manager: this._graphicManager, offset: this._sun._r}));
    }
}



class Planet {
    _alpha = "EE"
    _r = 20
    _g = 0.0002
    _pos = Vector.randVector(300, 400);
    _velocity = Planet.makeVelocity(this._pos, 5, 6);
    _color = `#${new Array(3).fill(0).map(_ => (255 - (0|Math.random() * 128)).toString(16).padStart(2, '0')).join('')}${this._alpha}`
    _graphicManager

    constructor(obj) { 
        if (!obj) return;

        this._graphicManager = obj.manager;
        if (obj.offset == undefined) obj.offset = 0;
        this._pos = Vector.randVector(300 + obj.offset, 400 + obj.offset);
    }

    draw(ctx) {
        let pos = this._graphicManager.projection(this._pos);
        let velocity = this._graphicManager.projection(this._velocity);

        ctx.save();

        ctx.fillStyle = this._color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(0.01, this._r + pos.z / 50), 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();

        if (DEBUG) {
            ctx.strokeStyle = "#FF00FF";
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            var v = velocity.resize(20);
            ctx.lineTo(pos.x + v.x, pos.y+ v.y);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = "#000000";
            if (pos.squareSize())
                ctx.fillText(0|Math.sqrt(pos.squareSize()), pos.x, pos.y);
            else
                ctx.fillText(this._r, pos.x, pos.y);
        }

        ctx.restore();
    }

    next(count) {
        this._pos = this._pos.plus(this._velocity);
        this._velocity = this._velocity.plus(this._pos.scalarProduct(-this._g));

        if (count % 10 == 0) {
            this._velocity = this._velocity.scalarProduct(0.99);
        }
    }

    getPriority() {
        return this._graphicManager.projection(this._pos).z;
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

        super._r = 20
        super._pos = new Vector(0, 0, 0);
        super._color = `#FFFFFF${this._alpha}`;
        super._velocity = new Vector(0, 0, 0);
    }

    next(count) {}

    getPriority() {
        return 0;
    }
}


class Axes {
    _graphicManager

    constructor(obj) { 
        if (!obj) return;

        this._graphicManager = obj.manager;
    }

    draw(ctx) {
        let size = 1000;
        let textsize = 100;

        ctx.save();

        ctx.strokeStyle = "#FF0000";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(1, 0, 0)).resize(size);
        ctx.moveTo(0, 0);
        ctx.lineTo(v.x, v.y);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(1, 0, 0)).resize(textsize);
        ctx.fillText("X", v.x, v.y);

        ctx.strokeStyle = "#00FF00";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(0, 1, 0)).resize(size);
        ctx.moveTo(0, 0);
        ctx.lineTo(v.x, v.y);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#FF00FF";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(0, 1, 0)).resize(textsize);
        ctx.fillText("Y", v.x, v.y);

        ctx.strokeStyle = "#0000FF";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(0, 0, 1)).resize(size);
        ctx.moveTo(0, 0);
        ctx.lineTo(v.x, v.y);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#FFFF00";
        ctx.beginPath();
        var v = this._graphicManager.projection(new Vector(0, 0, 1)).resize(textsize);
        ctx.fillText("Z", v.x, v.y);

        ctx.restore();
    }

    next() {}

    getPriority() {
        return 0;
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

            if (squareLength >= minr**2 && squareLength <= maxr**2)
                return new Vector(position[0], position[1], position[2]);
        }
    }
}



class OrthographicManager {
    _pre
    _th = Math.PI*3/2
    _pi = 0
    keyStat = {}

    constructor() {
        window.onkeydown = (e) => {this.keyStat[e.key] = true;};
        window.onkeyup = (e) => {this.keyStat[e.key] = false;};
    }

    move(x, y) {
        let [dx, dy] = [0, 0];

        if (this._pre != null) {
            dx = x - this._pre[0];
            dy = y - this._pre[1];
        }

        this._pre = [x, y];

        this._th -= dx / 200;
        this._pi += dy / 200;

        this.normalize();
    }

    keyMove() {
        let [dx, dy] = [0, 0];

        if (this.keyStat['w']) dy--;
        if (this.keyStat['a']) dx--;
        if (this.keyStat['s']) dy++;
        if (this.keyStat['d']) dx++;

        this._th -= dx / 200;
        this._pi += dy / 200;
        this.normalize();
    }

    normalize() {
        this._th = (this._th + 2 * Math.PI) % (2 * Math.PI);
        this._pi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._pi));
    }

    projection(v) {
        let sin = Math.sin;
        let cos = Math.cos;

        let s = -sin(this._th)*v.x + cos(this._th)*v.y;
        let t = sin(this._pi) * cos(this._th) * v.x + sin(this._pi) * sin(this._th) * v.y - cos(this._pi) * v.z;
        let u = cos(this._pi) * cos(this._th) * v.x + cos(this._pi) * sin(this._th) * v.y + sin(this._pi) * v.z;

        return new Vector(s, t, u);
    }
}