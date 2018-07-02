import { _ } from "../common";
class EagleEye {
    constructor(stage) {
        const dom = document.createElement('div'),
            background = document.createElement('canvas'),
            view = document.createElement('canvas');

        bindEvent(dom, stage, this);

        Object.assign(dom.style, {
            position: 'absolute',
            right: '1px',
            bottom: '1px',
            border: '1px solid white',
            'box-sizing': 'content-box'
        })
        Object.assign(background.style, {
            position: 'absolute',
            top: 0,
            left: 0
        })
        Object.assign(view.style, {
            position: 'absolute',
            top: 0,
            left: 0
        })
        Object.assign(this, {
            dom,
            ratio: 0.2,
            _updateing: false,
            _id: null,
            stage, background, view,
            bgCtx: background.getContext('2d'),
            viewCtx: view.getContext('2d'),
            viewInfo: [0, 0, 0, 0],
            visible: true,
            scale: 1,
            translate: [0, 0]
        });
        dom.appendChild(background);
        dom.appendChild(view);
        stage.$dom.appendChild(dom);
        this.resize();
    }

    updateImage() {
        if (this.visible) {
            clearTimeout(this._id);
            this._id = setTimeout(() => {
                this._updateing = true;
                const stage = this.stage,
                    ratio = this.ratio,
                    ctx = this.bgCtx,
                    canvas = this.background,
                    width = canvas.width,
                    height = canvas.height,
                    $background = stage.$background;

                ctx.clearRect(0, 0, width, height);
                ctx.save();
                if (_.notNull($background.src)) {
                    ctx.drawImage(
                        $background.data,
                        0, 0,
                        width,
                        height
                    );
                }
                else {
                    ctx.fillStyle = $background.color;
                    ctx.fillRect(0, 0, width, height);
                }

                let translate = [0, 0], scale;
                ctx.scale(ratio, ratio);
                stage.$scenes.forEach(scene => {
                    translate[0] = scene.$style.translate[0];
                    translate[1] = scene.$style.translate[1];
                    scale = scene.$style.scale;
                    scene.centerZoom();
                    scene.$paint(ctx);
                    this.scale = scene.$style.scale;
                    this.translate = scene.getTranslate();
                    scene.$style.scale = scale;
                    scene.$style.translate[0] = translate[0];
                    scene.$style.translate[1] = translate[1];
                });
                ctx.restore();
                this._updateing = false;
            }, 100);
        }
        return this;
    }

    updateView() {
        if (this.visible && !this._updateing) {
            const stage = this.stage,
                ratio = this.ratio,
                size = stage.size(),
                ctx = this.viewCtx,
                worldScale = this.scale,
                worldTranslate = this.translate,
                canvas = this.view;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.strokeStyle = "#ffffff";
            ctx.fillStyle = "#ffffff";
            ctx.lineWidth = 10 / worldScale;
            ctx.scale(ratio * worldScale, ratio * worldScale);
            ctx.translate(...worldTranslate);
            stage.$scenes.forEach(scene => {
                this.viewInfo = [...scene.getOrigin(), ...size.map(v => v / scene.$style.scale)];
                ctx.strokeRect(... this.viewInfo);
            });
            ctx.restore();
        }
        return this;
    }

    resize() {
        let stage = this.stage,
            dom = this.dom,
            background = this.background,
            view = this.view,
            ratio = this.ratio,
            [width, height] = stage.size();

        width *= ratio;
        height *= ratio;

        Object.assign(dom.style, {
            width: width + 'px',
            height: height + 'px'
        });

        Object.assign(background.style, {
            width: width + 'px',
            height: height + 'px'
        });
        background.width = width;
        background.height = height;

        Object.assign(view.style, {
            width: width + 'px',
            height: height + 'px'
        });
        view.width = width;
        view.height = height;
        return this;
    }

    show() {
        this.visible = ture;
        this.dom.style.display = 'block';
        return this;
    }

    hide() {
        this.visible = false;
        this.dom.style.display = 'none';
        return this;
    }

    _translate(x, y) {
        const ratio = this.ratio,
            worldScale = this.scale,
            worldTranslate = this.translate;
        return {
            x: x / worldScale / ratio - worldTranslate[0],
            y: y / worldScale / ratio - worldTranslate[1]
        }
    }

    _isOnView(x, y) {
        const info = this.viewInfo;
        return !(x < info[0] ||
            x > info[0] + info[2] ||
            y < info[1] ||
            y > info[1] + info[3]);
    }
}

export { EagleEye }

function bindEvent(dom, stage, eagle) {
    let isDown = false,
        mousedownPoint = {
            x: 0,
            y: 0
        };
    const EVENTS = {
        mousedown(event) {
            console.info(event);
            event = getPointOnEl(event);
            mousedownPoint = eagle._translate(event.x, event.y);
            stage.$scenes.forEach(scene => {
                scene._lastTranslate = [...scene.$style.translate];
                eagle._isOnView(mousedownPoint.x, mousedownPoint.y) && (isDown = true);
            });
        },
        mouseup(event) {
            isDown = false;
            stage.$dynamic.start();
        },
        mousemove(event) {
            event = getPointOnEl(event);
            if (isDown) {
                let point = eagle._translate(event.x, event.y);
                stage.$dynamic.stop();
                stage.$scenes.forEach(scene => {
                    scene.$style.translate[0] = scene._lastTranslate[0] - point.x + mousedownPoint.x;
                    scene.$style.translate[1] = scene._lastTranslate[1] - point.y + mousedownPoint.y;
                });
                stage.repaint();
            }
        },
        mousewheel(e) {
            const v = (null == e.wheelDelta ? -e.detail : e.wheelDelta) < 0 ? -0.8 : 0.8;
            stage.$state.wheelAble && stage.zoom(v);
        }
    }
    EVENTS.mouseleave = EVENTS.mouseup;
    _.each(EVENTS, (v, name) => dom.addEventListener(name, v));

    function getPointOnEl(e) {
        let x = 0, y = 0;
        if (_.isFirefox) {
            x = e.layerX;
            y = e.layerY;
        } else if (e.offsetX != null) {
            x = e.offsetX;
            y = e.offsetY;
        } else {
            var box = dom.getBoundingClientRect ? dom.getBoundingClientRect() : { left: 0, top: 0 };
            x = e.clientX - box.left;
            y = e.clientY - box.top;
        }
        return {
            x: x,
            y: y,
        }
    }

    function preventDefault(event) {
        if (event.preventDefault) {
            event.preventDefault();
        }
        else {
            event.returnValue = false;
        }
    }
}
