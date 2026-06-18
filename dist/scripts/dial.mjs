import { $ } from "jquery";
function _makeDial(elem) {
    const $e = $(elem);
    //----------------------------------------------------------
    // 全体
    $e.addClass("dial_container")
        // メモリの上側のセンター表示
        .append($("<div>").addClass("center_indicator"))
        // メモリ上下の境界
        .append($("<div>").addClass("middle_separator"));
    //----------------------------------------------------------
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
    //----------------------------------------------------------
    // メモリのコンテナ
    const $dial = $("<div>")
        .addClass("scale_container")
        .css("width", ((maxValue - minValue) / notch) * notchWidth)
        .appendTo($e);
    //------------------------------------------------
    // メモリの位置合わせ
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
    //----------------------------------------------------------
    // 初期位置の設定
    setValueTo$dial(defaultValue);
    //----------------------------------------------------------
    // メモリ描画
    function drawScale(v, indicator) {
        const left = center - valueToLeft(v);
        // メモリの数値表示
        if (indicator) {
            // 数値
            $("<div>")
                .addClass("indicator")
                .css("left", left)
                .text(v)
                .appendTo($dial);
        }
        // 目盛
        $("<div>")
            .addClass(indicator ? "scale-long" : "scale-short")
            .css("left", left)
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
    //----------------------------------------------------------
    // スピナーとの連携
    const $spinner = $(`#${$e.attr("for")}`).on("change", (e) => {
        const val = getJustified(Number(e.target.value));
        $(e.target).val(val);
        setValueTo$dial(val);
    });
    //----------------------------------------------------------
    // イベント処理
    let click_count = 0;
    let when_down = 0;
    const click_interval = 200;
    let scrollY = 0;
    //------------------------------------------------
    // ドラッグ処理
    // ドラッグ開始
    $e.on("pointerdown", (e) => {
        // スクロールを止める。
        scrollY = window.scrollY;
        $("html, body").css({
            "overscroll-behavior": "none",
            position: "fixed",
            top: `-${window.scrollY}px`,
        });
        const $tgt = $(e.target);
        // 開始位置
        let prevLeft = parseInt($dial.css("left"), 10);
        let prevX = Number(e.pageX);
        const prevY = Number(e.pageY) - scrollY;
        let delta = 0;
        // ドラッグ中
        $tgt.on("pointermove", (ee) => {
            const ratio = Math.max(1, Math.abs(Number(ee.pageY) - prevY) / 50);
            // 新しい値
            const rawValue = delta + prevLeft + (Number(ee.pageX) - prevX) / ratio;
            const newV = leftToValue(rawValue);
            prevLeft = valueToLeft(newV);
            delta = rawValue - prevLeft;
            prevX = Number(ee.pageX);
            // 新しい位置
            setValueTo$dial(newV);
            // onchange イベント呼び出し
            $e.trigger("change", newV);
            // スピナーの更新
            $spinner.val(newV);
            ee.preventDefault();
        });
        when_down = Date.now();
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
    })
        // ドラッグ終了
        .on("pointerup", (e) => {
        $(e.target).off("pointermove");
        e.target.releasePointerCapture(e.pointerId);
        $("html, body").css({
            "overscroll-behavior": "auto",
            position: "relative",
            top: "0px",
        });
        window.scrollTo(0, scrollY);
        if (Date.now() - when_down < click_interval) {
            if (!click_count) {
                // シングルクリック
                click_count++;
                setTimeout(() => {
                    click_count = 0;
                }, click_interval * 2);
            }
            else {
                // ダブルクリック
                setValueTo$dial(defaultValue);
                $spinner.val(defaultValue);
            }
        }
        e.preventDefault();
    })
        // スクリプトからの値の設定
        .on("input", (_, val) => {
        setValueTo$dial(val);
        $spinner.val(val);
    });
}
export default function makeDial(elem) {
    const $elems = $(elem);
    $elems.each((_, e) => _makeDial(e));
    return $elems;
}
