import {
    Element
} from "./Element";
import {
    _
} from "./util";
import {
    Style
} from "./style";

//盒子模型 一般元素的基类
class Box extends Element {
    constructor() {
        super();
        Object.assign(this, {
            $position: [0, 0], //元素当前位置
            _position: [0, 0] //暂存元素位置,为了拖拽元素
        });
        Object.assign(this.$state, {
            draggable: true
        });
        this.$style = Object.create(Style.Box);
    }

    //模仿css定位做的简易api位置设置,相对于视口坐标设定位置
    absolute(css) {
        const [ox, oy] = this.$scene.getOrigin();
        let [sWidth, sHeight] = this.$scene.getStageSize();
        sWidth /= this.$scene.$style.scale;
        sHeight /= this.$scene.$style.scale;

        if (_.notNull(css.left) && _.notNull(css.right)) {
            const _right = _.offset(css.right, sWidth),
                _left = _.offset(css.left, sWidth),
                _width = sWidth - _right - _left;
            if (_width > 0) {
                this.$position[0] = ox + _left + sWidth / 2;
                this.$style.size[0] = _width - this.$style.borderWidth * 2;
            } else {
                this.$position[0] = ox + sWidth / 2;
                this.$style.size[0] = sWidth - this.$style.borderWidth * 2;
            }
        } else if (_.notNull(css.left)) {
            this.$position[0] = ox + _.offset(css.left, sWidth) + this.$style.size[0] / 2 + this.$style.borderWidth;
        } else if (_.notNull(css.right)) {
            this.$position[0] = ox + sWidth - _.offset(css.right, sWidth) - this.$style.size[0] / 2 - this.$style.borderWidth;
        }

        if (_.notNull(css.top) && _.notNull(css.bottom)) {
            const _top = _.offset(css.top, sHeight),
                _bottom = _.offset(css.bottom, sHeight),
                _height = sHeight - _top - _bottom;
            if (_height > 0) {
                this.$position[1] = oy + _bottom + sHeight / 2;
                this.$style.size[1] = _height - this.$style.borderWidth * 2;
            } else {
                this.$position[1] = oy + sHeight / 2;
                this.$style.size[1] = sHeight - this.$style.borderWidth * 2;
            }
        } else if (_.notNull(css.top)) {
            this.$position[1] = oy + _.offset(css.top, sHeight) + this.$style.size[1] / 2 + this.$style.borderWidth;
        } else if (_.notNull(css.bottom)) {
            this.$position[1] = oy + sHeight - _.offset(css.bottom, sHeight) - this.$style.size[1] / 2 - this.$style.borderWidth;
        }

        this.$scene.repaint();
    }

    //方便通过元素的set接口或是scene.addByjson函数的配置参数 api属性处理的定位函数
    position(...arr) {
        if (arr.length > 0) {
            if (_.isNumeric(arr[0])) {
                this.$position[0] = arr[0];
            }
            if (_.isNumeric(arr[1])) {
                this.$position[1] = arr[1];
            }
            return this;
        }
        return this.$position;
    }

    //计算当前元素的边界坐标
    getBoundary() {
        return {
            left: this.$position[0] - this.$style.size[0] / 2 - this.$style.borderWidth,
            top: this.$position[1] - this.$style.size[1] / 2 - this.$style.borderWidth,
            right: this.$position[0] + this.$style.size[0] / 2 + this.$style.borderWidth,
            bottom: this.$position[1] + this.$style.size[1] / 2 + this.$style.borderWidth,
            width: this.$style.size[0] + this.$style.borderWidth * 2,
            height: this.$style.size[1] + this.$style.borderWidth * 2
        }
    }

    //简单判断是否存在于视口中
    isInStage() {
        const {
            left,
            top,
            width,
            height
        } = this.getBoundary(), [stageWidth, stageHeight] = this.$scene.getStageSize(), [translateX, translateY] = this.$scene.getTranslate(),
            scale = this.$scene.$style.scale, [leftX, leftY] = [(left + translateX) * scale, (top + translateY) * scale], [rightX, rightY] = [leftX + width * scale, leftY + height * scale];
        return leftX < stageWidth && leftY < stageHeight && 0 < rightX && 0 < rightY;
    }

