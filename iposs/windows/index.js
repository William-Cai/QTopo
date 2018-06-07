import initAlarmInfo from "./alarmInfo/temp";
import initAddDevice from "./addDevice/temp";
import initAddSegment from "./addSegment/temp";
import initEditDeviceAttr from "./editDeviceAttr/temp";
import initEditDeviceType from"./editDeviceType/temp";
import initEditSegment from"./editSegment/temp";

const _ = QTopo.util;

export let initWindows = iposs=> {
    const alarmInfo = initAlarmInfo(iposs),
        addDevice = initAddDevice(iposs),
        addSegment = initAddSegment(iposs),
        editDeviceAttr = initEditDeviceAttr(iposs),
        editDeviceType = initEditDeviceType(iposs),
        editSegment = initEditSegment(iposs),
        windows = {
            addDevice,
            alarmInfo,
            addSegment,
            editDeviceAttr,
            editDeviceType,
            editSegment
        };
    iposs.windows = (name, config)=>_.notNull(windows[name]) && windows[name].open(config);
};