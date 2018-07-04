import { Base, _ } from "../common";
import * as core from "../constructor";
//图层工具类
//包含根据配置添加元素的api等
class SceneTools extends Base {
    constructor() {
        super();
    }

    static getType(element) {
        let type = "other";
        if (_.isNode(element)) {
            type = "node";
        } else if (_.isLink(element)) {
            type = "link";
        } else if (_.isGroup(element)) {
            type = "group";
        } else if (_.isPath(element)) {
            type = "path";
        }
        return type;
    }

    //添加元素对象,根据zindex记录在map内方便查找
    add(...arr) {
        const { map, index, indexMap } = this.$children;
        let zIndex, elementType;
        arr.forEach(element => {
            if (_.isElement(element) && !this.has(element)) {
                if (_.notNull(element.$scene)) {
                    element.$scene.remove(element);
                }
                zIndex = element.$style.zIndex;
                if (!map.has(zIndex)) {
                    map.set(zIndex, new Set());
                    elementType = SceneTools.getType(element);
                    if (!_.notNull(indexMap[elementType])) {
                        indexMap[elementType] = [];
                    }
                    indexMap[elementType].push(zIndex);
                    index.push(zIndex);
                    index.sort((a, b) => a - b);
                }
                map.get(zIndex).add(element);
                element.$scene = this;
            }
        });
        //如果有元素增删 需要根据这个参数刷新确定是否刷新鹰眼的背景
        this.$state.changedElement = true;
        this.repaint();
        return this;
    };

    //删除元素对象,同时更新map
    remove(...arr) {
        const { map, index, indexMap } = this.$children;
        let set, zIndex, elementType;
        arr.forEach(element => {
            if (this.has(element)) {
                zIndex = element.$style.zIndex;
                set = map.get(zIndex);
                set.delete(element);
                element.eventHandler("remove", this);
                element.$scene = null;
                if (set.size === 0) {
                    elementType = SceneTools.getType(element);
                    map.delete(zIndex);
                    _.arraryDelete(index, zIndex);
                    _.arraryDelete(indexMap[elementType], zIndex);
                }
            }
        });
        this.repaint();
        return this;
    };

    clear() {
        let children = this.$children;
        children.map.forEach(elementSet => {
            elementSet.forEach(element => {
                element.eventHandler("remove", this);
                element.$scene = null;
            });
        });
        children.map.clear();
        children.index = [];
        children.indexMap = {};
        this.repaint();
        return this;
    }

    //计数图层内各种元素的数目
    total() {
        let [node, path, group, link] = [0, 0, 0, 0];
        this.$children.map.forEach(set => {
            set.forEach(element => {
                if (_.isNode(element)) {
                    node++;
                }
                if (_.isGroup(element)) {
                    group++;
                }
                if (_.isPath(element)) {
                    path++;
                }
                if (_.isLink(element)) {
                    link++;
                }
            });
        });
        return { node, path, group, link };
    }

    //切换操作模式
    mode(mode) {
        if (mode) {
            this.$style.mode = mode;
            return this;
        }
        return this.$style.mode;
    }

    //遍历所有元素,图层移至所有元素中心点
    //有坐标参数则以坐标参数为图层中心点
    center(position) {
        const size = this.$stage.size();
        if (_.isArray(position)) {
            this.$style.translate = [-(position[0] - size[0] / 2), -(position[1] - size[1] / 2)];
        } else {
            const elements = this.$children.map;
            if (elements.size > 0) {
                const { left, right, top, bottom } = this.getBoundary(elements);
                this.$style.translate = [size[0] / 2 - (left + right) / 2, size[1] / 2 - (top + bottom) / 2];
                this.repaint();
            }
        }
        return this;
    }

    //缩放以及位移图层,一图展示所有元素
    centerZoom() {
        const elements = this.$children.map;
        if (elements.size > 0) {
            const [stageWidth, stageHeight] = this.$stage.size(),
                { left, right, top, bottom, width, height } = this.getBoundary(elements),
                scale = Math.min(stageWidth / width, stageHeight / height);
            this.$style.translate = [stageWidth / 2 - (left + right) / 2, stageHeight / 2 - (top + bottom) / 2];
            if (scale > 1) return this;
            this.$style.scale = scale;
            this.repaint();
            return this;
        }
        return this;
    }

    //是否包含某元素
    has(element) {
        return element.$scene === this && this.$children.map.get(element.$style.zIndex).has(element);
    }

    //根据类型或遍历全部元素,返回集合
    map(fn, type) {
        if (_.isFunction(fn)) {
            let { map, index, indexMap } = this.$children;
            let result, results = [];
            if (_.notNull(type)) {
                type = indexMap[type];
            } else {
                type = index;
            }
            if (_.isArray(type)) {
                for (let zIndex of type) {
                    for (let element of map.get(zIndex)) {
                        result = fn(element);
                        if (result === false) {
                            break;
                        } else {
                            results.push(result);
                        }
                    }
                }
            }
            return results;
        }
    }

