// document.body.addEventListener("pinch", (e) => console.log(e));
document.body.addEventListener("pointerdown", start);
document.body.addEventListener("pointermove", throttle(move, 100));
document.body.addEventListener("pointerup", up);
var flag = false;
function start(e: PointerEvent) {
  flag = true;
  console.log(11);
}
function move(e: PointerEvent) {
  if (!flag) return;
  console.log(11);
}
function up(e: PointerEvent) {
  flag = false;
}
function throttle(fn: Function, wait: number = 0) {
  let callback = fn,
    timerId: number = 0,
    firstInvoke = true;
  function throttled(this: any) {
    let context = this,
      args = arguments;
    // 如果是第一次触发，直接执行
    if (firstInvoke) {
      callback.apply(context, args);
      firstInvoke = false;
      return;
    }
    // 如果定时器已存在，直接返回。
    if (timerId) return;
    timerId = setTimeout(function () {
      // 注意这里 将 clearTimeout 放到 内部来执行了
      clearTimeout(timerId);
      timerId = 0;
      callback.apply(context, args);
    }, wait);
  }
  // 返回一个闭包
  return throttled;
}
