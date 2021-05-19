// 当たり判定の基底クラス。
// このクラスを直接は使わない。
class Collider {
    constructor(type, x, y) {
        this._type = type;
        this.x = x;
        this.y = y;
    }

    get type() { return this._type; }
}

// 矩形（四角形）の当たり判定。
// 今回はこれだけを使う。
class RectangleCollider extends Collider {
    constructor(x, y, width, height) {
        super('rectangle', x, y);
        this.width = width;
        this.height = height;
    }

    // 位置の平行移動。
    // ローカル空間からグローバル空間への変換に使う。
    translate(dx, dy) {
        return new RectangleCollider(this.x + dx, this.y + dy, this.width, this.height);
    }

    // 各種getter。
    // なくてもいいが、あったほうが楽。
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }
    get left() { return this.x; }
    get right() { return this.x + this.width; }
}

// Actor（役者）クラス。
// これを継承したオブジェクトが
// 実際のゲームオブジェクトとなる。
class Actor {
    constructor(option = { collider: null }) {
        this.x = 0;
        this.y = 0;
        this._collider = option.collider;
    }

    // フレームごとに状態を更新するためのメソッド。
    // ここでは実装せず、子クラス側で実装する。
    update(info) { }

    // グラフィックをレンダリングするメソッド。
    // 子クラス側で実装する。
    // canvasのコンテキストを受け取る。
    render(context) { }

    // 他のオブジェクトに衝突したときのメソッド。
    // 子クラス側で実装する。
    // 本来はメソッドにするよりも、もう少し回りくどい方法を
    // 取るべきだが、ここでは簡単のためこうしている。
    hit(other) { }

    get collider() { return this._collider; }

    // 今回、当たり判定はActorからの相対位置で
    // 配置するので、実際の当たり判定時には
    // グローバルな位置を取得する必要がある。
    // そのためのgetter。
    get globalCollider() {
        return this._collider.translate(this.x, this.y)
    }
}

// 今回使用する具体的なオブジェクト。
// 単純な四角形のActor。
class RectangleActor extends Actor {
    constructor(x, y, width, height) {
        // 当たり判定はActorからの相対位置なので、
        // Actorと当たり判定が同じ位置の場合、xとyは0。
        const collider = new RectangleCollider(0, 0, width, height);
        super({ collider });

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this._color = 'rgb(0, 0, 0)';

        // 移動速度。ランダム。
        this._vx = Math.random() * 10 - 5;
        this._vy = Math.random() * 10 - 5;
    }

    // 更新メソッド。
    update(info) {
        this._color = 'rgb(0, 0, 0)';

        // 速度分だけ移動する。
        this.x += this._vx;
        this.y += this._vy;

        // 画面から外れたら、速度を反転する。
        if (this.x < 0 || this.x > info.world.width) {
            this._vx = -this._vx;
        }

        if (this.y < 0 || this.y > info.world.height) {
            this._vy = -this._vy;
        }
    }

    // 描画メソッド。
    render(context) {
        context.fillStyle = this._color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }

    // 衝突メソッド
    hit(other) {
        this._color = 'rgb(255, 0, 0)';
    }
}

// 当たり判定の検出器。
class CollisionDetector {
    // 当たり判定を検出する。
    detectCollision(actor1, actor2) {
        const c1 = actor1.globalCollider;
        const c2 = actor2.globalCollider;

        if (c1.type == 'rectangle' && c2.type == 'rectangle') {
            return this.detectRectangleCollision(c1, c2);
        }

        return false;
    }

    // 矩形同士の当たり判定を検出する。
    detectRectangleCollision(rect1, rect2) {
        const horizontal = (rect2.left < rect1.right) && (rect1.left < rect2.right);
        const vertical = (rect2.top < rect1.bottom) && (rect1.top < rect2.bottom);

        return (horizontal && vertical);
    }
}

// Actorが配置される世界。
class World {
    constructor(width, height) {
        this._width = width;
        this._height = height;

        // 配置されているActor一覧。
        this._actors = [];

        this._detector = new CollisionDetector();
    }

    // 世界にActorを配置する。
    addActor(actor) {
        this._actors.push(actor);
    }

    // 更新メソッド。Actorのupdateとは別。
    update() {
        const info = {
            world: {
                width: this._width,
                height: this._height
            }
        };

        // 各Actorをupdateする。
        this._actors.forEach((a) => {
            a.update(info);
        });

        // 各Actorの当たり判定を取る。
        this._hitTest();
    }

    // 当たり判定を取る。
    // 全てのパターンの総当たり。
    _hitTest() {
        const length = this._actors.length;

        for (let i = 0; i < length - 1; i++) {
            for (let j = i + 1; j < length; j++) {
                const a1 = this._actors[i];
                const a2 = this._actors[j];
                const hit = this._detector.detectCollision(a1, a2)

                if (hit) {
                    a1.hit(a2);
                    a2.hit(a1);
                }
            }
        }
    }

    // レンダリング。
    render(context) {
        this._actors.forEach((a) => {
            a.render(context);
        });
    }
}

// Worldを作る。サイズは500x500ぐらいで。
const worldSize = 500;
const world = new World(worldSize, worldSize);

// Wolrd内にRectangleActorをランダム配置。
const actors = 1000;
for (let i = 0; i < actors; i++) {
    const x = Math.random() * worldSize;
    const y = Math.random() * worldSize;
    const rect = new RectangleActor(x, y, 10, 10);
    world.addActor(rect);
}

// canvasの設置。
const canvas = document.createElement('canvas');
canvas.width = worldSize;
canvas.height = worldSize;
const context = canvas.getContext('2d');
document.body.appendChild(canvas);

// 時間表示の設置。
const timeCounter = document.createElement('div');
document.body.appendChild(timeCounter);

// メインループ。
function loop(timestamp) {
    // update()にかかる時間を測る。
    const start = performance.now();
    world.update();
    const end = performance.now();
    const timeStr = (end - start).toPrecision(4);
    timeCounter.innerText = `${timeStr}ms`;

    // 一度まっさらにしてからレンダリング。
    context.clearRect(0, 0, worldSize, worldSize);
    world.render(context);

    // 次のフレームを要求する。
    requestAnimationFrame((timestamp) => loop(timestamp));
}

// アニメーションを開始する。
requestAnimationFrame((timestamp) => loop(timestamp));
