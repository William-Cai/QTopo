import { EventCtrl, Animate, _ } from "../common";
import { bindCanvas } from "./canvasEvent";
import { Scene } from "../scene/Scene";
import { Dynamic } from "./Dynamic";
import { EagleEye } from "./eagleEye";

const BREATH = _._breath();
class Stage extends EventCtrl {
    constructor(dom) {
        super();
        const { $static, $dynamic, $fps, stopResize, resize } = initDom(dom, this);
        if (!$static || !_.isFunction($static.getContext)) {
            throw new Error("can't create canvas, you may need use IE 9+ or chrome;");
        }
        const context = $static.getContext("2d");
        Object.assign(this, {
            $dom: dom,
            $context: context,//静态层上下文对象
            $canvas: $static,//静态层 canvas标签dom对象
            $dynamic: new Dynamic($dynamic),//动态层控制对象
            $background: {//背景参数寄存,用以导出图像api时合并背景
                src: "",
                color: ""
            },
            $breath: 0,//动画效果的呼吸参数值,每桢自动更新,方便元素动画计算
            $mouseDownPoint: [0, 0],//鼠标点击坐标
            $mouseDown: false,//鼠标是否点击上topo
            $scenes: new Set(),//图层集合
            $state: {
                showFps: false,//是否展示fps
                repaint: true,//是否清空重绘
                continue: false,//是否一直重绘,不根据repaint判断
                wheelAble: true//开启鼠标缩放
            },
            resize,//自适应计算宽高函数
            $current: null,//当前选中目标
            $loop: new Animate(() => this.$paint(context, $fps))//循环执行绘画函数,
        });

        this._off = bindCanvas(this, this.$dynamic.$canvas);//在canvas标签上绑定的事件解绑函数,用以销毁
        this._stopResize = stopResize;//解绑 在window上的 resize事件
        this.$eagleEye = new EagleEye(this);//鹰眼控制对象
        this.$loop.start();//开始循环绘画

    }

    //销毁实例
    destroy() {
        this._off();
        this._stopResize();
        this.$loop.stop();
        this.$dynamic.clear();
        this.clear();
        this.$dom.innerHTML = '';
        this.$dom = this.$context = this.$canvas = this.$dynamic = this.$background = this.$breath = this.useDownPoint = this.$scenes = this.$state = this.$loop = this.$current = null;
        return this;
    }

    //添加一个图层,并返回
    add() {
        let scene = new Scene(this);
        this.$scenes.add(scene);
        this.repaint();
        return scene;
    };

    //从topo中删除某一个图层,但并未销毁该图层,可以添加到别的topo对象内
    remove(scene) {
        this.$scenes.delete(scene);
        this.repaint();
        return this;
    }

    //清空图层
    clear() {
        this.$scenes.clear();
        this.repaint();
        return this;
    }

    //设置背景,并保存参数
    background(str) {
        if (_.notNull(str)) {
            let extStart = str.lastIndexOf(".");
            if (extStart > -1) {
                let ext = str.substring(extStart, str.length).toUpperCase();
                if (ext != ".BMP" || ext != ".PNG" || ext != ".GIF" || ext != ".JPG" || ext != ".JPEG") {
                    _.imageCache(str).then(data => {
                        Object.assign(this.$background, {
                            src: str,
                            data: data
                        });
                        Object.assign(this.$dom.style, {
                            'background-image': "url(" + str + ")",
                            'background-repeat': "no-repeat",
                            'background-size': "cover"
                        });
                    });
                }
            } else {
                Object.assign(this.$background, {
                    color: str,
                    src: null,
                    data: null
                });
                this.$dom.style['background-color'] = str;
            }
            return this;
        } else {
            if (_.notNull(this.$background.src)) {
                return this.$background.src
            } else {
                return this.$background.color;
            }
        }
    }

    //全局缩放
    zoom(scale) {
        this.$scenes.forEach(scene => scene.zoom(scale));
        return this;
    }

    //根据坐标点缩放
    _zoomByPoint(scale, event = {}) {
        this.$scenes.forEach(scene => scene._zoomByPoint(scale, event));
    }

    //获取视口大小
    size() {
        return [this.$canvas.width, this.$canvas.height];
    }

