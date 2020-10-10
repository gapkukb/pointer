define("helper", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.greater = exports.noop = exports.pickup = exports.throttle = exports.getRotateAngle = exports.getLen = exports.getDir = exports.disXy = exports.point = exports.getPoint = void 0;
    function getPoint(e, i) {
        if (i === void 0) { i = 0; }
        var _a = e.changedTouches[i], x = _a.pageX, y = _a.pageY;
        return { x: x, y: y, time: Date.now() };
    }
    exports.getPoint = getPoint;
    function point(x, y) {
        return { x: x, y: y, time: Date.now() };
    }
    exports.point = point;
    function disXy(begin, end) {
        return { x: end.x - begin.x, y: end.y - begin.y, time: Date.now() };
    }
    exports.disXy = disXy;
    function getDir(pre, now) {
        var x = now.x - pre.x, y = now.y - pre.y;
        return Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" /* RIGHT */ : "left" /* LEFT */) : y > 0 ? "down" /* DOWN */ : "up" /* UP */;
    }
    exports.getDir = getDir;
    function getLen(p) {
        // 获取坐标点与原点的向量长度
        return Math.sqrt(p.x * p.x + p.y * p.y);
    }
    exports.getLen = getLen;
    function dot(p1, p2) {
        return p1.x * p2.x + p1.y * p2.y;
    }
    function corss(p1, p2) {
        return p1.x * p2.y + p2.x * p1.y;
    }
    function getAngle(p1, p2) {
        // 获取两点之间的向量的夹角
        var m = getLen(p1) * getLen(p2);
        if (!m)
            return 0;
        var r = Math.min(1, dot(p1, p2) / m);
        return Math.acos(r);
    }
    function getRotateAngle(p1, p2) {
        var a = getAngle(p1, p2); //获取两点角度
        if (corss(p1, p2) > 0)
            a *= -1; //如果大于180度，那么取负值
        return (a * 180) / Math.PI; //转换为弧度
    }
    exports.getRotateAngle = getRotateAngle;
    function throttle(fn, wait) {
        if (wait === void 0) { wait = 0; }
        var cb = fn, t = 0, f = true;
        function throttled() {
            var ctx = this, args = arguments;
            // 如果是第一次触发，直接执行
            if (f) {
                cb.apply(ctx, args);
                f = false;
                return;
            }
            // 如果定时器已存在，直接返回。
            if (t)
                return;
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
    exports.throttle = throttle;
    function pickup(o) {
        var props = {}, methods = {};
        for (var key in o) {
            if (typeof o[key] === "function")
                methods[key] = o[key];
            else
                props[key] = o[key];
        }
        return [props, methods];
    }
    exports.pickup = pickup;
    function noop() { }
    exports.noop = noop;
    function greater(p1, p2, max) {
        return Math.abs(p1.x - p2.x) > max || Math.abs(p1.y - p2.y) > max;
    }
    exports.greater = greater;
});
define("index", ["require", "exports", "helper"], function (require, exports, helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Pointer = void 0;
    var emap = [
        "touchstart mspointerdown mousedown",
        "touchmove mspointermove mousemove",
        "touchend mspointerup mouseup",
        "touchcancel mspointercancel mouseleave",
    ].map(function (i) {
        return i
            .trim()
            .split(" ")
            .find(function (ii) { return "on" + ii in window; }) || "";
    });
    console.log(emap);
    window.setImmediate =
        window.setImmediate ||
            function (f) {
                return window.setTimeout(f, 0);
            };
    window.clearImmediate =
        window.clearImmediate ||
            function (n) {
                return window.clearTimeout(n);
            };
    var Pointer = /** @class */ (function () {
        function Pointer(el, options) {
            if (options === void 0) { options = {}; }
            this.init = helper_1.noop;
            this.throttle = 50;
            this.singleTime = 250;
            this.dbtapTime = 250;
            this.pressTime = 700;
            /** 判定为拖动-手指移动距离xy的最小值 */
            this.panMinXy = 10;
            /** 双击判断条件-两个手指点之间xy的最大范围 */
            this.maxXy = 30;
            /** 点击定时器 */
            this.tapTimer = 0;
            /** 单击定时器 */
            this.singleTimer = 0;
            /** 双击定时器 */
            this.dbtapTimer = 0;
            /** 长按定时器 */
            this.pressTimer = 0;
            /** 滑动定时器 */
            this.swipeTimer = 0;
            /** 缩放比 */
            this.zoom = 0;
            /** 上次点击点 */
            this.prePoint = {};
            /** 按下时第一个手指点 begin point 1 */
            this.bp1 = {};
            /** 按下时第二个手指点 begin point 2 */
            this.bp2 = {};
            /** 移动时第一个手指点 move point 1*/
            this.mp1 = {};
            /** 移动时第二个手指点 move point 2*/
            this.mp2 = {};
            /** 双指触摸初始双指距离xy */
            this.dxy = {};
            /** 标记是否是双击 */
            this.isDbtap = false;
            /** 双指捏放捏合初始宽度 */
            this.pinchLength = 0;
            /** 阻止点击 */
            this.preventTap = false;
            /** 监听事件合集 */
            this.handlers = {};
            this.started = false;
            this.e = null;
            this.el = typeof el === "string" ? document.querySelector(el) : el;
            var _a = helper_1.pickup(options), props = _a[0], methods = _a[1];
            //合并传入参数属性
            Object.assign(this, props);
            this.$begin = this.$begin.bind(this);
            this.$move = helper_1.throttle(this.$move.bind(this), this.throttle);
            this.$end = this.$end.bind(this);
            this.$out = this.$out.bind(this);
            this.abortAll = this.abortAll.bind(this);
            this.$on(0, this.$begin).$on(1, this.$move).$on(2, this.$end).$on(3, this.$out);
            //监听传入的事件
            for (var key in methods) {
                this.on(key, methods[key]);
            }
            this.init.call(this);
            window.addEventListener("scroll", this.abortAll);
        }
        Pointer.prototype.$begin = function (e) {
            var _this = this;
            // 如果是pointer事件且不是主键
            this.e = e;
            this.emit("begin");
            //记录按下时第一个手指点
            this.bp1 = helper_1.getPoint(e);
            this.preventTap = false;
            this.started = true;
            var now = Date.now(), delta = now - (this.prePoint.time || now);
            //delta>0表示存在上次点击的坐标，则判定本次是第二次点击
            if (delta > 0) {
                //如果两次点击时间和距离都在阈值内，判定为双击同时取消触发单机
                this.isDbtap = delta > 0 && delta <= this.dbtapTime && !helper_1.greater(this.bp1, this.prePoint, this.maxXy);
                if (this.isDbtap)
                    clearTimeout(this.singleTimer);
            }
            //将上次坐标点更新为当前
            this.prePoint = this.bp1;
            if (e.touches.length > 1) {
                //多点触摸
                this.abortPress(); //取消长按
                this.abortSingle(); //取消单击
                this.bp2 = helper_1.getPoint(e, 1);
                // dxy 两个触摸点之间的xy距离点
                this.dxy = helper_1.disXy(this.bp1, this.bp2);
                this.pinchLength = helper_1.getLen(this.dxy);
                this.emit("multibegin");
            }
            this.pressTimer = window.setTimeout(function () {
                _this.emit("press");
                _this.preventTap = true;
            }, this.pressTime);
        };
        Pointer.prototype.$move = function (e) {
            if (!this.started)
                return;
            this.e = e;
            this.isDbtap = false; // 如果有移动就取消双击事件
            // 第一个触摸点
            var p1 = helper_1.getPoint(e), _a = this.mp1, x = _a.x, y = _a.y;
            if (e.touches.length > 1) {
                e.preventDefault();
                //第二个触摸点
                var p2 = helper_1.getPoint(e, 1), 
                //两者xy距离
                dxy = helper_1.disXy(p1, p2), _b = this.mp2, x2 = _b.x, y2 = _b.y;
                //this.dxy.x存在则表示按下时也是双指
                if (this.dxy.x) {
                    //且按下时两指距离大于0
                    if (this.pinchLength > 0) {
                        //通过当前的双指向量长度和按下时的双指向量长度求出缩放值
                        this.zoom = e.zoom = helper_1.getLen(dxy) / this.pinchLength;
                        this.emit("pinch");
                    }
                    //求出两个向量之间的角度
                    e.angle = helper_1.getRotateAngle(dxy, this.dxy);
                    this.emit("rotate");
                }
                this.dxy = dxy;
                // x存在表示之前有移动，x2存在表示之前有双指移动，否则dxy距离为0
                e.dx = x && x2 ? (p1.x - x + p2.x - x2) / 2 : 0;
                e.dy = y && y2 ? (p1.x - x + p2.x - y2) / 2 : 0;
                this.mp2 = p2;
                p2 = dxy = null;
                this.emit("multipan");
            }
            else {
                //x 如果存在表示之前有移动，否则dxy距离为0
                e.dx = x ? p1.x - x : 0;
                e.dy = y ? p1.y - y : 0;
                //如果移动中的当前点和按下时的点距离大于10，则视为拖动而不是点击。
                if (helper_1.greater(this.bp1, p1, this.panMinXy))
                    this.preventTap = true;
                this.emit("pan");
            }
            this.emit("move");
            this.abortPress();
            this.mp1 = p1;
            p1 = null;
        };
        Pointer.prototype.$end = function (e) {
            var _this = this;
            if (!this.started)
                return;
            this.e = e;
            this.started = false;
            this.abortPress();
            if (e.touches.length < 2) {
                this.emit("multiend");
                this.mp2 = {};
                if (this.zoom && this.zoom !== 1) {
                    this.emit("pinch" + (this.zoom < 1 ? "in" : "out"));
                }
            }
            if (helper_1.greater(this.bp1, this.mp1, this.maxXy)) {
                e.dir = helper_1.getDir(this.bp1, this.mp1);
                e.dx = this.mp1.x - this.bp1.x;
                e.dy = this.mp1.y - this.bp1.y;
                this.swipeTimer = setImmediate(function () {
                    _this.emit("swipe");
                    _this.emit("swipe" + e.dir);
                });
            }
            else {
                this.tapTimer = setImmediate(function () {
                    if (!_this.preventTap)
                        _this.emit("tap");
                    if (_this.isDbtap) {
                        _this.emit("dbtap");
                        _this.isDbtap = false;
                    }
                });
                if (!this.isDbtap) {
                    this.singleTimer = setTimeout(function () {
                        _this.emit("singletap");
                    }, this.singleTime);
                }
            }
            this.emit("end");
            this.dxy = {};
            this.pinchLength = 0;
            this.bp1 = this.mp1 = {};
            this.zoom = 0;
        };
        Pointer.prototype.$out = function (e) {
            this.abortAll();
            this.emit("abort");
        };
        Pointer.prototype.$on = function (n, handler) {
            this.el.addEventListener(emap[n], handler, false);
            return this;
        };
        Pointer.prototype.$off = function (n, handler) {
            this.el.removeEventListener(emap[n], handler);
            return this;
        };
        Pointer.prototype.emit = function (e) {
            var _this = this;
            var handlers = this.handlers[e] || [];
            handlers.forEach(function (f) { return f.call(_this, _this.e); });
        };
        Pointer.prototype.abortPress = function () {
            clearTimeout(this.pressTimer);
        };
        Pointer.prototype.abortSingle = function () {
            clearTimeout(this.singleTimer);
        };
        Pointer.prototype.abortAll = function () {
            this.preventTap = true;
            clearTimeout(this.singleTimer);
            clearTimeout(this.pressTimer);
            clearImmediate(this.tapTimer);
            clearImmediate(this.swipeTimer);
        };
        Pointer.prototype.on = function (e, handler) {
            (this.handlers[e] = this.handlers[e] || []).push(handler);
            return this;
        };
        Pointer.prototype.off = function (e, handler) {
            var handlers = this.handlers[e] || [], i = handlers.length;
            if (handler)
                while (i--)
                    handlers[i] === handler && handlers.splice(i, 1);
            else
                delete this.handlers[e];
            return this;
        };
        Pointer.prototype.destroy = function () {
            this.abortAll();
            this.$off(0, this.$begin).$off(1, this.$move).$off(2, this.$end).$off(3, this.$out);
            for (var key in this) {
                // this[key] = null as any;
                delete this[key];
            }
            window.removeEventListener("scroll", this.abortAll);
            return null;
        };
        return Pointer;
    }());
    exports.Pointer = Pointer;
    new Pointer(document.body, {
        swipeleft: function (e) {
            console.log(e);
        },
        swiperight: function (e) {
            console.log(e);
        },
        tap: function (e) {
            console.log("tap");
        },
        singletap: function (e) {
            console.log("singletap");
        },
        dbtap: function (e) {
            console.log("dbtap");
        },
    });
});
//# sourceMappingURL=index.js.map