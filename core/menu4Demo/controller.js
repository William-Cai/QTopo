import { filterWeight, filterFilter } from "./parse";
import { doAction, addEvents } from "./action";

//结合综合监控的菜单配置规则,生成工具条和右键菜单
export const initMenu = function (dom, stage, scene, data) {
    const addRightMenu = QTopo.initRightMenu({
        dom, stage: scene, afterFilter() {
            QTopo._Warning.clear();
        }
    });
    const addToolBar = QTopo.initToolbar({ dom });
    const configs = filterMenuConfigs(data);
    addRightMenu(initRightMenus(configs.rightMenu, scene));
    addToolBar(initToolBar(configs.toolBar, scene));
    bindDblClick(configs.dbClick, scene);
    return addEvents;
};
/**
 * 包装右键菜单组件
 * filter函数返回的boolean判断是否展示该菜单
 * click为点击后执行函数
 * name为显示的名称
 * 
 * 现根据菜单配置的权重和过滤条件生成filter函数
 * 点击后根据菜单配置执行事件函数
 * 
 * @param {*} configs 
 * @param {*} scene 
 */
function initRightMenus(configs, scene) {
    let rightMenu;
    return configs.map(menu => {
        rightMenu = {
            name: menu.name,
            click: function (e) {
                doAction(menu, scene, [parseInt(e.x), parseInt(e.y)], e.target);
            },
            filter: filterRightMenu(menu, scene)
        };
        if (QTopo.util.isArray(menu.item)) {
            rightMenu.item = initRightMenus(menu.item, scene);
        }
        return rightMenu;
    });
}

/**
 * 包装工具条
 * @param {*} configs 
 * @param {*} scene 
 */
function initToolBar(configs, scene) {
    return configs.map(menu => {
        return {
            name: menu.name,
            icon: menu.icon,
            active: menu.active,
            isActive() {
                return filterFilter(menu, null, scene, false);
            },
            click() {
                doAction(menu, scene);
            }
        }
    });
}

//绑定图层双击事件
function bindDblClick(dbClickConfigs, scene) {
    scene.on("dblclick", function (e) {
        const menu = filterDblClickMenu(dbClickConfigs, scene, e.target);
        if (QTopo.util.notNull(menu)) {
            doAction(menu, scene, [e.x, e.y], e.target);
        }
    });
}
//生成菜单过滤函数
function filterRightMenu(menuConfig, scene) {
    return function (target) {
        target = target || scene;
        const weight = filterWeight(menuConfig, target, scene),
            filter = filterFilter(menuConfig, target, scene);
        if (!weight || !filter) {
            QTopo._Warning.add(menuConfig.name, menuConfig);
        }
        return weight && filter;
    };
}
//过滤菜单配置,找寻可触发的双击菜单
function filterDblClickMenu(menuConfigs, scene, target) {
    target = target || scene;
    const menus = [];
    menuConfigs.forEach(function (menu) {
        const weight = filterWeight(menu, target, scene),
            filter = filterFilter(menu, target, scene);
        if (weight && filter) {
            menus.push(menu);
        }
    });
    if (menus.length > 1) {
        menus.sort((a, b) => b.depth - a.depth);
    }
    return menus[0];
};

//根据菜单类型分类菜单配置
function filterMenuConfigs(menus) {
    const rightMenu = [],
        toolBar = [],
        dbClick = [];
    menus.forEach(function (menu) {
        switch (menu.dblclick) {
            case "both":
                rightMenu.push(menu);
                dbClick.push(menu);
                break;
            case "true":
                dbClick.push(menu);
                break;
            case "false":
                rightMenu.push(menu);
                break;
            case "toolbar":
                toolBar.push(menu);
                break;
            default:
                rightMenu.push(menu);
        }
    });
    return {
        rightMenu,
        dbClick,
        toolBar
    }
}