    //导出为图片格式
    getPicture(type, hasDynamic) {
        const canvas = _._canvas(),
            context = _._context();
        canvas.width = this.$canvas.width;
        canvas.height = this.$canvas.height;
        if (_.notNull(this.$background.src)) {
            context.drawImage(
                this.$background.data,
                0, 0,
                this.$canvas.width,
                this.$canvas.height
            );
        }
        else {
            context.fillStyle = this.$background.color;
            context.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
        }
        context.drawImage(this.$canvas, 0, 0);
        if (hasDynamic) {
            context.drawImage(this.$dynamic.$canvas, 0, 0);
        }
        // window.open().document.write("<img src='" + canvas.toDataURL(type) + "' alt='from QTopo'/>");
        return new Promise(function (res, rej) {
            const img = document.createElement("img");
            img.src = canvas.toDataURL(type);
            img.onload = function () {
                res(img);
            }
            img.onerror = function () {
                rej();
            }
        });
    };

    //在下一帧执行重绘
    repaint() {
        this.$state.repaint = true;
        return this;
    }

    //通知鹰眼重绘
    repaintEagle() {
        this.$eagleEye.updateImage();
        return this;
    }

    //手动触发事件
    trigger(name, data) {
        super.trigger(name, data);
        this.triggerScenes(name, data);
        return this;
    }

    //触发全部图层事件
    triggerScenes(name, data) {
        this.$scenes.forEach(scene => {
            if (scene.$style.visible) {
                scene.eventHandler(name, data);
            }
        })
        return this;
    }

    //循环绘制函数
    $paint(context, $fps) {
        this.$paintFps($fps)
            .$paintStatic(context)
            .$dynamic.$paint();
        this.$eagleEye.updateView();

        //dynamicValues
        //更新动画参数
        this.$breath = BREATH.next().value;
        return this;
    };

    //绘制静态层
    $paintStatic(context) {
        if (this.$state.repaint || this.$state.$continue) {
            context.clearRect(0, 0, ...this.size());
            context.save();
            this.$scenes.forEach(scene => scene.$style.visible && scene.$paint(context));
            context.restore();
            this.$state.repaint = false;
        }
        return this;
    }

    $paintFps($fps) {
        if (this.$state.showFps) {
            $fps();
        }
        return this;
    }

}
_.isStage = obj => obj instanceof Stage;
export { Stage }
//------------
function initDom(dom, stage) {
    const $static = createCanvas(dom),
        $dynamic = createCanvas(dom),
        $fps = createFps(dom);
    dom.style.position = 'relative';
    dom.style.overflow = 'hidden';
    dom.appendChild($static);
    dom.appendChild($dynamic);
    if (_.isIE || !window.addEventListener) {
        window.onresize = resize;
    } else {
        window.addEventListener("resize", resize);
    }
    return {
        $static,
        $dynamic,
        $fps,
        stopResize() {
            if (_.isIE || !window.addEventListener) {
                window.onresize = null;
            } else {
                window.removeEventListener("resize", resize);
            }
        },
        resize
    };

    function resize() {
        $static.$resize();
        $dynamic.$resize();
        stage.repaint();
    }
}
function createCanvas(dom) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
        background: 'none',
        'background-color': 'none',
        position: "absolute",
        top: 0,
        left: 0,
        padding: 0,
        border: "none",
        margin: 0,
        'user-select': 'none',
        '-webkit-tap-highlight-color': 'rgba(0, 0, 0, 0)'
    });
    canvas.$resize = () => {
        canvas.setAttribute('width', dom.offsetWidth);
        canvas.setAttribute('height', dom.offsetHeight);
    };
    canvas.$resize();
    return canvas;
}
function createFps(dom) {
    const fpsSpan = document.createElement('span');
    Object.assign(fpsSpan.style, {
        background: 'none',
        'background-color': 'none',
        position: "absolute",
        top: 0,
        left: 0,
        color: '#ffffff',
        'font-size': '16px',
        'user-select': 'none',
        '-webkit-tap-highlight-color': 'rgba(0, 0, 0, 0)'
    });
    dom.appendChild(fpsSpan);
    let fps = 0, offset, last = Date.now();
    return function (flag) {
        if (!flag) {
            offset = Date.now() - last;
            fps += 1;
            if (offset >= 1000) {
                last += offset;
                fpsSpan.innerHTML = fps;
                fps = 0;
            }
        } else {
            fpsSpan.innerHTML = '';
        }
    }
}