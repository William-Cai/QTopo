require("./rightMenu.css");
//根据类型返回对应模版
function TEMP(type, name) {
    switch (type) {
        case "menu":
            return `<ul class='qtopo-rightMenu_Menu'></ul>`;
        case "subMenu":
            return `<li class='qtopo-rightMenu_item qtopo-rightMenu_subItem'><a class="qtopo-rightMenu_item-text">${name}</a></li>`;
        case "item":
            return `<li class="qtopo-rightMenu_item"><a class="qtopo-rightMenu_item-text">${name}</a></li>`;
        case "menuWrap":
            return `<div class='${WRAPNAME}'></div>`;
    }
}
//寄存每个菜单栏的执行函数,配合事件代理,click事件只绑定在整个右键菜单上
const $data = new WeakMap();

//菜单对象,可以是右键菜单对象,或者是子菜单
class Menu {
    constructor(dom) {
        this.parent = dom;
        this.body = QTopo.util.$createDom(TEMP("menu"));
        dom.appendChild(this.body);
        this.item = [];
    }

    //添加普通菜单条目
    addItem(options) {
        if (options) {
            const item = QTopo.util.$createDom(TEMP("item", options.name));
            $data.set(item.firstChild, options.click);
            this.body.appendChild(item);
            this.item.push({
                body: item,
                type: 'item',
                click: options.click,
                name: options.name,
                filter: options.filter
            });
            return item;
        }
    }

    //添加能够插入普通菜单栏的子菜单
    addSubMenu(options) {
        if (options) {
            const item = QTopo.util.$createDom(TEMP("subMenu", options.name)),
                subMenu = new Menu(item);
            $data.set(item.firstChild, options.click);
            this.body.appendChild(item);
            this.item.push({
                body: item,
                subMenu: subMenu,
                type: 'subMenu',
                order: options.order,
                name: options.name,
                filter: options.filter
            });
            return subMenu;
        }
    }
}
//生命周期钩子
const MENU_CONFIG = {
    beforeFilter() {

    },
    afterFilter() {

    },
    beforeClick() {

    },
    afterClick() {

    }
};

/**
 * 根据配置生成右键菜单,
 * 参数应包含：
 * stage: 绑定触发菜单事件,应包含on 函数绑定 mouseup事件,现一般用scene图层对象
 * dom: 菜单结构插入的dom层,没有 则插入到body内
 * 返回函数为添加菜单函数
 * @param {*} config 
 */
export let rightMenu = function (config) {
    if (config && config.stage) {
        const dom = config.dom || document.body,
            rightMenu = bindEvent(new Menu(dom), config.stage),
            _ = QTopo.util;

        //上钩子
        _.each(MENU_CONFIG, (fn, name) => {
            if (_.isFunction(config[name])) {
                MENU_CONFIG[name] = config[name];
            }
        });

        return function (menuArray) {
            makeRightMenu(rightMenu, menuArray);
        }

    } else {
        console.error("rightMenu init need stage");
    }
};

