import { _ } from "../common";
import { Node } from "./Node";
import { Style } from "../common/style";

const SHAPE = {};
class ShapeNode extends Node {
    constructor() {
        super();
        this.$style = Object.create(Style.Shape);
    }

    $paintBox(context) {
        const shapeType = SHAPE[this.$style.shapeType];
        context.fillStyle = "rgba(" + this.$style.color + ", " + this.$style.alpha + ")";
        context.beginPath();
        if (_.isFunction(shapeType)) {
            shapeType(context, this.$style);
        } else {
            SHAPE.rect(context, this.$style);
        }
        context.fill();
        return this;
    }

    $paintBorder(context) {
        const shapeType = SHAPE[this.$style.shapeType];
        if (this.$style.borderWidth > 0) {
            const { borderWidth, borderRadius, borderColor, borderAlpha, borderDash } = this.$style;
            context.strokeStyle = "rgba(" + borderColor + "," + borderAlpha + ")";
            context.lineWidth = borderWidth;
            if (borderDash) {
                context.setLineDash(borderDash);
            }
            context.beginPath();
            if (_.isFunction(shapeType)) {
                shapeType(context, this.$style);
            } else {
                SHAPE.rect(context, this.$style);
            }
            context.stroke();
        }
        return this;
    }
}
export { ShapeNode }
Object.assign(SHAPE, {
    star(context, style) {
        if (style.size[0] != style.size[1]) {
            style.size[1] = style.size[0];
        }
        context._star(
            0, 0,
            style.size[0] / 2
        );
    },
    rect(context, style) {
        if (0 == style.borderRadius) {
            context.rect(
                -style.size[0] / 2,
                -style.size[1] / 2,
                ...style.size
            );
        } else {
            context._roundRect(
                -style.size[0] / 2,
                -style.size[1] / 2,
                ...style.size,
                style.borderRadius
            );
        }
    },
    round(context, style) {
        if (style.size[0] == style.size[1]) {
            context.arc(
                0, 0,
                style.size[0] / 2,
                0, 2 * Math.PI
            );
        } else {
            context._ellipse(
                0, 0,
                ...style.size
            );
        }
    },
    triangle(context, style) {
        context._triangle(
            0, 0,
            ...style.size
        )
    },
    quadrangle(context, style) {
        let [width, height] = style.size;
        //顺时针
        context.moveTo(0, -height / 2);
        context.lineTo(width / 2, 0);
        context.lineTo(0, height / 2);
        context.lineTo(-width / 2, 0);
        context.lineTo(0, -height / 2);
    },
    pentagon(context, style) {
        let [width, height] = style.size,
            sheight = Math.tan(Math.PI / 6) * height / 2 - height / 2;
        //顺时针
        context.moveTo(0, -height / 2);
        context.lineTo(width / 2, sheight);
        context.lineTo(width / 2, height / 2);
        context.lineTo(-width / 2, height / 2);
        context.lineTo(-width / 2, sheight);
        context.lineTo(0, -height / 2);
    }
});