    //判断落点是否在元素内
    isInBoundary([targetX, targetY]) {
        const {
            left,
            top,
            width,
            height
        } = this.getBoundary();
        return targetX > left && targetX < left + width && targetY > top && targetY < top + height;
    }

    //处理事件,节点元素上的链接应该在该元素被删除后也一起删除
    eventHandler(name, event) {
        switch (name) {
            case "remove":
                if (this.$outLinks) {
                    this.$outLinks.forEach(link => this.$scene.remove(link));
                    this.$outLinks.clear();
                }
                if (this.$inLinks) {
                    this.$inLinks.forEach(link => this.$scene.remove(link));
                    this.$inLinks.clear();
                }
                break;
            case "mousedrag":
                this.position(this._position[0] + event.dragWidth, this._position[1] + event.dragHeight);
                break;
            case "selected":
                this._position = [...this.$position];
                break;
        }
        return super.eventHandler(name, event);
    }

    toJson() {
        const json = super.toJson();
        json.api.position = this.$position;
        return json;
    }

    $paintBox(context, boundary) {
        return this;
    }

    $paintView(context) {
        const boundary = this.getBoundary();
        context.translate(...this.$position);
        return this.$paintBox(context, boundary)
            .$paintBorder(context, boundary)
            .$paintText(context, boundary);
    }


    $paintBorder(context, boundary = this.getBoundary()) {
        if (this.$style.borderWidth > 0) {
            const {
                borderWidth,
                borderRadius,
                borderColor,
                borderAlpha,
                borderDash
            } = this.$style;
            if (0 == borderRadius) {
                context.beginPath();
                context.rect(borderWidth / 2 - boundary.width / 2, borderWidth / 2 - boundary.height / 2, boundary.width - borderWidth, boundary.height - borderWidth);
            } else {
                context.beginPath();
                context._roundRect(borderWidth / 2 - boundary.width / 2, borderWidth / 2 - boundary.height / 2, boundary.width - borderWidth, boundary.height - borderWidth, borderRadius);
            }
            context.strokeStyle = "rgba(" + borderColor + "," + borderAlpha + ")";
            context.lineWidth = borderWidth;
            if (borderDash) {
                context.setLineDash(borderDash);
            }
            context.stroke();
        }
        return this;
    }

    $paintText(context, boundary = this.getBoundary()) {
        if (this.$style.textVisible && _.notNull(this.$style.textValue)) {
            let {
                textOffset,
                textLineGap,
                textPosition,
                textValue,
                textAlpha,
                textSize,
                textFamily,
                textColor,
                textBaseline,
                textAlign
            } = this.$style;

            if (!textValue.split) {
                textValue = textValue + "";
            }
            let lines = textValue.split("\n");

            context.fillStyle = "rgba(" + textColor + "," + textAlpha + ")";
            context.font = textSize + "px " + textFamily;
            let fontWidth = context.measureText("田").width;
            context.textBaseline = textBaseline;
            context.textAlign = textAlign;

            const [starX, startY] = _.isString(textPosition) ?
                addjustTextPosition(textPosition, context, lines, fontWidth, textLineGap, boundary) : [_.offset(textPosition[0], boundary.width),
                    _.offset(textPosition[1], boundary.height)
                ];

            lines.forEach((line, i) =>
                context.fillText(
                    line,
                    textOffset[0] + starX - boundary.width / 2,
                    textOffset[1] + startY + fontWidth * i - boundary.height / 2 + (i != 0 ? textLineGap : 0)
                )
            );
        }
        return this;
    }
}
export {
    Box
}
_.isBox = obj => obj instanceof Box;

//根据参数计算文字定位相关参数
function addjustTextPosition(type, context, lines, fontSize, textLineGap, boundary) {
    let startX, startY, len = lines.length;
    switch (type) {
        case 'innerCenter':
            context.textBaseline = "top";
            context.textAlign = "center";
            startX = boundary.width * 0.5;
            startY = boundary.height * 0.5 - fontSize * len * 0.5 - textLineGap * (len - 1) * 0.5;
            break;
    }

    return [startX, startY];
}