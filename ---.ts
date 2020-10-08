interface Point {
  x: number;
  y: number;
}
type Direction = "up" | "down" | "left" | "right";

class Admin {
  handlers: Function[] = [];
  el!: HTMLElement;
  constructor(el: HTMLElement) {
    this.el = el;
  }
  add(handler: Function) {
    this.handlers.push(handler);
    return this;
  }
  del(handler?: Function) {
    let i = this.handlers.length;
    if (handler) {
      while (i--) {
        if (this.handlers[i] === handler) this.handlers.splice(i, 1);
        return this;
      }
    } else {
      this.handlers = null as any;
    }
  }
  dispatch(...params: any[]) {
    let i = this.handlers.length;
    while (i--) {
      const handler = this.handlers[i];
      if (typeof handler === "function") handler.apply(this.el, params);
    }
    return this;
  }
}

function getLen(p: Point) {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}
function dot(p1: Point, p2: Point) {
  return p1.x * p2.x + p1.y * p2.y;
}
function getAngle(p1: Point, p2: Point) {
  const mr = getLen(p1) * getLen(p2);
  if (!mr) return 0;
  const r = dot(p1, p2) / mr;
  return Math.acos(Math.min(r, 1));
}
function cross(p1: Point, p2: Point) {
  return p1.x * p2.y - p2.x * p1.y;
}
function getRotateAngle(p1: Point, p2: Point) {
  let angle = getAngle(p1, p2);
  if (cross(p1, p2) > 0) {
    angle *= -1;
  }
  return (angle * 180) / Math.PI;
}
function wrapFunc(el: HTMLElement, handler: Function) {
  const handlerAdmin = new Admin(el);
  handlerAdmin.add(handler);
  return handlerAdmin;
}
function getPoint(e: TouchEvent, point: number = 0) {
  const t = e.touches[point];
  return { x: t.pageX, y: t.pageY };
}

interface PointerEvents {
  rotate(e: PEvent): void;
  touchStart(e: PEvent): void;
  multipointStart(e: PEvent): void;
  multipointEnd(e: PEvent): void;
  pinch(e: PEvent): void;
  swiping(e: PEvent): void;
  swipe(e: PEvent): void;
  tap(e: PEvent): void;
  doubleTap(e: PEvent): void;
  longTap(e: PEvent): void;
  singleTap(e: PEvent): void;
  twoFingerPressMove(e: PEvent): void;
  touchMove(e: PEvent): void;
  touchEnd(e: PEvent): void;
  touchCancel(e: PEvent): void;
}

interface PointerOptions extends PointerEvents {
  threshold: number;
  longTapDelay: number;
}

interface PEvent extends TouchEvent {
  zoom: number;
  angle: number;
  deltaX: number;
  deltaY: number;
  direction: Direction;
}

type CombineEvent = PointerEvent | TouchEvent | MouseEvent;

class Pointer {
  constructor(el: HTMLElement | string, options: Partial<PointerOptions> = {}) {
    this.el = typeof el === "string" ? (document.querySelector(el) as HTMLElement) : el;
    var start = this.start.bind(this),
      move = this.move.bind(this),
      up = this.up.bind(this),
      out = this.out.bind(this),
      over = this.over.bind(this),
      cancel = this.cancel.bind(this);
    if (window.PointerEvent) {
      this.$on("touchstart", start);
      this.$on("pointerdown", start);
      // .$on("pointermove", move).$on("pointerup", up).$on("pointercancel", cancel);
    } else if (window.TouchEvent) {
      this.$on("touchstart", start);
      // .$on("touchmove", move).$on("touchend", up).$on("touchcancel", cancel);
    } else {
      this.$on("pointerdown", start);
      // this.$on("mousedown", start);
      // .$on("mousemove", move).$on("mouseup", up).$on("pointercancel", cancel);
    }
    this.rotate = this.wrapFunc(options.rotate);
    this.touchStart = this.wrapFunc(options.touchStart);
    this.multipointStart = this.wrapFunc(options.multipointStart);
    this.multipointEnd = this.wrapFunc(options.multipointEnd);
    this.pinch = this.wrapFunc(options.pinch);
    this.swipe = this.wrapFunc(options.swipe);
    this.tap = this.wrapFunc(options.tap);
    this.doubleTap = this.wrapFunc(options.doubleTap);
    this.longTap = this.wrapFunc(options.longTap);
    this.singleTap = this.wrapFunc(options.singleTap);
    this.swiping = this.wrapFunc(options.swiping);
    this.twoFingerPressMove = this.wrapFunc(options.twoFingerPressMove);
    this.touchMove = this.wrapFunc(options.touchMove);
    this.touchEnd = this.wrapFunc(options.touchEnd);
    this.touchCancel = this.wrapFunc(options.touchCancel);
    this.threshold = options.threshold || 30;
    this.longTapDelay = options.longTapDelay || 750;

    this._cancelAll = this.cancelAll.bind(this);
    window.addEventListener("scroll", this._cancelAll, false);
  }
  private el!: HTMLElement;
  private preV = { x: 0, y: 0 };
  private threshold = 0;
  private pinchStartLen = 0;
  private zoom = 1;
  private isDoubleTap = false;
  private rotate!: Admin;
  private touchStart!: Admin;
  private multipointStart!: Admin;
  private multipointEnd!: Admin;
  private pinch!: Admin;
  private swipe!: Admin;
  private tap!: Admin;
  private doubleTap!: Admin;
  private longTap!: Admin;
  private singleTap!: Admin;
  private swiping!: Admin;
  private twoFingerPressMove!: Admin;
  private touchMove!: Admin;
  private touchEnd!: Admin;
  private touchCancel!: Admin;
  private delta = 0;
  private last = 0;
  private now = 0;
  private tapTimeout = 0;
  private singleTimeout = 0;
  private longTapTimeout = 0;
  private swipeTimeout!: number;
  private longTapDelay!: number;
  private x1 = 0;
  private x2 = 0;
  private sx2 = 0;
  private y1 = 0;
  private y2 = 0;
  private sy2 = 0;
  private pre = { x: 0, y: 0 };
  private preventTap = false;
  private noop() {}
  private wrapFunc(handler: Function | undefined): Admin {
    return new Admin(this.el).add(handler || this.noop);
  }
  private $on<K extends keyof HTMLElementEventMap>(
    eventName: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    capture: boolean | AddEventListenerOptions = window.TouchEvent ? { passive: false } : false
  ) {
    this.el.addEventListener(eventName, handler, capture);
    return this;
  }
  private $off<K extends keyof HTMLElementEventMap>(
    eventName: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
  ) {
    this.el.removeEventListener(eventName, handler);
    return this;
  }

