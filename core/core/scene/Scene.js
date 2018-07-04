import {
    _
} from "../common";
import {
    SceneTools
} from "./SceneTools";
class Scene extends SceneTools {
    constructor(stage) {
        super();
        Object.assign(this, {
            $stage: stage, //topo对象
            $style: {
                scale: 1, //当前缩放系数
                translate: [0, 0], //当前位移大小
                mode: _.MODE_EDIT, //当前操作模式
                visible: true, //是否图层可见
                zoomPadding: 0 //缩放边界预留大小
            },
            $mouseDown: null, //鼠标点击对象
            $mouseOver: null, //鼠标悬浮对象
            $current: null, //当前选中对象
            $selected: new Set(), //当前选中的对象集合
            $children: { //图层内所有元素
                map: new Map(),
                index: [],
                indexMap: {}
            },
            _areaSelect: null, //框选绘制函数
            _lastTranslate: [0, 0] //暂存上一次位移值,用以拖拽计算
        });
        Object.assign(this.$state, {
            mouseDown: false, //可点击
            draggable: true, //可拖拽
            dragging: false, //是否正在拖拽
            changedElement: false //是否增删过元素
        });
    }

    //将一般dom事件转化为topo事件对象,主要用以修改 触发的坐标以及触发的元素对象
    toSceneEvent(event) {
        const scale = this.$style.scale,
            [translateX, translateY] = this.getTranslate();
        const newEvent = _.cloneEvent(event);
        Object.assign(newEvent, {
            x: (event.x / scale) - translateX,
            y: (event.y / scale) - translateY,
            dragWidth: event.dragWidth / scale,
            dragHeight: event.dragHeight / scale,
            target: this.$current,
            scene: this
        });
        return newEvent;
    }

    //事件代理函数,针对不同dom事件做图层方面的处理
    eventHandler(name, event) {
        event = this.toSceneEvent(event);
        switch (name) {
            case "mousedown":
                mouseDown(this, event);
                break;
            case "mouseup":
                mouseUp(this, event);
                break;
            case "mousedrag":
                mouseDrag(this, event);
                break;
            case "mousemove":
                mouseMove(this, event);
                break;
            case "click":
                click(this, event);
                break;
            case "dblclick":
                dblClick(this, event);
                break;
        }
        this.repaint();
        return this.trigger(name, event);
    }

    //绘制一个图层
    $paint(context) {
        const origin = this.getTranslate(),
            {
                map,
                index
            } = this.$children;
        this.$style.mode === _.MODE_SELECT && _.notNull(this._areaSelect) && this._areaSelect(context);
        context.save();
        //位移和缩放
        context.scale(this.$style.scale, this.$style.scale);
        context.translate(...origin);
        //根据zIndex绘制,zIndex小的先绘制,大的后绘制,让zIndex大的覆盖小的图形
        index.forEach(zIndex => {
            map.get(zIndex).forEach(element => {
                //判断元素是否可绘制,主要判断元素是否在可视范围内,省去不必要的绘制
                if (this.paintAble(element)) {
                    context.save();
                    element.$paint(context);
                    context.restore();
                }
            });
        });
        context.restore();
        //如果有元素增删 需要根据这个参数刷新确定是否刷新鹰眼的背景
        this.$state.changedElement = false;
        return this;
    };

}
_.isScene = obj => obj instanceof Scene;
export {
    Scene
}
//------------------事件处理
function mouseDown(scene, event) {
    scene.$mouseDown = event;
    switch (scene.$style.mode) {
        //展示模式,不进行交互,保存当前位移系数,为拖拽做准备
        case _.MODE_SHOW:
            scene._lastTranslate = [...scene.$style.translate];
            break;
        case _.MODE_SELECT:
            selectElement(scene, event);
            break;
        default:
            selectElement(scene, event);
            scene._lastTranslate = [...scene.$style.translate];
    }
}
//若是框选状态,mouseup代表框选结束,则设为Null
function mouseUp(scene, event) {
    scene._areaSelect = null;
    let currentElement = scene.$current;
    if (_.notNull(currentElement)) {
        event.target = currentElement;
        currentElement.eventHandler("mouseup", event);
    }
}
//拖拽事件
function mouseDrag(scene, event) {
    switch (scene.$style.mode) {
        case _.MODE_SHOW:
            //移动图层
            dragScene(scene, event);
            break;
        case _.MODE_SELECT:
            if (_.notNull(scene.$current)) {
                if (scene.$current.$state.draggable) {
                    dragElements(scene, event)
                }
            } else {
                //无选中对象则为从空白处框选
                addAreaSelect(scene, event);
            }
            break;
        default:
            if (_.notNull(scene.$current) && scene.$current.$state.draggable) {
                dragElements(scene, event)
            } else {
                dragScene(scene, event);
            }
    }
}

