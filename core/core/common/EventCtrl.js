import { _ } from "./util";
//事件处理基类
class EventCtrl {
    constructor() {
        this._event = new Map();
    }

    on(name, fn) {
        name.split(" ")
            .forEach(eventName => {
                if (!this._event.has(eventName)) {
                    this._event.set(eventName, new Set());
                }
                if (_.isFunction(fn)) {
                    this._event.get(eventName).add(fn);
                }
            });
        return this;
    };

    off(name, fn) {
        name.split(" ")
            .forEach(eventName => {
                if (this._event.has(eventName)) {
                    if (_.notNull(fn)) {
                        this._event.get(eventName).delete(fn);
                    } else {
                        this._event.get(eventName).clear();
                    }
                }
            });
        return this;
    };

    trigger(name, data) {
        name.split(" ")
            .forEach(eventName => {
                if (this._event.has(eventName)) {
                    this._event.get(eventName).forEach(fn => _.isFunction(fn) && fn(data));
                }
            });
        return this;
    };

    //事件代理函数,防止被off解绑的事件应在此处预先定义
    eventHandler(name, event) {
        return this.trigger(name, event);
    }
}
['click', 'dblclick', 'mousemove', 'mouseout', 'mouseover', 'mousedown', 'mouseup', 'mousewheel']
    .forEach(eventName => {
        EventCtrl.prototype[eventName] = function (fn, data) {
            if (_.isFunction(fn)) {
                this.on(eventName, fn);
            } else {
                this.eventHandler(eventName, data);
            }
        }
    });

export { EventCtrl }