    //查找满足某一条件的元素
    search(fn) {
        let result = [];
        if (_.isFunction(fn)) {
            this.$children.map.forEach((elements) => {
                result = [...elements].filter(child => fn(child)).concat(result);
            });
        }
        return result;
    };

    //根据类型或在全部元素中查找zIndex最大的包含指定坐标的元素
    searchPoint([x, y], type) {
        let { index, map, indexMap } = this.$children;
        let zIndex, elements, element;
        if (type) {
            index = indexMap[type];
            if (!index) {
                return null;
            }
        }
        for (let i = index.length - 1; i >= 0; i--) {
            zIndex = index[i];
            elements = [...map.get(zIndex)];
            for (let j = elements.length - 1; j >= 0; j--) {
                element = elements[j];
                if (this.paintAble(element) && element.isInBoundary([x, y])) {
                    return element;
                }
            }
        }

        return null;
    };

    //图层以入参元素为中心
    moveToNode(node) {
        // 查询到的节点居中显示
        if (this.has(node)) {
            this.$style.scale = 1;
            this.center(node.$position);
            if (node.$group && _.isFunction(node.$group.toggle)) {
                node.$group.toggle(true);
            }
            nodeFlash(node, 5, this);
            function nodeFlash(node, num, scene) {
                if (_.isNumeric(num)) {
                    if (num === 0) {
                        node.$state.selected = false;
                    } else {
                        node.$state.selected = !node.$state.selected;
                        setTimeout(function () {
                            nodeFlash(node, num - 1, scene);
                        }, 300);
                    }
                }
                scene.repaint();
            }
        }
    };

    //图层以入参直线的中点为中心
    moveToDirectLinK(link) {
        if (link instanceof core.DirectLink && this.has(link)) {
            const [stageWidth, stageHeight] = this.$stage.size(),
                from = link.$path[0].$position,
                to = link.$path[1].$position,
                center = [
                    (from[0] + to[0]) / 2,
                    (from[1] + to[1]) / 2,
                ],
                size = [
                    from[0] - to[0],
                    from[1] - to[1]
                ].map(Math.abs);

            this.$style.scale = Math.min(stageWidth / size[0], stageHeight / size[1]) * 0.6;
            this.center(center);

            flash(link, 5, this);
            function flash(node, num, scene) {
                if (num === 0) {
                    node.$state.selected = false;
                } else {
                    node.$state.selected = !node.$state.selected;
                    setTimeout(function () {
                        flash(node, num - 1, scene);
                    }, 500);
                }
                scene.repaint();
            }
        }
    }

    //以图层中心缩放
    zoom(scale) {
        if (scale > 0) {
            this.$style.scale = this.$style.scale / scale;
        } else if (scale < 0) {
            this.$style.scale = this.$style.scale * -scale;
        } else {
            this.$style.scale = 1;
        }
        this.repaint();
        return this;
    }

    //在指定坐标点处缩放
    _zoomByPoint(scale, point) {
        if (point) {
            const toCenter = this.transIn(point.x, point.y);
            this.center(toCenter).zoom(scale);
            const pointNow = this.transIn(point.x, point.y),
                newCenter = [
                    2 * toCenter[0] - pointNow[0],
                    2 * toCenter[1] - pointNow[1]
                ];

            this.center(newCenter);
        }
        return this;
    }

    //将dom上以左上角为0,0原点的坐标点转化为图层内部坐标
    transIn(x, y) {
        const scale = this.$style.scale,
            [translateX, translateY] = this.getTranslate();
        return [
            (x / scale) - translateX,
            (y / scale) - translateY
        ];
    }

    //将图层内部坐标转化为以dom左上角为原点的坐标
    transOut(x, y) {
        const scale = this.$style.scale,
            [translateX, translateY] = this.getTranslate();
        return [
            (x + translateX) * scale,
            (y + translateY) * scale
        ];
    }

    //获取动态层
    getDynamic() {
        return this.$stage.$dynamic;
    }

    //执行重绘图层
    repaint() {
        const stage = this.$stage,
            state = this.$state;
        stage.repaint();
        //如果有元素增删 需要根据这个参数刷新确定是否刷新鹰眼的背景
        state.changedElement && stage.repaintEagle();
        return this;
    }

    //计算视口边界在图层内对应的坐标点
    getStageBoundary() {
        const scale = this.$style.scale,
            stageSize = this.$stage.size(),
            translate = this.$style.translate,
            centerX = stageSize[0] / scale / 2,
            centerY = stageSize[1] / scale / 2;

        return {
            left: -parseInt(centerX * (1 - scale) + translate[0]),
            top: -parseInt(centerY * (1 - scale) + translate[1]),
            right: parseInt(centerX * (1 + scale) - translate[0]),
            bottom: parseInt(centerY * (1 + scale) - translate[1])
        };
    }