function mouseMove(scene, event) {
    if (scene.$style.mode === _.MODE_SHOW) {
        return;
    }
    const mouseOverElement = scene.$mouseOver,
        currentElement = scene.searchPoint([event.x, event.y]);
    //根据上一次是否有选到对象模拟out over等事件
    if (_.notNull(currentElement)) {
        if (_.notNull(mouseOverElement) &&
            mouseOverElement !== currentElement) {
            mouseOverElement.eventHandler("mouseout", event);
        }
        scene.$mouseOver = currentElement;
        event.target = currentElement;
        if (currentElement.$state.mouseOver) {
            currentElement.eventHandler("mousemove", event);
        } else {
            currentElement.eventHandler("mouseover", event);
        }
    } else {
        if (_.notNull(mouseOverElement)) {
            event.target = mouseOverElement;
            mouseOverElement.eventHandler("mouseout", event);
            scene.$mouseOver = null;
        } else {
            event.target = null;
        }
    }
}

function click(scene, event) {
    if (_.notNull(scene.$current)) {
        event.target = scene.$current;
        scene.$current.eventHandler("click", event);
    }
}

function dblClick(scene, event) {
    if (_.notNull(scene.$current)) {
        event.target = scene.$current;
        scene.$current.eventHandler("dblclick", event);
    }
}
//-----------------工具
function addAreaSelect(scene, event) {
    let {
        map,
        indexMap
    } = scene.$children,
        mouseDownEvent = scene.$mouseDown,
        scale = scene.$style.scale,
        selected = scene.$selected, [dragX, dragY] = [event.offsetX, event.offsetY], [downX, downY] = [mouseDownEvent.offsetX, mouseDownEvent.offsetY], [beginX, beginY] = [dragX >= downX ? downX : dragX, dragY >= downY ? downY : dragY], [width, height] = [Math.abs(event.dragWidth) * scale, Math.abs(event.dragHeight) * scale];
    scene._areaSelect = (function (x, y, w, h) {
        return function (context) {
            context.beginPath();
            context.strokeStyle = "rgba(168,202,255, 0.5)";
            context.fillStyle = "rgba(168,202,255, 0.1)";
            context.rect(x, y, w, h);
            context.fill();
            context.stroke();
        }
    })(beginX, beginY, width, height);
    if (_.notNull(indexMap.node)) {
        [dragX, dragY] = [event.x, event.y];
        [downX, downY] = [mouseDownEvent.x, mouseDownEvent.y];
        [beginX, beginY] = [dragX >= downX ? downX : dragX, dragY >= downY ? downY : dragY];
        [width, height] = [Math.abs(event.dragWidth), Math.abs(event.dragHeight)];
        let [endX, endY] = [beginX + width, beginY + height];
        let [x, y, elWidth, elHieght] = [];
        indexMap.node.forEach((zIndex) => {
            map.get(zIndex).forEach((element) => {
                if (scene.paintAble(element)) {
                    [x, y] = element.$position;
                    [elWidth, elHieght] = element.$style.size;
                    if (x > beginX && x + elWidth < endX && y > beginY && y + elHieght < endY) {
                        if (!selected.has(element)) {
                            element.eventHandler("selected", event);
                            selected.add(element);
                        }
                    }
                }
            });
        });
    }
}

function dragElements(scene, event) {
    scene.$selected.forEach(element => {
        if (element.$state.draggable) {
            scene.$state.changedElement = true;
            const elEvent = _.cloneEvent(event);
            elEvent.target = element;
            element.eventHandler("mousedrag", elEvent);
        }
    });
}

function dragScene(scene, event) {
    if (scene.$state.draggable) {
        scene.$style.translate[0] = scene._lastTranslate[0] + event.dragWidth;
        scene.$style.translate[1] = scene._lastTranslate[1] + event.dragHeight;
    }
}

function selectElement(scene, event) {
    const element = scene.searchPoint([event.x, event.y]),
        selected = scene.$selected;
    if (_.notNull(element)) {
        event.target = element;
        element.eventHandler("mousedown", event);
        if (selected.has(element)) {
            if (event.ctrlKey) {
                element.eventHandler("unselected", event);
                selected.delete(element);
            }
            selected.forEach(el => el.eventHandler("selected", event));
        } else {
            if (!event.ctrlKey) {
                selected.forEach(element => element.eventHandler("unselected", event));
                selected.clear();
            }
            selected.add(element);
            element.eventHandler("selected", event);
        }
        if (_.isBox(element)) {
            const set = scene.$children.map.get(element.$style.zIndex);
            if (set) {
                set.delete(element);
                set.add(element); //点击置顶
            }
        }
    } else if (!event.ctrlKey) {
        selected.forEach(element => element.eventHandler("unselected", event));
        selected.clear();
    }
    scene.$current = element;
    scene.$stage.$current = element;
}