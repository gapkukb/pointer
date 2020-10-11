import {
  throttle,
  noop,
  pickup,
  PointerOptions,
  Point,
  getPoint,
  PointerEventLike,
  PointerEventMap,
  CombineEvent,
  Hook,
  getLen,
  disXy,
  getRotateAngle,
  getDir,
  greater,
} from "./helper";
const emap = [
  "touchstart mspointerdown mousedown",
  "touchmove mspointermove mousemove",
  "touchend mspointerup mouseup",
  "touchcancel mspointercancel mouseleave",
].map(
  (i) =>
    i
      .trim()
      .split(" ")
      .find((ii) => `on${ii}` in window) || ""
);
type EventMap = keyof PointerEventMap<never>;
window.setImmediate =
  window.setImmediate ||
  function (f: Function) {
    return window.setTimeout(f, 0);
  };
window.clearImmediate =
  window.clearImmediate ||
  function (n: number) {
    return window.clearTimeout(n);
  };
export class Pointer<T = {}> {
  constructor(el: HTMLElement | string, options: Partial<T & PointerOptions & PointerEventMap<T>> = {}) {
    this.el = typeof el === "string" ? (document.querySelector(el) as HTMLElement) : el;
    const [props, methods] = pickup(options);
    //合并传入参数属性
    Object.assign(this, props);
    this.$begin = this.$begin.bind(this);
    this.$move = this.$move.bind(this);
    this._move = throttle(this._move, this.throttle);
    this.$end = this.$end.bind(this);
    this.$out = this.$out.bind(this);
    this.abortAll = this.abortAll.bind(this);

    this.$on(0, this.$begin).$on(1, this.$move).$on(2, this.$end).$on(3, this.$out);
    //监听传入的事件
    for (const key in methods) {
      this.on(key as any, methods[key]);
    }
    this.init.call(this);
    window.addEventListener("scroll", this.abortAll);
  }
  el!: HTMLElement;
  private init = noop;
  private prevent = false;
  private throttle = 1000 / 30; //30帧
  private singleTime = 250;
  private dbtapTime = 250;
  private pressTime = 700;
  /** 判定为拖动-手指移动距离xy的最小值 */
  private panMinXy = 10;
  /** 双击判断条件-两个手指点之间xy的最大范围 */
  private maxXy = 30;
  /** 点击定时器 */
  private tapTimer: any = 0;
  /** 单击定时器 */
  private singleTimer: any = 0;
  /** 双击定时器 */
  private dbtapTimer: any = 0;
  /** 长按定时器 */
  private pressTimer: any = 0;
  /** 滑动定时器 */
  private swipeTimer: any = 0;
  /** 缩放比 */
  private zoom: number = 0;
  /** 上次点击点 */
  private prePoint: Point = {} as any;
  /** 按下时第一个手指点 begin point 1 */
  private bp1: Point = {} as any;
  /** 按下时第二个手指点 begin point 2 */
  private bp2: Point = {} as any;
  /** 移动时第一个手指点 move point 1*/
  private mp1: Point = {} as any;
  /** 移动时第二个手指点 move point 2*/
  private mp2: Point = {} as any;
  /** 双指触摸初始双指距离xy */
  private dxy: Point = {} as any;
  /** 标记是否是双击 */
  private isDbtap = false;
  /** 双指捏放捏合初始宽度 */
  private pinchLength = 0;
  /** 阻止点击 */
  private preventTap = false;
  /** 监听事件合集 */
  private handlers: Record<string, Function[]> = {};
  private started = false;
  private e: Event = null as any;
  private $begin(e: PointerEventLike) {
    // 如果是pointer事件且不是主键
    this.e = e;
    this.emit("begin");
    //记录按下时第一个手指点
    this.bp1 = getPoint(e);
    this.preventTap = false;
    this.started = true;

    let now = Date.now(),
      delta = now - (this.prePoint.time || now);

    //delta>0表示存在上次点击的坐标，则判定本次是第二次点击
    if (delta > 0) {
      //如果两次点击时间和距离都在阈值内，判定为双击同时取消触发单机
      this.isDbtap = delta > 0 && delta <= this.dbtapTime && !greater(this.bp1, this.prePoint, this.maxXy);
      if (this.isDbtap) this.abortSingle();
    }
    //将上次坐标点更新为当前
    this.prePoint = this.bp1;
    if (e.touches.length > 1) {
      //多点触摸
      this.abortPress(); //取消长按
      this.abortSingle(); //取消单击
      this.bp2 = getPoint(e, 1);
      // dxy 两个触摸点之间的xy距离点
      this.dxy = disXy(this.bp1, this.bp2);
      this.pinchLength = getLen(this.dxy);
      this.emit("multibegin");
    }

    this.pressTimer = window.setTimeout(() => {
      this.emit("press");
      this.preventTap = true;
    }, this.pressTime);
  }
  private $move(e: PointerEventLike) {
    if (this.prevent) e.preventDefault();
    else if (e.touches && e.touches.length > 1) e.preventDefault();
    if (!this.started) return;
    this._move(e);
  }
  private _move(e: PointerEventLike) {
    this.e = e;
    this.isDbtap = false; // 如果有移动就取消双击事件
    // 第一个触摸点
    let p1 = getPoint(e),
      { x, y } = this.mp1;
    if (e.touches.length > 1) {
      //第二个触摸点
      let p2 = getPoint(e, 1),
        //两者xy距离
        dxy = disXy(p1, p2),
        { x: x2, y: y2 } = this.mp2;
      //this.dxy.x存在则表示按下时也是双指
      if (this.dxy.x) {
        //且按下时两指距离大于0
        if (this.pinchLength > 0) {
          //通过当前的双指向量长度和按下时的双指向量长度求出缩放值
          this.zoom = e.zoom = getLen(dxy) / this.pinchLength;
          this.emit("pinch");
        }
        //求出两个向量之间的角度
        e.angle = getRotateAngle(dxy, this.dxy);
        this.emit("rotate");
      }
      this.dxy = dxy;
      // x存在表示之前有移动，x2存在表示之前有双指移动，否则dxy距离为0
      e.dx = x && x2 ? (p1.x - x + p2.x - x2) / 2 : 0;
      e.dy = y && y2 ? (p1.x - x + p2.x - y2) / 2 : 0;
      this.mp2 = p2;
      p2 = dxy = null as any;
      this.emit("multipan");
    } else {
      //x 如果存在表示之前有移动，否则dxy距离为0
      e.dx = x ? p1.x - x : 0;
      e.dy = y ? p1.y - y : 0;
      //如果移动中的当前点和按下时的点距离大于10，则视为拖动而不是点击。
      if (greater(this.bp1, p1, this.panMinXy)) this.preventTap = true;
      this.emit("pan");
    }
    this.emit("move");
    this.abortPress();
    this.mp1 = p1;
    p1 = null as any;
  }
  private $end(e: PointerEventLike) {
    if (!this.started) return;
    this.e = e;
    this.started = false;
    this.abortPress();

    if (e.touches.length < 2) {
      this.emit("multiend");
      this.mp2 = {} as any;
      if (this.zoom && this.zoom !== 1) {
        this.emit(`pinch${this.zoom < 1 ? "in" : "out"}` as any);
      }
    }
    if (greater(this.bp1, this.mp1, this.maxXy)) {
      e.dir = getDir(this.bp1, this.mp1);
      e.dx = this.mp1.x - this.bp1.x;
      e.dy = this.mp1.y - this.bp1.y;
      this.swipeTimer = setImmediate(() => {
        this.emit("swipe");
        this.emit(`swipe${e.dir}` as any);
      });
    } else {
      this.tapTimer = setImmediate(() => {
        if (!this.preventTap) this.emit("tap");
        if (this.isDbtap) {
          this.emit("dbtap");
          this.isDbtap = false;
        }
      });
      if (!this.isDbtap) {
        this.singleTimer = setTimeout(() => {
          this.emit("singletap");
        }, this.singleTime);
      }
    }
    this.emit("end");
    this.dxy = {} as any;
    this.pinchLength = 0;
    this.bp1 = this.mp1 = {} as any;
    this.zoom = 0;
  }
  private $out(e: PointerEventLike) {
    this.abortAll();
    this.emit("abort");
  }
  private $on(n: number, handler: any) {
    this.el.addEventListener(emap[n], handler, emap[n].indexOf("touch") !== -1 ? { passive: false } : false);
    return this;
  }
  private $off(n: number, handler: any) {
    this.el.removeEventListener(emap[n], handler);
    return this;
  }
  private emit(e: EventMap) {
    let handlers = this.handlers[e] || [];
    handlers.forEach((f) => f.call(this, this.e));
  }
  private abortPress() {
    clearTimeout(this.pressTimer);
  }
  private abortSingle() {
    clearTimeout(this.singleTimer);
  }
  private abortAll() {
    this.preventTap = true;
    this.abortSingle();
    this.abortPress();
    clearImmediate(this.tapTimer);
    clearImmediate(this.swipeTimer);
  }

  on(e: EventMap, handler: Hook<T>) {
    (this.handlers[e] = this.handlers[e] || []).push(handler);
    return this;
  }
  off(e: EventMap, handler?: any) {
    let handlers = this.handlers[e] || [],
      i = handlers.length;
    if (handler) while (i--) handlers[i] === handler && handlers.splice(i, 1);
    else delete this.handlers[e];
    return this;
  }
  destroy() {
    this.abortAll();
    this.$off(0, this.$begin).$off(1, this.$move).$off(2, this.$end).$off(3, this.$out);
    for (const key in this) {
      // this[key] = null as any;
      delete this[key];
    }
    window.removeEventListener("scroll", this.abortAll);
    return null;
  }
}

new Pointer<{ abc: string }>(document.body, {
  swipeleft(e) {
    this.abc;
    console.log(e);
  },
  swiperight(e) {
    console.log(e);
  },
  tap(e) {
    console.log("tap");
  },
  singletap(e) {
    console.log("singletap");
  },
  dbtap(e) {
    console.log("dbtap");
  },
  move(e) {},
}).on("tap", function (e) {
  this.abc;
});