    //遍历所以元素,获取图层边界坐标点
    getBoundary(map = this.$children.map) {
        let bound = {
            left: Number.MAX_VALUE,
            right: Number.MIN_VALUE,
            top: Number.MAX_VALUE,
            bottom: Number.MIN_VALUE
        }, padding = this.$style.zoomPadding;
        map.forEach(elements => {
            elements.forEach(element => {
                if (!_.isLink(element)) {
                    let { left, top, right, bottom } = element.getBoundary();
                    if (bound.left > left) {
                        bound.left = left;
                        bound.leftElement = element;
                    }
                    if (bound.right < right) {
                        bound.right = right;
                        bound.rightElement = element;
                    }
                    if (bound.top > top) {
                        bound.top = top;
                        bound.topElement = element;
                    }
                    if (bound.bottom < bottom) {
                        bound.bottom = bottom;
                        bound.bottomElement = element;
                    }
                }
            })
        });
        bound.left -= padding;
        bound.right += padding;
        bound.top -= padding;
        bound.bottom += padding;
        bound.width = bound.right - bound.left;
        bound.height = bound.bottom - bound.top;
        return bound;
    }

    //获取视口大小
    getStageSize() {
        return this.$stage.size();
    }

    //获取当前视口左上角对应的图层坐标点
    getOrigin() {
        return this.getTranslate().map(i => -i);
    }

    //获取图层距离原点0,0的距离
    getTranslate() {
        const stageSize = this.$stage.size();
        return [this.$style.translate[0] + stageSize[0] / this.$style.scale / 2 * (1 - this.$style.scale), this.$style.translate[1] + stageSize[1] / this.$style.scale / 2 * (1 - this.$style.scale)];
    }

    //判断元素是否可以绘制
    paintAble(element) {
        return element.viewAble() && element.isInStage(this);
    };

    //到出json字符串
    toJson() {
        const json = super.toJson();
        let type;
        json.elements = {};
        this.$children.map.forEach(set => set.forEach(el => {
            type = SceneTools.getType(el);
            if (!_.notNull(json.elements[type])) {
                json.elements[type] = [];
            }
            json.elements[type].push(el.toJson());
        }));
        return json;
    }

    //根据json字符串绘制图层
    addByJson(json) {
        if (json) {
            this.set(json);
            const elements = json.elements;
            if (_.notNull(elements)) {
                this.addNodes(elements.node).addPaths(elements.path).addGroups(elements.group).addLinks(elements.link);
            }
        }
        return this;
    }

    //根据配置添加节点
    //无参 或 {type:'ImageNode',style:{},state:{},data:{}} 或 "ImageNode" 都可
    addNode(type) {
        let node, checked = check(type, "ImageNode", "Node");
        if (checked !== false) {
            node = new core[checked.type];
            this.add(node);
            node.set(checked.config);
        }
        return node;
    }

    addPath(type) {
        let line = new core.Path;
        this.add(line);
        line.set(type);
        return line;
    }

    addGroup(config) {
        let group
        group = new core.Group;
        this.add(group);
        if (config) {
            if (_.notNull(config.api)) {
                if (_.isArray(config.api.position)) {
                    group.$position[0] = config.api.position[0];
                    group.$position[1] = config.api.position[1];
                    delete config.api.position;
                }
                if (_.isArray(config.api.add)) {
                    const childrenIds = config.api.add;
                    config.api.add = this.search(el => childrenIds.includes(el.$id));
                }
            }
            group.set(config);
        }
        return group;
    }

    addLink(type) {
        let link, startId, endId, checked = check(type, "DirectLink", "Link");
        if (checked !== false) {
            if (_.isString(type) || !_.notNull(type)) {
                link = new core[checked.type]();
                this.add(link);
            } else {
                let config = checked.config;
                if (config.api && _.isArray(config.api.path)) {
                    startId = config.api.path[0];
                    endId = config.api.path[1];
                    this.map(el => {
                        if (el.$id === startId) {
                            config.api.path[0] = el;
                        }
                        if (el.$id === endId) {
                            config.api.path[1] = el;
                        }
                        if (_.isElement(config.api.path[0]) && _.isElement(config.api.path[1])) {
                            return false;
                        }
                    });
                }
                if (_.isElement(config.api.path[0]) && _.isElement(config.api.path[1])) {
                    link = new core[checked.type]();
                    this.add(link);
                    link.set(config);
                } else {
                    console.error("not create Link,error in path", config.api.path);
                }
            }
        }
        return link;
    }

    addNodes(json) {
        if (_.isArray(json)) {
            json.forEach(config => this.addNode(config));
        }
        return this;
    }

    addPaths(json) {
        if (_.isArray(json)) {
            json.forEach(config => this.addPath(config));
        }
        return this;
    }

    addGroups(json) {
        if (_.isArray(json)) {
            json.forEach(config => this.addGroup(config));
        }
        return this;
    }

    addLinks(json) {
        if (_.isArray(json)) {
            json.forEach(config => this.addLink(config));
        }
        return this;
    }

}
export { SceneTools }
//过滤配置对象,获取要画的类型以及真实配置参数
function check(json, defCons, BaseName) {
    let type = defCons, config = {};
    if (_.isString(json)) {
        json = _.upFirst(json) + BaseName;
        if (_.notNull(core[json])) {
            type = json;
        } else {
            return false;
        }
    } else if (_.isObject(json) && _.notNull(core[json.type])) {
        type = json.type;
        config = json;
    }
    return {
        type,
        config
    }
}