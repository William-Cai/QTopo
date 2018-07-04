import "./polyfill";
import { Stage } from "./core/stage/Stage";
import { _ } from "./core/common";
import * as comp from "./component";
import * as els from "./core/constructor";

//-----------demotest
import { initMenu } from "./menu4Demo/controller";
import { Warning } from "./menu4Demo/Warning";

console.info('%cQTopo loading :', 'color:blue', _.dateFormat(new Date(), "yyyy/MM/dd hh:mm:ss"));
//以初始化的dom为key,topo对象为值记录实例,避免重复初始化
const INSTANCE = new WeakMap();
const QTopo = function (dom, config) {
    if (!INSTANCE.has(dom)) {
        let stage = new Stage(dom);
        //待扩展的配置参数
        if (config && config.background) {
            //用api的形式修改背景，目的是导出为图片时能正确包含背景
            stage.background(config.background);
        }
        INSTANCE.set(dom, stage);
    }
    return INSTANCE.get(dom);
};

Object.assign(QTopo, {
    util: _,
    //可实例化的元素构造函数
    _els: els,
    //窗口组件
    Popup: comp.Popup,
    initRightMenu: comp.rightMenu,
    initToolbar: comp.toolbar,
    initTips: comp.tips,
    initAlert: comp.alert,
    initConfirm: comp.confirm,
    initProgress: comp.progress,
    initLoading: comp.loading,
    _initMenu: initMenu,//特殊的右键菜单规则,根据综合监控的
    _Warning: new Warning()
});
window.QTopo = QTopo;
