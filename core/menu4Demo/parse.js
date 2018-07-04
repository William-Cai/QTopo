import { _ } from "../core/common";

const MACRO_NULL = "null";

//图层操作模式的权重
const AWEIGHT = {
    [_.MODE_SELECT]: 1,
    [_.MODE_SHOW]: 1,
    [_.MODE_EDIT]: 10,
    [_.MODE_LINKEDIT]: 100
};

//元素对象的权重
const EWEIGHT = {
    'node': 10,
    'segment': 100,
    'link': 1000,
    'group': 10000,
    'ztype.shape': 100000,
    'ztype.text': 1000000,
    'ztype.url': 10000000,
    'ztype.topo': 100000000,
    'ztype.layer': 1000000000,
    'ztype.line': 100000000000,
    'link.layer': 1000000000000,
    'ztype.obj': 10000000000000,
    'ztype.grid': 100000000000000
};
/**
 * 解析正则对象
 * @param {*} input 
 */
const parseRegExp = input => {
    //console.info("[parseRegExp] original = %s", input);
    if (input == null) {
        console.error("[parseRegExp] 正则表达式不能为空");
        return null;
    }
    const startIndex = input.indexOf("/");
    const lastIndex = input.lastIndexOf("/");
    if (startIndex == -1 || lastIndex == -1 || startIndex == lastIndex) {
        console.error("[parseRegExp] 正则表达式格式错误 %s", input);
        return null;
    }
    const re = input.substring(startIndex + 1, lastIndex);
    const flags = input.substr(lastIndex + 1);
    //console.info("[parseRegExp] 解析结果 re=%s flags=%s", re, flags);
    return new RegExp(re, flags);
};
/**
 * 解析二进制字符串中 是否包含子串
 * 例子:
 * "1000" 只包含 "1000"
 * "1100" 包含 "1000" 和 "100"
 * "101" 包含 "100" 和 "1"
 * @param {*} menuWeight 目标二进制字符串 "110" "10" "1000"
 * @param {*} weight  需要判断的子串
 */
const isInclude = (menuWeight, weight) => {
    if (menuWeight && weight) {
        menuWeight += '';
        weight += '';
        return menuWeight.charAt(menuWeight.length - weight.length) == '1';
    }
    return true;
};
//--------------------------------
/**
 * 解析字符串中的${...}格式
 * 取值替换并返回新的字符串
 * 从图层或元素对象上取值,替换宏字符串中的关键字
 * 以CANVAS: 开头则表示从图层上取值
 * 例子:
 * 将(${CANVAS:high_light}==true) 字符串转化为 (false==true) 的形式
 * @param {*} input "(${CANVAS:high_light}==true) or (${CANVAS:high_light_manage}==true)"形式
 * @param {*} element 触发的元素对象
 * @param {*} scene 触发的图层
 * @param {*} menuName 菜单名
 */
export const parseMacro = function (input, element, scene, menuName) {
    if (_.notNull(input)) {
        let start = input.indexOf("${"),
            end = -1,
            key,
            value;
        while (start != -1) {
            end = input.indexOf("}", start);
            if (end != -1) {
                key = input.substring(start + 2, end).trim();
                if (_.notNull(key) && key.length > 7 && key.indexOf("CANVAS:") == 0) {
                    value = getValue(scene, key.substring(7));
                    // value = scene.get(key.substring(7));
                }
                else {
                    // value = element.get(key);
                    value = getValue(element, key);
                }
                if (_.notNull(value) && !_.isFunction(value)) {
                    input = input.replace("${" + key + "}", value);
                }
                else {
                    input = input.replace("${" + key + "}", MACRO_NULL);
                }
            } else {
                return input;
            }
            start = input.indexOf("${");
        }
    }
    return input;
};

/**
 * 根据菜单的权重配置,
 * 判断当前触发的目标和操作模式的权重是否通过测试
 * aweight为操作模式权重 
 * eweight为触发对象权重 
 * 例子:
 * 菜单配置    获取到的权重   结论
 * 1100   包含  100          通过
 * 1100   不含  10           不通过
 * @param {*} menu  菜单配置
 * @param {*} target 触发元素
 * @param {*} scene 图层
 */
export const filterWeight = function (menu, target, scene) {
    let aweight = AWEIGHT[scene.mode()] || 1,
        eweight = EWEIGHT[target.data('elementType')] || 1;
    if (_.isScene(target)) {
        eweight = 1;
    }
    return isInclude(menu.aweight, aweight) && isInclude(menu.eweight, eweight);
};
/**
 * 根据菜单配置中 filter属性 测试是否通过
 * 例子:
 * filte : ${CANVAS:go_back}==true
 * 只有当图层属性中 go_back 为 true
 * 即 解析结果为 true==true 时 才返回true
 * @param {*} menu 菜单配置
 * @param {*} target 触发元素
 * @param {*} scene 图层
 * @param {*} defaultResult 默认结果
 */