function bindEvent(menu, stage) {
    let clickFn, trigger, evenCoordin, openClass = "";
    const _ = QTopo.util,
        parent = menu.parent,
        menuBody = menu.body,
        menuItems = menu.item;

    //菜单触发事件
    stage.on("mouseup", showRightMenu);

    //事件代理,点击菜单执行函数
    _.$on(menuBody, 'click', menuAction);

    //隐藏菜单事件
    _.$on(menuBody, "mouseleave click", hideRightMenu);

    return menu;

    function showRightMenu(e) {
        //只有是右键才触发
        if (e.button === 2) {
            evenCoordin = [e.x, e.y];
            trigger = e.target;
            MENU_CONFIG.beforeFilter(e);
            //过滤能显示的菜单
            filter(menu, menuItems, trigger);
            MENU_CONFIG.afterFilter(e);
            show(menuBody);
            //菜单定位
            adjustPosition(e);
        }
    }

    //隐藏整个菜单
    function hideRightMenu(e) {
        hide(menuBody);
        if (openClass) {
            menuBody.classList.remove(openClass);
            openClass = "";
        }
    }

    //执行菜单上的事件
    function menuAction(e) {
        clickFn = $data.get(e.target);
        if (clickFn) {
            e = QTopo.util.cloneEvent(e);
            e.target = trigger;
            [e.x, e.y] = evenCoordin;
            MENU_CONFIG.beforeClick(e);
            clickFn(e);
            MENU_CONFIG.afterClick(e);
        }
    }

    //菜单定位调整,根据菜单展开是否会超出父元素的视口来决定展开方向
    function adjustPosition(e) {
        const ofx = e.offsetX,
            ofy = e.offsetY,
            pwidth = _.$width(parent),
            pheight = _.$height(parent),
            width = _.$width(menuBody),
            height = _.$height(menuBody),
            position = {
                left: 'auto',
                top: 'auto',
                right: 'auto',
                bottom: 'auto'
            },
            fix = 20,
            left = ofx > fix ? ofx - fix : 0,
            top = ofy > fix ? ofy - fix : 0,
            hw = (ofx + width) < pwidth,
            hh = (ofy + height) < pheight;

        if (hw && hh) {
            position.left = left + 'px';
            position.top = top + 'px';
        } else if (!hw && hh) {//宽不够,高够
            position.right = "0px";
            position.top = top + "px";
            openClass = "qtopo-rightMenu--left";

        } else if (hw && !hh) {//宽够,高不够
            position.left = left + 'px';
            position.bottom = "0px";
            openClass = "qtopo-rightMenu--up";

        } else if (!hw && !hh) {//宽不够,高不够
            position.right = "0px";
            position.bottom = "0px";
            openClass = "qtopo-rightMenu--left-up";

        }
        if (openClass) {
            menuBody.classList.add(openClass);
        }
        Object.assign(menuBody.style, position);
    }

}

//处理后续添加的菜单栏配置
function makeRightMenu(father, menus) {
    if (father && QTopo.util.isArray(menus)) {

        menus.forEach(function (menu) {
            if (QTopo.util.isArray(menu.item)) {
                if (father && menu) {
                    makeRightMenu(father.addSubMenu(menu), menu.item);
                }
            } else {
                if (father && menu) {
                    father.addItem(menu);
                }
            }
        });

    }
}

//根据菜单类型采用不同的隐藏策略
function filter(parent, items, menuTarget) {
    //用来收集子项中显示的菜单个数,子菜单内显示菜单为0则子菜单自身不显示,初始化为0
    parent.showedChild = 0;

    items.forEach(item => {
        switch (item.type) {
            case 'item':
                filterItem(parent, item, menuTarget);
                break;
            case 'subMenu':
                filterSubMenu(parent, item, menuTarget);
                break;
        }
    });
}
function filterItem(parent, item, menuTarget) {
    if (QTopo.util.isFunction(item.filter)) {
        if (item.filter(menuTarget)) {
            show(item.body);
            parent.showedChild++;
        } else {
            hide(item.body);
        }
    } else {
        parent.showedChild++;
        show(item.body);
    }
}
function filterSubMenu(parent, subMenu, menuTarget) {
    if (QTopo.util.isFunction(subMenu.filter)) {
        //当自身过滤条件通过时才检测子项的过滤条件
        if (subMenu.filter(menuTarget)) {
            show(subMenu.body);
            parent.showedChild++;
            filter(subMenu, subMenu.subMenu.item, menuTarget);//递归子项
        } else {
            hide(subMenu.body);
        }
    } else {
        //当子项全部不显示时,隐藏自身
        filter(subMenu, subMenu.subMenu.item, menuTarget);//递归子项
        if (subMenu.showedChild == 0) {
            hide(subMenu.body);
        } else {
            show(subMenu.body);
            parent.showedChild++;
        }
    }
}
function show(dom) {
    dom.style.display = 'block';
}
function hide(dom) {
    dom.style.display = 'none';
}