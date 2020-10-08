"use strict";
document.body.addEventListener("pointerdown", start);
document.body.addEventListener("pointermove", throttle(move, 100));
document.body.addEventListener("pointerup", up);
var flag = false;
function start(e) {
    flag = true;
    console.log(11);
}
function move(e) {
    if (!flag)
        return;
    console.log(11);
}
function up(e) {
    flag = false;
}
function throttle(fn, wait) {
    if (wait === void 0) { wait = 0; }
    var callback = fn, timerId = 0, firstInvoke = true;
    function throttled() {
        var context = this, args = arguments;
        if (firstInvoke) {
            callback.apply(context, args);
            firstInvoke = false;
            return;
        }
        if (timerId)
            return;
        timerId = setTimeout(function () {
            clearTimeout(timerId);
            timerId = 0;
            callback.apply(context, args);
        }, wait);
    }
    return throttled;
}
