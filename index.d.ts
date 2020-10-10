declare module "helper" {
    import { Pointer } from "index";
    export const enum DIR {
        LEFT = "left",
        RIGHT = "right",
        UP = "up",
        DOWN = "down"
    }
    export interface Point {
        x: number;
        y: number;
        time: number;
    }
    export type Hook = (this: Pointer, e: PointerEventLike) => void;
    export interface PointerEventMap {
        /** 按下 */
        begin: Hook;
        /** 按下并移动 */
        move: Hook;
        /** 抬起 */
        end: Hook;
        /** 取消，打断 */
        abort: Hook;
        /** 单指轻击 */
        tap: Hook;
        /** 单指轻击 */
        singletap: Hook;
        /** 单指双击 */
        dbtap: Hook;
        /** 单指长按 */
        press: Hook;
        /** 单指拖动(在手指鼠标按压并移动时触发) */
        pan: Hook;
        /** 单指滑动(在手指鼠标抬起时触发) */
        swipe: Hook;
        /** 单指向左滑动(在手指鼠标抬起时触发) */
        swipeleft: Hook;
        /** 单指向右滑动(在手指鼠标抬起时触发) */
        swiperight: Hook;
        /** 单指向下滑动(在手指鼠标抬起时触发) */
        swipedown: Hook;
        /** 单指向上滑动(在手指鼠标抬起时触发) */
        swipeup: Hook;
        /** 双指旋转时触发 */
        rotate: Hook;
        /** 双指捏合捏放时触发 */
        pinch: Hook;
        /** 双指捏合(缩小)时触发 */
        pinchin: Hook;
        /** 双指捏放(放大)且手指鼠标抬起时触发 */
        pinchout: Hook;
        /** 双指按下 */
        multibegin: Hook;
        /** 双指抬起 */
        multiend: Hook;
        /** 双指轻击时触发 */
        multitap: Hook;
        /** 双指拖动时触发 */
        multipan: Hook;
    }
    export interface PointerOptions {
        /** touchmove/mousemove函数节流时间 */
        throttle: number;
        /** 单击阈值 */
        singleTime: number;
        /** 双击阈值 */
        dbtime: number;
        /** 长按阈值 */
        pressTime: number;
        /** 初始化 */
        init: (this: Pointer) => void;
        [key: string]: any;
    }
    export function getPoint(e: TouchEvent, i?: number): Point;
    export function point(x: number, y: number): Point;
    export function disXy(begin: Point, end: Point): Point;
    export interface PointerEventLike extends TouchEvent {
        dx: number;
        dy: number;
        zoom: number;
        angle: number;
        dir: DIR;
    }
    export type CombineEvent = PointerEvent | TouchEvent | MouseEvent;
    export function getDir(pre: Point, now: Point): DIR;
    export function getLen(p: Point): number;
    export function getRotateAngle(p1: Point, p2: Point): number;
    export function throttle(fn: Function, wait?: number): (this: any) => void;
    export function pickup(o: Record<string, any>): Record<string, any>[];
    export function noop(): void;
    export function greater(p1: Point, p2: Point, max: number): boolean;
}
declare module "index" {
    import { PointerOptions, PointerEventMap, Hook } from "helper";
    export class Pointer {
        constructor(el: HTMLElement | string, options?: Partial<PointerOptions & PointerEventMap>);
        el: HTMLElement;
        private init;
        private throttle;
        private singleTime;
        private dbtapTime;
        private pressTime;
        /** 判定为拖动-手指移动距离xy的最小值 */
        private panMinXy;
        /** 双击判断条件-两个手指点之间xy的最大范围 */
        private maxXy;
        /** 点击定时器 */
        private tapTimer;
        /** 单击定时器 */
        private singleTimer;
        /** 双击定时器 */
        private dbtapTimer;
        /** 长按定时器 */
        private pressTimer;
        /** 滑动定时器 */
        private swipeTimer;
        /** 缩放比 */
        private zoom;
        /** 上次点击点 */
        private prePoint;
        /** 按下时第一个手指点 begin point 1 */
        private bp1;
        /** 按下时第二个手指点 begin point 2 */
        private bp2;
        /** 移动时第一个手指点 move point 1*/
        private mp1;
        /** 移动时第二个手指点 move point 2*/
        private mp2;
        /** 双指触摸初始双指距离xy */
        private dxy;
        /** 标记是否是双击 */
        private isDbtap;
        /** 双指捏放捏合初始宽度 */
        private pinchLength;
        /** 阻止点击 */
        private preventTap;
        /** 监听事件合集 */
        private handlers;
        private started;
        private e;
        private $begin;
        private $move;
        private $end;
        private $out;
        private $on;
        private $off;
        private emit;
        private abortPress;
        private abortSingle;
        private abortAll;
        on(e: keyof PointerEventMap, handler: Hook): this;
        off(e: keyof PointerEventMap, handler?: Hook): this;
        destroy(): null;
    }
}
