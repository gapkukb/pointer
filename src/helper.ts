import { Pointer } from "./index";

export const enum DIR {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
}
export interface Point {
  x: number;
  y: number;
  time: number;
}
export type Hook = (this: Pointer, e: PointerEventLike) => void;
export interface PointerEventMap {
  //单指交互事件
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
  //多指交互事件
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
export function getPoint(e: TouchEvent, i: number = 0): Point {
  const { pageX: x, pageY: y } = e.changedTouches[i];
  return { x, y, time: Date.now() };
}
export function point(x: number, y: number): Point {
  return { x, y, time: Date.now() };
}
export function disXy(begin: Point, end: Point): Point {
  return { x: end.x - begin.x, y: end.y - begin.y, time: Date.now() };
}
export interface PointerEventLike extends TouchEvent {
  dx: number;
  dy: number;
  zoom: number;
  angle: number;
  dir: DIR;
}
export type CombineEvent = PointerEvent | TouchEvent | MouseEvent;
export function getDir(pre: Point, now: Point): DIR {
  const x = now.x - pre.x,
    y = now.y - pre.y;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? DIR.RIGHT : DIR.LEFT) : y > 0 ? DIR.DOWN : DIR.UP;
}
export function getLen(p: Point) {
  // 获取坐标点与原点的向量长度
  return Math.sqrt(p.x * p.x + p.y * p.y);
}
function dot(p1: Point, p2: Point) {
  return p1.x * p2.x + p1.y * p2.y;
}
function corss(p1: Point, p2: Point) {
  return p1.x * p2.y + p2.x * p1.y;
}
function getAngle(p1: Point, p2: Point) {
  // 获取两点之间的向量的夹角
  const m = getLen(p1) * getLen(p2);
  if (!m) return 0;
  const r = Math.min(1, dot(p1, p2) / m);
  return Math.acos(r);
}
export function getRotateAngle(p1: Point, p2: Point) {
  let a = getAngle(p1, p2); //获取两点角度
  if (corss(p1, p2) > 0) a *= -1; //如果大于180度，那么取负值
  return (a * 180) / Math.PI; //转换为弧度
}
export function throttle(fn: Function, wait: number = 0) {
  let cb = fn,
    t = 0,
    f = true;
  function throttled(this: any) {
    let ctx = this,
      args = arguments;
    // 如果是第一次触发，直接执行
    if (f) {
      cb.apply(ctx, args);
      f = false;
      return;
    }
    // 如果定时器已存在，直接返回。
    if (t) return;
    t = window.setTimeout(function () {
      // 注意这里 将 clearTimeout 放到 内部来执行了
      clearTimeout(t);
      t = 0;
      cb.apply(ctx, args);
    }, wait);
  }
  // 返回一个闭包
  return throttled;
}

export function pickup(o: Record<string, any>) {
  let props: Record<string, any> = {},
    methods: Record<string, any> = {};
  for (const key in o) {
    if (typeof o[key] === "function") methods[key] = o[key];
    else props[key] = o[key];
  }
  return [props, methods];
}
export function noop() {}
export function greater(p1: Point, p2: Point, max: number) {
  return Math.abs(p1.x - p2.x) > max || Math.abs(p1.y - p2.y) > max;
}
