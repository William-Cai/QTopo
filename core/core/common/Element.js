import { _ } from "./util";
import { Base } from "./Base";
import { Style } from "./style";

//绘图基类
class Element extends Base {
    constructor() {
        super();
        Object.assign(this, {
            $outLinks: new Set(),
            $inLinks: new Set(),
            $scene: null
        });
        Object.assign(this.$state, {
            paintAble: true,
            selected: false,
            mouseOver: false
        });
        this.$style = Object.create(Style.Element);
    }
    //判断该元素是否在可视范围内
    isInStage() {
        console.error(this, "isInStage need overwrite!");
        return true;
    }

    //入参为坐标点数组,判断落点是否在该元素内
    isInBoundary() {
        console.error(this, "isInBoundary need overwrite!");
        return true;
    }

    //根据状态判断该元素的可见性
    viewAble() {
        return this.$state.paintAble && this.$style.visible;
    }

    //事件代理,处理事件发生时要设置的状态
    eventHandler(name, event) {
        switch (name) {
            case 'remove':
                this.$outLinks.forEach(link => this.$scene.remove(link));
                this.$outLinks.clear();
                this.$inLinks.forEach(link => this.$scene.remove(link));
                this.$inLinks.clear();
                this.$scene.getDynamic().remove(this);
                break;
            case 'selected':
                this.$state.selected = true;
                break;
            case 'unselected':
                this.$state.selected = false;
                break;
            case 'mouseover':
                this.$state.mouseOver = true;
                break;
            case 'mouseout':
                this.$state.mouseOver = false;
                break;
        }
        return super.eventHandler(name, event);
    }

    //在动态层上的绘制
    $paintDynamic() {
        console.error(this, "paintDynamic need overwrite!");
        return this;
    }

    //静态层绘制
    $paint(...arr) {
        return this.$paintShadow(...arr)
            .$paintSelected(...arr)
            .$paintMouseOver(...arr)
            .$paintView(...arr);
    }

    //绘制阴影
    $paintShadow(context) {
        if (this.$style.shadowBlur > 0) {
            context.shadowOffsetX = this.$style.shadowOffset[0];
            context.shadowOffsetY = this.$style.shadowOffset[1];
            context.shadowBlur = this.$style.shadowBlur;
            context.shadowColor = this.$style.shadowColor;
        }
        return this;
    }

    //绘制高亮状态
    $paintLighting(context) {
        context.shadowBlur = this.$style.lighting;
        context.shadowColor = this.$style.lightingColor;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        return this;
    }

    //绘制选中时的表现形式
    $paintSelected(...arr) {
        if (this.$state.selected) {
            return this.$paintLighting(...arr);
        }
        return this;
    }

    //绘制悬浮时的表现形式
    $paintMouseOver(...arr) {
        if (this.$state.mouseOver) {
            return this.$paintLighting(...arr);
        }
        return this;
    }

    //绘制一般展示
    $paintView() {
        console.error(this, "$paintView need overwrite!");
        return this;
    }
}
_.isElement = obj => obj instanceof Element;
export { Element }
