import { _ } from "../common";
import GestureMgr from "./GestureMgr";
const notWebKit = !window.addEventListener,
    filterName = _.isFirefox ? name => name == "mousewheel" || name == "onmousewheel" ? "DOMMouseScroll" : name : name => name,
    getName = notWebKit ? name => filterName('on' + name) : name => filterName(name),
    on = notWebKit ? (el, name, fn) => el.attachEvent(getName(name), fn) : (el, name, fn) => el.addEventListener(getName(name), fn),
    off = notWebKit ? (el, name, fn) => el.detachEvent(getName(name), fn) : (el, name, fn) => el.removeEventListener(getName(name), fn);

//代理canvas标签上的所有相关事件
//部分事件控制动静态层的绘制
export let bindCanvas = function (stage, canvas) {

    const gestureApply = new GestureMgr(),
        TOUCH_CLICK_DELAY = 300,
        nomalEvent = name => event => stage.trigger(name, getEventObject(event)),
        EVENTS = {
            click: nomalEvent("click"),
            dblclick: nomalEvent("dblclick"),
            mouseover: nomalEvent("mouseover"),
            mouseout: nomalEvent("mouseout"),
            keydown, keyup, mousedown, mouseup, mousemove, mousewheel,
            touchstart, touchend, touchmove
        };

    gestureApply.getPosition = getPointOnEl;
    gestureApply.events.pinch = pinch;
    let _lastTouchMoment, _clickTimes = 0, lastGestScale = null;

    document.oncontextmenu = e => false;

    _.each(EVENTS, (v, name) => on(canvas, name, v));
    return function () {
        _.each(EVENTS, (v, name) => off(canvas, name, v));
    }

    function keydown(event) {
        stage.trigger("keydown", _.cloneEvent(event));
        const keyCode = event.keyCode;
        if (37 == keyCode || 38 == keyCode || 39 == keyCode || 40 == keyCode) {
            if (event.preventDefault) {
                event.preventDefault()
            } else {
                event = event || window.event;
                event.returnValue = !1;
            }
        }
    }

    function keyup(event) {
        stage.trigger("keyup", _.cloneEvent(event));
        const keyCode = event.keyCode;
        if (37 == keyCode || 38 == keyCode || 39 == keyCode || 40 == keyCode) {
            if (event.preventDefault) {
                event.preventDefault()
            } else {
                event = event || window.event;
                event.returnValue = !1;
            }
        }
    }

    function mousedown(event) {
        event = getEventObject(event);
        stage.$mouseDownPoint = [event.x, event.y];
        stage.$mouseDown = true;
        stage.trigger("mousedown", event);
    }

    function mouseup(event) {
        event = getEventObject(event);
        stage.$mouseDown = false;
        stage.trigger("mouseup", event);
        stage.$dynamic.start();
    }

    function mousemove(event) {
        event = getEventObject(event);
        if (stage.$mouseDown) {
            stage.$dynamic.stop();
            const [mouseDownX, mouseDownY] = stage.$mouseDownPoint;
            event.dragWidth = event.x - mouseDownX;
            event.dragHeight = event.y - mouseDownY;
            stage.trigger("mousedrag", event);
        } else {
            stage.trigger("mousemove", event);
        }
    }

    function mousewheel(e) {
        preventDefault(e);
        const event = getEventObject(e);
        stage.trigger("mousewheel", event);
        scaleStage(
            (null == e.wheelDelta ? -e.detail : e.wheelDelta) < 0,
            e.ctrlKey ? event : null
        );
    }

    function scaleStage(dir, point, num = 0.8) {
        //true缩小 false放大
        const v = dir ? -1 * num : num;
        if (stage.$state.wheelAble) {
            if (point) {
                stage._zoomByPoint(v, point);
            } else {
                stage.zoom(v);
            }
        }
    }

    //--------移动端
    function touchstart(e) {
        processGesture(e, 'start');
        _lastTouchMoment = new Date();
        EVENTS.mousedown(getEventObjectOnPhone(e));
    }
    function touchend(e) {
        lastGestScale = null;
        processGesture(e, 'end');
        let event = getEventObjectOnPhone(e);
        mouseup(event);
        var timeGap = +new Date() - _lastTouchMoment;
        if (timeGap < TOUCH_CLICK_DELAY) {
            EVENTS.click(event);
            _clickTimes++;
            if (_clickTimes > 1) {
                EVENTS.dblclick(event);
                _clickTimes = 0;
            }
        } else {
            _clickTimes = 0;
        }
    }
    function touchmove(e) {
        processGesture(e, 'change');
        if (e.targetTouches.length == 1) {
            EVENTS.mousemove(getEventObjectOnPhone(e));
        }
    }
    function pinch(info) {
        const e = info.event;
        if (!lastGestScale) {
            lastGestScale = e.scale;
        }
        if (lastGestScale != e.scale) {
            scaleStage(lastGestScale > e.scale, {
                x: e.pinchX,
                y: e.pinchY
            },0.95);
        }
    }
    //-----
    function processGesture(event, stage) {
        stage === 'start' && gestureApply.clear();
        gestureApply.recognize(event, canvas);
        stage === 'end' && gestureApply.clear();
    }
    //-----
    function getEventObject(event) {
        const e = _.cloneEvent(event);
        e.target = stage.$current;
        Object.assign(e, getPointOnEl(e));
        return e;
    }
    function getPointOnEl(e) {
        let x = 0, y = 0;
        if (_.isFirefox) {
            x = e.layerX;
            y = e.layerY;
        } else if (e.offsetX != null) {
            x = e.offsetX;
            y = e.offsetY;
        } else {
            var box = getBoundingClientRect(canvas);
            x = e.clientX - box.left;
            y = e.clientY - box.top;
        }
        return {
            x, y
        }
    }
};


function getBoundingClientRect(el) {
    // BlackBerry 5, iOS 3 (original iPhone) don't have getBoundingRect
    return el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
}
function getEventObjectOnPhone(e) {
    preventDefault(e);
    stopPropagation(e);
    return e.type != 'touchend'
        ? e.targetTouches[0]
        : e.changedTouches[0];
}
function stopPropagation(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    else {
        event.cancelBubble = true;
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