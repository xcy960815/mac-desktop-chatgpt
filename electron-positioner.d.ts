import { BrowserWindow, Rectangle } from "electron";
// 重写组件的ts声明 看过源码后发现electron-positioner的声明文件有问题
declare namespace ElectronPositioner {
    type Position =
        | 'trayLeft'
        | 'trayBottomLeft'
        | 'trayRight'
        | 'trayBottomRight'
        | 'trayCenter'
        | 'trayBottomCenter'
        | "topLeft"
        | "topRight"
        | "bottomLeft"
        | "bottomRight"
        | "topCenter"
        | "bottomCenter"
        | "leftCenter"
        | "rightCenter"
        | "center";

    type TrayPosition =
        | "trayLeft"
        | "trayBottomLeft"
        | "trayRight"
        | "trayBottomRight"
        | "trayCenter"
        | "trayBottomCenter";
}

declare class ElectronPositioner {
    constructor(browserWindow: BrowserWindow);

    move(position: ElectronPositioner.Position, trayBounds?: Rectangle): void;
    move(position: ElectronPositioner.Position | ElectronPositioner.TrayPosition, trayBounds: Rectangle): void;

    calculate(position: ElectronPositioner.Position, trayBounds?: Rectangle): { x: number; y: number };
    calculate(
        position: ElectronPositioner.Position | ElectronPositioner.TrayPosition,
        trayBounds: Rectangle,
    ): { x: number; y: number };
}

export = ElectronPositioner;