export const filterFilter = function (menu, target, scene, defaultResult = true) {
    if (_.notNull(menu.filter)) {
        const input = parseMacro(menu.filter, target, scene, menu.name);
        if (input.includes(") or (")) {
            return input.substring(1, input.length - 1).split(") or (").some(item => extractSepartor(item));
        }
        if (input.includes(") and (")) {
            return input.substring(1, input.length - 1).split(") and (").every(item => extractSepartor(item));
        }
        return extractSepartor(input);
    }
    return defaultResult;
};

//--------------------------------path[0][title]
/**
 * 根据宏命令 实现直接取值或嵌套取值
 * @param {*} target 触发对象
 * @param {*} input 取值宏命令 如 path[0][title]
 */
function getValue(target, input) {
    let start = input.indexOf("["),
        end = -1,
        key,
        value;

    if (start < 0) {
        return target.get(input);
    }
    key = input.substring(0, start).trim();
    target = target.get(key);
    while (start != -1 && _.notNull(target)) {
        end = input.indexOf("]", start);

        if (end != -1) {
            key = input.substring(start + 1, end).trim();
            value = _.isElement(target) ? target.get(key) : target[key];
            target = value;
        } else {
            return value;
        }

        start = input.indexOf("[", end);
    }
    return value;
}
/**
 * 根据解析结果 转化为js 识别的boolean对象
 * @param {*} input 如 "false==false" 或则是 "false==false or 1==1"
 */
function extractSepartor(input) {
    if (_.notNull(input)) {
        if (input.includes(" and ")) {
            return input.split(" and ").every(item => accept(item));
        }
        if (input.includes(" or ")) {
            return input.split(" or ").some(item => accept(item));
        }
        return accept(input);
    }
    return false;
}
/**
 * 解析单个结论为boolean对象
 * @param {*} input  只能是 "notNull(null)" "false==false" 等形式
 */
function accept(input) {
    if (_.notNull(input)) {
        let array = null,
            leftNumber = NaN,
            rightNumber = NaN,
            pos = 0,
            end = 0;
        if (input.includes("notNull(")) {
            pos = input.indexOf("notNull(");
            end = input.indexOf(")", pos);
            return input.substring(pos + 8, end).trim() != MACRO_NULL;
        }
        else if (input.includes("isNull(")) {
            pos = input.indexOf("isNull(");
            end = input.indexOf(")", pos);
            return input.substring(pos + 7, end).trim() == MACRO_NULL;
        }
        else if (input.includes("!=")) {
            array = input.split("!=");
            if (array.length == 2) {
                return $.trim(array[0]) != $.trim(array[1]);
            }
            return false;
        }
        else if (input.includes("==")) {
            array = input.split("==");
            if (array.length == 2) {
                return $.trim(array[0]) == $.trim(array[1]);
            }
            return false;
        }
        else if (input.includes(">=")) {
            array = input.split(">=");
            if (array.length == 2) {
                leftNumber = parseInt($.trim(array[0]));
                rightNumber = parseInt($.trim(array[1]));
                if (isNaN(leftNumber) || isNaN(rightNumber)) {
                    return false;
                }
                return leftNumber >= rightNumber;
            }
            return false;
        }
        else if (input.includes("<=")) {
            array = input.split("<=");
            if (array.length == 2) {
                leftNumber = parseInt($.trim(array[0]));
                rightNumber = parseInt($.trim(array[1]));
                if (isNaN(leftNumber) || isNaN(rightNumber)) {
                    return false;
                }
                return leftNumber <= rightNumber;
            }
            return false;
        }
        else if (input.includes(">")) {
            array = input.split(">");
            if (array.length == 2) {
                leftNumber = parseInt($.trim(array[0]));
                rightNumber = parseInt($.trim(array[1]));
                if (isNaN(leftNumber) || isNaN(rightNumber)) {
                    return false;
                }
                return leftNumber > rightNumber;
            }
            return false;
        }
        else if (input.includes("<")) {
            array = input.split("<");
            if (array.length == 2) {
                leftNumber = parseInt($.trim(array[0]));
                rightNumber = parseInt($.trim(array[1]));
                if (isNaN(leftNumber) || isNaN(rightNumber)) {
                    return false;
                }
                return leftNumber < rightNumber;
            }
            return false;
        }
        else if (input.includes("RegExp(") && input.includes(")test(") && input.includes(")pxEgeR")) {
            const index1 = input.indexOf("RegExp("),
                index2 = input.indexOf(")test(", index1),
                index3 = input.indexOf(")pxEgeR", index2),
                regStr = input.substring(index1 + 7, index2),
                testValue = input.substring(index2 + 6, index3),
                reg = parseRegExp(regStr);
            if (_.notNull(reg)) {
                return reg.test(testValue);
            }
            else {
                console.error("正则表达式格式错误 regStr=%s testValue=%s", regStr, testValue);
                return false;
            }
        }
    }
    return false;
}
