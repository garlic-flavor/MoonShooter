import { $ } from "jquery";
function _makeDial(elem) {
    const $e = $(elem);
    // 全体
    $e.css({
        display: "inline-block",
        overflow: "hidden",
        background: "linear-gradient(to right, gray, lightgray, gray)",
        "touch-action": "manipulation",
        cursor: "pointer",
    })
        .append(
    // メモリの上側のセンター表示
    $("<div>").css({
        position: "relative",
        display: "block",
        height: "20%",
        "background-color": "red",
        "border-top": "1px solid dimgray",
        "border-left": "2px solid dimgray",
        "border-right": "2px solid white",
        left: "50%",
        width: "1",
    }))
        .append(
    // メモリ上下の境界
    $("<div>").css({
        position: "relative",
        display: "block",
        height: "0px",
        width: "100%",
        "border-top": "1px solid dimgray",
        "border-bottom": "1px solid white",
    }));
    // 諸元初期値の設定
    const center = $e.width() / 2;
    let minValue = Number($e.attr("minValue"));
    if (minValue == null || Number.isNaN(minValue)) {
        minValue = 0;
    }
    let maxValue = Number($e.attr("maxValue"));
    if (!(minValue < maxValue)) {
        maxValue = minValue + 100;
    }
    let defaultValue = Number($e.attr("value"));
    if (!(minValue <= defaultValue && defaultValue <= maxValue)) {
        defaultValue = minValue;
    }
    let notch = Number($e.attr("notch"));
    if (!(0 < notch)) {
        notch = (maxValue - minValue) / 100;
    }
    let notchWidth = Number($e.attr("notchWidth"));
    if (!(0 < notchWidth)) {
        notchWidth = 10;
    }
    let scaleInterval = Number($e.attr("scaleInterval"));
    if (!(0 < scaleInterval)) {
        scaleInterval = notch * 10;
    }
    let indicatorInterval = Number($e.attr("indicatorInterval"));
    if (!(0 < indicatorInterval)) {
        indicatorInterval = scaleInterval * 5;
    }
    // メモリダイアルのコンテナ
    const $dial = $("<div>")
        .css({
        position: "relative",
        display: "block",
        height: "70%",
        width: ((maxValue - minValue) / notch) * notchWidth,
    })
        .appendTo($e);
    // valueを範囲内に収める。
    function getJustified(v) {
        if (!(minValue < v)) {
            v = minValue;
        }
        else if (maxValue < v) {
            v = maxValue;
        }
        return v;
    }
    // valueから$dial.left値を得る。
    // notch で整列させない
    function valueToLeft(v) {
        return (-(getJustified(v) - minValue) / notch) * notchWidth;
    }
    // $dialのleftからvalue値を得る。
    // notch で整列させる。
    function leftToValue(left) {
        return getJustified(minValue + Math.round(-left / notchWidth) * notch);
    }
    // valueから$dialのleftを設定する。
    function setValueTo$dial(newV) {
        $e.val(newV);
        $dial.css("left", `${valueToLeft(newV)}px`);
    }
    // 初期位置の設定
    setValueTo$dial(defaultValue);
    // メモリ
    function drawScale(v, indicator) {
        let height = 30;
        const left = center - valueToLeft(v);
        // メモリの数値表示
        if (indicator) {
            // メモリを少し長く
            height += 10;
            // 数値
            $("<div>")
                .css({
                position: "absolute",
                display: "block",
                top: `${height}%`,
                width: "0px",
                left: `${left}px`,
                "margin-left": `${indicator.length * -0.4}ch`,
                "text-shadow": "2px 1px white",
                "user-select": "none",
            })
                .text(v)
                .appendTo($dial);
        }
        // 目盛
        $("<div>")
            .css({
            position: "absolute",
            display: "inline-block",
            top: "0px",
            left: `${left}px`,
            height: `${height}%`,
            "border-left": "2px solid dimgray",
            "border-right": "2px solid white",
        })
            .appendTo($dial);
    }
    drawScale(minValue, minValue.toString());
    drawScale(maxValue, maxValue.toString());
    for (let v = (Math.floor(minValue / scaleInterval) + 1) * scaleInterval; v < maxValue; v += scaleInterval) {
        if (0 === v % indicatorInterval) {
            drawScale(v, v.toString());
        }
        else {
            drawScale(v);
        }
    }
    // スピナーとの連携
    const $spinner = $(`#${$e.attr("for")}`).on("change", (e) => {
        const val = getJustified(Number(e.target.value));
        $(e.target).val(val);
        setValueTo$dial(val);
    });
    // ドラッグ処理
    // ドラッグ開始
    $e.on("pointerdown", (e) => {
        const $tgt = $(e.target);
        // 開始位置
        const startX = parseInt($dial.css("left"), 10);
        // ドラッグ中
        $tgt.on("pointermove", (ee) => {
            // 新しい値
            const newV = leftToValue(startX + ee.clientX - e.clientX);
            // 新しい位置
            setValueTo$dial(newV);
            // onchange イベント呼び出し
            $e.trigger("change", newV);
            // スピナーの更新
            $spinner.val(newV);
            ee.preventDefault();
        });
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        // ドラッグ終了
    })
        .on("pointerup", (e) => {
        $(e.target).off("pointermove");
        e.target.releasePointerCapture(e.pointerId);
        e.preventDefault();
        // スクリプトからの値の設定
    })
        .on("input", (_, val) => {
        setValueTo$dial(val);
        $spinner.val(val);
        // ダブルクリック
    })
        .on("dblclick", (e) => {
        setValueTo$dial(defaultValue);
        $spinner.val(defaultValue);
        e.preventDefault();
    });
}
export default function makeDial(elem /*string | HTMLElement | JQuery<HTMLElement>*/) {
    const $elems = $(elem);
    $elems.each((_, e) => _makeDial(e));
    return $elems;
}