  private start(e: CombineEvent) {
    Event2PointerEvent(e);
    console.log(e);
    // this.now = Date.now();
    // this.x1 = e.touches[0].pageX;
    // this.y1 = e.touches[0].pageY;
    // this.delta = this.now - (this.last || this.now);
    // this.touchStart.dispatch(e, this.el);
    // const { x, y } = this.pre;
    // if (x !== -1) {
    //   this.isDoubleTap =
    //     this.delta > 0 &&
    //     this.delta <= 250 &&
    //     Math.abs(x - this.x1) < this.threshold &&
    //     Math.abs(y - this.y1) < this.threshold;
    //   if (this.isDoubleTap) clearTimeout(this.singleTimeout);
    // }
    // this.pre.x = this.x1;
    // this.pre.y = this.y1;
    // this.last = this.now;
    // const preV = this.preV,
    //   len = e.touches.length;

    // if (len > 1) {
    //   this.cancelLongTap();
    //   this.cancelSingleTap();
    //   const v = getPoint(e, 1);
    //   preV.x = v.x;
    //   preV.y = v.y;
    //   this.pinchStartLen = getLen(v);
    //   this.multipointStart.dispatch(e, this.el);
    // }
    // this.isDoubleTap = false;
    // this.longTapTimeout = setTimeout(() => {
    //   this.longTap.dispatch(e, this.el);
    //   this.preventTap = true;
    // }, this.longTapDelay);
  }
  private move(e: PEvent) {
    let preV = this.preV,
      len = e.touches.length,
      { x: cx, y: cy } = getPoint(e);

    this.isDoubleTap = false;
    if (len > 1) {
      const { x, y } = getPoint(e, 1);
      const v = { x: x - cx, y: y - cy };
      if (preV.x) {
        if (this.pinchStartLen > 0) {
          e.zoom = getLen(v) / this.pinchStartLen;
          this.pinch.dispatch(e, this.el);
        }
        e.angle = getRotateAngle(v, preV);
        this.rotate.dispatch(e, this.el);
      }
      preV = v;
      if (this.x2 && this.sx2) {
        e.deltaX = (cx - this.x2 + x - this.sx2) / 2;
        e.deltaY = (cy - this.y2 + y - this.sy2) / 2;
      } else {
        e.deltaX = e.deltaY = 0;
      }
      this.sx2 = x;
      this.sy2 = y;
    } else {
      if (this.x2) {
        e.deltaX = cx - this.x2;
        e.deltaY = cy - this.y2;
        const mx = Math.abs(this.x1 - this.x2);
        const my = Math.abs(this.y1 - this.y2);
        if (mx > 10 || my > 10) {
          this.preventTap = true;
        }
      } else {
        e.deltaX = e.deltaY = 0;
      }
      this.swiping.dispatch(e, this.el);
    }
    this.cancelLongTap();
    this.x2 = cx;
    this.y2 = cy;
    if (len > 1) e.preventDefault();
  }
  private up(e: PEvent) {
    this.cancelLongTap();
    if (e.touches.length === 1) {
      this.multipointEnd.dispatch(e, this.el);
      this.sx2 = this.sy2 = 0;
    }
    //swipe
    if (
      (this.x2 && Math.abs(this.x1 - this.x2) > this.threshold) ||
      (this.y2 && Math.abs(this.y1 - this.y2) > this.threshold)
    ) {
      e.direction = this.swipeDirection(this.x1, this.x2, this.y1, this.y2);
      this.swipeTimeout = setTimeout(() => {
        this.swipe.dispatch(e, this.el);
      }, 0);
    } else {
      this.tapTimeout = setTimeout(() => {
        if (!this.preventTap && !this.isDoubleTap) {
          this.tap.dispatch(e, this.el);
        } else if (this.isDoubleTap) {
          this.doubleTap.dispatch(e, this.el);
          this.isDoubleTap = false;
        }
      }, 0);
    }
    this.touchEnd.dispatch(e, this.el);
    this.preV = { x: 0, y: 0 };
    this.zoom = 1;
    this.pinchStartLen = 0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  private out() {
    console.log("out");
  }
  private over() {
    console.log("over");
  }
  private cancel(e: PEvent) {
    this.cancelAll();
    this.touchCancel.dispatch(e, this.el);
  }
  private cancelAll() {
    console.log("cancelAll");
  }
  private _cancelAll!: () => void;
  private cancelLongTap() {
    clearTimeout(this.longTapTimeout);
  }
  private cancelSingleTap() {
    clearTimeout(this.singleTimeout);
  }
  private swipeDirection(x1: number, x2: number, y1: number, y2: number): Direction {
    return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? (x1 - x2 > 0 ? "left" : "right") : y1 - y2 > 0 ? "up" : "down";
  }

  on(evt: keyof PointerEvents, handler: (e: PointerEvent) => void) {
    if (evt in this) {
      this[evt].add(handler);
    }
    return this;
  }
  off(evt: keyof PointerEvents, handler: (e: PointerEvent) => void) {
    if (evt in this) {
      this[evt].del(handler);
    }
    return this;
  }
  destroy() {
    if (this.singleTimeout) clearTimeout(this.singleTimeout);
    if (this.tapTimeout) clearTimeout(this.tapTimeout);
    if (this.longTapTimeout) clearTimeout(this.longTapTimeout);
    if (this.swipeTimeout) clearTimeout(this.swipeTimeout);

    // this.$off("touchstart", this.start)
    // .$off("touchmove", this.move as any)
    // .$off("touchend", this.up as any)
    // .$off("touchcancel", this.cancel);

    this.rotate.del();
    this.touchStart.del();
    this.multipointStart.del();
    this.multipointEnd.del();
    this.pinch.del();
    this.swipe.del();
    this.tap.del();
    this.doubleTap.del();
    this.longTap.del();
    this.singleTap.del();
    this.swiping.del();
    this.twoFingerPressMove.del();
    this.touchMove.del();
    this.touchEnd.del();
    this.touchCancel.del();
    for (const key in this) {
      this[key] = null as any;
    }
    window.removeEventListener("scroll", this._cancelAll);
    return null;
  }
}

function Event2PointerEvent(_e: CombineEvent) {
  if ("pointerId" in _e) {
  } else if ("touches" in _e) {
    Object.assign(_e, new PointerEventLikeTouch());
    // return e;
  } else {
    Object.assign(_e, new PointerEventLikeMouse());
  }
}

new Pointer("#div", {
  swiping(e) {
    e.direction === "down";
    console.log("swiping");
  },
});

class PointerEventLikeMouse {
  constructor(params?: { [K in keyof PointerEventLikeMouse]?: PointerEventLikeMouse[K] }) {
    Object.assign(this, params || {});
  }
  height: number = 1;
  isPrimary: boolean = true;
  pointerId: number = 1;
  pointerType: string = "mouse";
  pressure: number = 1;
  tangentialPressure: number = 0;
  tiltX: number = 0;
  tiltY: number = 0;
  twist: number = 0;
  width: number = 1;
}
class PointerEventLikeTouch extends PointerEventLikeMouse {
  constructor(params?: { [K in keyof PointerEventLikeTouch]?: PointerEventLikeTouch[K] }) {
    super(params);
  }
  button: number = 0;
  buttons: number = 1;
  clientX: number = 0;
  clientY: number = 0;
  pointerType: string = "touch";
  fromElement: EventTarget | null = null;
  layerX: number = 0;
  layerY: number = 0;
  movementX: number = 0;
  movementY: number = 0;
  offsetX: number = 0;
  offsetY: number = 0;
  pageX: number = 0;
  pageY: number = 0;
  relatedTarget: EventTarget | null = null;
  screenX: number = 0;
  screenY: number = 0;
  toElement: EventTarget | null = null;
  x: number = 0;
  y: number = 0;
}
