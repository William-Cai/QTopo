import {
    _
} from "../common";
//鹰眼控制对象
class EagleEye {
    constructor(stage) {
        const dom = document.createElement('div'),
            //背景图,只有在topo重绘后刷新
            background = document.createElement('canvas'),
            //视口框,实时刷新
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
            stage,
            background,
            view,
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

    //更新背景图片,图片应是topo的全览
    updateImage() {
        if (this.visible) {
            //函数节流,最后一次操作后更新
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
                //有背景画背景
                if (_.notNull($background.src)) {
                    ctx.drawImage(
                        $background.data,
                        0, 0,
                        width,
                        height
                    );
                } else {
                    ctx.fillStyle = $background.color;
                    ctx.fillRect(0, 0, width, height);
                }

                //缩放一次图层全览,绘制后还原
                let translate = [0, 0],
                    scale;
                ctx.scale(ratio, ratio);
                stage.$scenes.forEach(scene => {
                    //记录缩放前的参数
                    translate[0] = scene.$style.translate[0];
                    translate[1] = scene.$style.translate[1];
                    scale = scene.$style.scale;
                    //执行缩放全览函数
                    scene.centerZoom();
                    scene.$paint(ctx);
                    //记录下缩放后的相关参数,用以计算坐标系
                    this.scale = scene.$style.scale;
                    this.translate = scene.getTranslate();
                    //还原缩放参数
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

    //更新视口框
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
                ctx.strokeRect(...this.viewInfo);
            });
            ctx.restore();
        }
        return this;
    }

    //重新计算大小
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

    //将点击在dom上的坐标转化为鹰眼坐标系内的点
    _translate(x, y) {
        const ratio = this.ratio,
            worldScale = this.scale,
            worldTranslate = this.translate;
        return {
            x: x / worldScale / ratio - worldTranslate[0],
            y: y / worldScale / ratio - worldTranslate[1]
        }
    }

    //点击是否在视口框上
    _isOnView(x, y) {
        const info = this.viewInfo;
        return !(x < info[0] ||
            x > info[0] + info[2] ||
            y < info[1] ||
            y > info[1] + info[3]);
    }
}

export {
    EagleEye
}

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

    //浏览器兼容,获取鼠标相对dom左上角的坐标
    function getPointOnEl(e) {
        let x = 0,
            y = 0;
        if (_.isFirefox) {
            x = e.layerX;
            y = e.layerY;
        } else if (e.offsetX != null) {
            x = e.offsetX;
            y = e.offsetY;
        } else {
            var box = dom.getBoundingClientRect ? dom.getBoundingClientRect() : {
                left: 0,
                top: 0
            };
            x = e.clientX - box.left;
            y = e.clientY - box.top;
        }
        return {
            x: x,
            y: y,
        }
    }
}