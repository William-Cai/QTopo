import { _ } from "../common";

//动态层
class Dynamic {
    constructor(dom) {
        Object.assign(this, {
            $canvas: dom,
            $context: dom.getContext('2d'),
            $paintAble: true,
            $children: {
                map: new Map(),
                index: []
            }
        });
    }

    //添加元素,根据zIndex排序,大的最后绘制
    add(...arr) {
        const { map, index } = this.$children;
        let zIndex;
        arr.forEach(element => {
            if (_.isElement(element) && _.notNull(element.$scene)) {
                zIndex = element.$style.zIndex;
                if (!map.has(zIndex)) {
                    map.set(zIndex, new Set());
                    index.push(zIndex);
                    index.sort((a, b) => a - b);
                }
                map.get(zIndex).add(element);
            }
        })
        return this;
    };

    remove(...arr) {
        const { map, index } = this.$children;
        let set, zIndex;
        arr.forEach(element => {
            if (this.has(element)) {
                zIndex = element.$style.zIndex;
                set = map.get(zIndex);
                set.delete(element);
                if (set.size === 0) {
                    map.delete(zIndex);
                    _.arraryDelete(index, zIndex);
                }
            }
        });
        return this;
    }

    clear() {
        this.$children.map.clear();
        this.$children.index = [];
        return this;
    }

    stop() {
        this.$paintAble = false;
        this.$context.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
    }

    start() {
        this.$paintAble = true;
    }

    has(element) {
        if (_.notNull(element) && _.notNull(element.$style)) {
            return _.notNull(this.$children.map.get(element.$style.zIndex)) && this.$children.map.get(element.$style.zIndex).has(element);
        }
        return false;
    }

    //调用元素的$paintDynamic执行绘制,传入动态层上下文
    $paint() {
        this.$context.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
        if (this.$paintAble) {
            this.$children.index.forEach(zIndex => {
                this.$children.map.get(zIndex).forEach(element => {
                    if (this.paintAble(element)) {
                        this.$context.save();
                        this.$context.scale(element.$scene.$style.scale, element.$scene.$style.scale);
                        this.$context.translate(...element.$scene.getTranslate());
                        element.$paintDynamic(this.$context);
                        this.$context.restore();
                    }
                });
            });
        }
    }

    paintAble(element) {
        return element.viewAble() && element.isInStage(this);
    };
}
export { Dynamic }