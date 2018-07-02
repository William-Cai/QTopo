import "./polyfill";
import { Stage } from "./core/stage/Stage";
import { _ } from "./core/common";
import * as comp from "./component";
import * as els from "./core/constructor";

//-----------demotest
import { initMenu } from "./menu4Demo/controller";
import { Warning } from "./menu4Demo/Warning";

console.info('%cQTopo loading :', 'color:blue', _.dateFormat(new Date(), "yyyy/MM/dd hh:mm:ss"));
const INSTANCE = new WeakMap();
const QTopo = function (dom, config) {
    if (!INSTANCE.has(dom)) {
        let stage = new Stage(dom);
        if (config && config.background) {
            stage.background(config.background);
        }
        INSTANCE.set(dom, stage);
    }
    return INSTANCE.get(dom);
};

Object.assign(QTopo, {
    util: _,
    _els: els,
    Popup: comp.Popup,
    initRightMenu: comp.rightMenu,
    initToolbar: comp.toolbar,
    initTips: comp.tips,
    initAlert: comp.alert,
    initConfirm: comp.confirm,
    initProgress: comp.progress,
    initLoading: comp.loading,
    _initMenu: initMenu,
    _Warning: new Warning()
});
window.QTopo = QTopo;
