import * as SunCalc from "@noim/suncalc3";
import { $ } from "jquery";
import makeDial from "./dial.mjs";
import * as D from "./dom.mjs";
import { MyMap } from "./map.mjs";
$(document).ready(() => {
    $("#root").show();
    // 地図の初期化
    const M = new MyMap();
    //////////////////////////////////////////////////////////////////////
    // フォーム画面 / 対象位置選択画面。
    //----------------------------------------------------------
    // 履歴の設定。
    D.updateHistory();
    // ダイアルコントロールの設定
    makeDial(".dial");
    //----------------------------------------------------------
    // 対象の見かけの位置を地図から選ぶ
    $("#set_target_pseudo_latlng_from_map").on("click", async () => {
        try {
            const ll = await D.getTargetPseudoLatLng();
            D.showMapToSetTargetPseudoLatLng();
            M.startToSetTargetPseudoLatLng(ll);
        }
        catch (error) {
            alert(error);
        }
    });
    //----------------------------------------------------------
    // 対象の見かけの位置を地図から選び、決定する。
    $("#target_pseudo_latlng_select").on("click", () => {
        D.setTargetPseudoLatLng(M.getAndEndSelectPseudoLatLng());
        D.showForms();
    });
    //----------------------------------------------------------
    // 対象の位置をクリップボードから読み込む。
    $("#target_pseudo_latlng")
        .on("paste", (e) => {
        const txt = e.originalEvent.clipboardData?.getData("text");
        $(e.target).val(txt);
        $("#set_target_pseudo_latlng_from_map").trigger("click");
        e.preventDefault();
    })
        .on("click", function () {
        this.select();
    });
    //----------------------------------------------------------
    // 履歴トグルボタン
    $("#show_history_field_button").on("click", (e) => {
        $(e.target).hide();
        $("#hide_history_field_button").show();
        $("#history_field").show();
    });
    $("#hide_history_field_button").on("click", (e) => {
        $(e.target).hide();
        $("#show_history_field_button").show();
        $("#history_field").hide();
    });
    //////////////////////////////////////////////////////////////////////
    // 観測日
    //----------------------------------------------------------
    // 太陽の観測日の初期値
    $("#sun_observation_day")
        .prop("valueAsDate", new Date())
        .on("change", D.updateSunTimes)
        .trigger("change");
    //----------------------------------------------------------
    // 月の観測日の初期値
    $("#moon_observation_day")
        .prop("valueAsDate", new Date())
        .on("change", D.updateMoonTimes)
        .trigger("change");
    //----------------------------------------------------------
    // 前の満月
    $("#get_prev_fullmoon").on("click", D.getPrevFullMoon);
    //----------------------------------------------------------
    // 次の満月
    $("#get_next_fullmoon").on("click", D.getNextFullMoon);
    //////////////////////////////////////////////////////////////////////
    // フォーム画面 実行ボタンの処理
    //----------------------------------------------------------
    // 太陽に関して
    async function exec_for_sun(mode) {
        try {
            // フォームの値の読み取り
            const ll = await D.getTargetPseudoLatLng();
            // プログレス画面の表示
            D.showProgress();
            // フォームデータの収集
            const formData = D.getFormData();
            const the_day = formData.sun_observation_day;
            // 見かけの太陽の位置の標高を調べる
            const tip_height = (await M.getHeight(ll)) + formData.target_pseudo_height;
            // 日の出、日の入りの情報の取得。
            const times = SunCalc.getSunTimes(the_day, ll.lat, ll.lng, ll.alt);
            // 調べる時刻の列挙
            const timing = [];
            if (mode === "sun_rise") {
                // 日の出以前は1分毎に調べる。
                for (let t = formData.minutes_before_sun_rise; 0 < t; t--) {
                    timing.push(new Date(times.sunriseStart.ts - t * 60 * 1000));
                }
                // 日の出から10分は1分毎に調べる。
                for (let t = 0; t < 10; t++) {
                    if (formData.minutes_after_sun_rise < t) {
                        break;
                    }
                    timing.push(new Date(times.sunriseStart.ts + t * 60 * 1000));
                }
                // 日の出から10分以降は10分毎に調べる。
                for (let t = 10; t < formData.minutes_after_sun_rise; t += 10) {
                    timing.push(new Date(times.sunriseStart.ts + t * 60 * 1000));
                }
            }
            else if (mode === "sun_set") {
                // 日の入り以降は1分毎に調べる。
                for (let t = formData.minutes_after_sun_set; 0 < t; t--) {
                    timing.push(new Date(times.sunsetEnd.ts + t * 60 * 1000));
                }
                // 日の入りの10分前までは1分毎に調べる。
                for (let t = 0; t < 10; t++) {
                    if (formData.minutes_before_sun_set < t) {
                        break;
                    }
                    timing.push(new Date(times.sunsetEnd.ts - t * 60 * 1000));
                }
                // 日の入りの10分以前は10分ごとに調べる。
                for (let t = 10; t < formData.minutes_before_sun_set; t += 10) {
                    timing.push(new Date(times.sunsetEnd.ts - t * 60 * 1000));
                }
            }
            else {
                throw `${mode} is wrong`;
            }
            // 結果データを格納する。
            const line = [];
            for (let i = 0; i < timing.length; i++) {
                const t = timing[i];
                const pos = SunCalc.getPosition(t, ll.lat, ll.lng);
                const res = await M.getShadow(12, ll, tip_height, pos, formData.camera_height, formData.far_distance * 1000, (p) => {
                    D.setProgress((i + p) / timing.length);
                });
                if (res) {
                    const size = M.getSunSize(ll, res);
                    line.push({
                        lat: res.lat,
                        lng: res.lng,
                        date: t,
                        info: `太陽の見かけの大きさ: ${size}m`,
                    });
                }
                D.setProgress((i + 1) / timing.length);
            }
            if (line.length === 0) {
                alert("この設定ではドンしませんでした。");
                D.showForms();
                return;
            }
            // ドンライン表示
            D.showResult();
            M.startResult(ll, line);
            // export
            D.exportResult(formData, ll, line);
        }
        catch {
            alert("処理に失敗しました。");
            D.showForms();
        }
    }
    //----------------------------------------------------------
    // 月に関して
    async function exec_for_moon(mode) {
        try {
            // フォームの値の読み取り
            const ll = await D.getTargetPseudoLatLng();
            // プログレス画面の表示
            D.showProgress();
            // フォームデータの収集
            const formData = D.getFormData();
            const the_day = formData.sun_observation_day;
            // 見かけの太陽の位置の標高を調べる
            const tip_height = (await M.getHeight(ll)) + formData.target_pseudo_height;
            // 月の出、月の入りの情報の取得。
            const times = SunCalc.getMoonTimes(the_day, ll.lat, ll.lng, false);
            // 調べる時刻の列挙
            const timing = [];
            if (mode === "moon_rise") {
                // 月の出以前は1分毎に調べる。
                for (let t = formData.minutes_before_moon_rise; 0 < t; t--) {
                    timing.push(new Date(Number(times.rise) - t * 60 * 1000));
                }
                // 月の出から10分は1分毎に調べる。
                for (let t = 0; t < 10; t++) {
                    if (formData.minutes_after_moon_rise < t) {
                        break;
                    }
                    timing.push(new Date(Number(times.rise) + t * 60 * 1000));
                }
                // 月の出から10分以降は10分毎に調べる。
                for (let t = 10; t < formData.minutes_after_moon_rise; t += 10) {
                    timing.push(new Date(Number(times.rise) + t * 60 * 1000));
                }
            }
            else if (mode === "moon_set") {
                // 月の入り以降は1分毎に調べる。
                for (let t = formData.minutes_after_moon_set; 0 < t; t--) {
                    timing.push(new Date(Number(times.set) + t * 60 * 1000));
                }
                // 月の入りの10分前までは1分毎に調べる。
                for (let t = 0; t < 10; t++) {
                    if (formData.minutes_before_moon_set < t) {
                        break;
                    }
                    timing.push(new Date(Number(times.set) - t * 60 * 1000));
                }
                // 月の入りの10分以前は10分ごとに調べる。
                for (let t = 10; t < formData.minutes_before_moon_set; t += 10) {
                    timing.push(new Date(Number(times.set) - t * 60 * 1000));
                }
            }
            else {
                throw `${mode} is wrong`;
            }
            // 結果データを格納する。
            const line = [];
            for (let i = 0; i < timing.length; i++) {
                const t = timing[i];
                const pos = SunCalc.getMoonPosition(t, ll.lat, ll.lng);
                // 標高による差分の補正
                pos.altitude = Math.atan((pos.distance * Math.sin(pos.altitude) - tip_height) /
                    (pos.distance * Math.cos(pos.altitude)));
                const res = await M.getShadow(12, ll, tip_height, pos, formData.camera_height, formData.far_distance * 1000, (p) => {
                    D.setProgress((i + p) / timing.length);
                });
                if (res) {
                    const size = M.getMoonSize(ll, res, pos);
                    line.push({
                        lat: res.lat,
                        lng: res.lng,
                        date: t,
                        info: `月の見かけの大きさ: ${size}m`,
                    });
                }
                D.setProgress((i + 1) / timing.length);
            }
            if (line.length === 0) {
                alert("この設定ではドンしませんでした。");
                D.showForms();
                return;
            }
            // ドンライン表示
            D.showResult();
            M.startResult(ll, line);
            // export
            D.exportResult(formData, ll, line);
        }
        catch {
            alert("処理に失敗しました。");
            D.showForms();
        }
    }
    //------------------------------------------------
    // 実行
    $("#exec").on("click", () => {
        const mode = $("input[name='target_type']:checked").val();
        switch (mode) {
            case "sun_rise":
            case "sun_set":
                exec_for_sun(mode);
                break;
            case "moon_rise":
            case "moon_set":
                exec_for_moon(mode);
                break;
            default:
        }
    });
    //////////////////////////////////////////////////////////////////////
    // 読み込みボタンの処理
    $("#import_data").on("click", () => {
        const data = (() => {
            const to_import = $("#data_to_import").val().trim();
            // インポート
            if (to_import) {
                return JSON.parse(to_import);
                // 履歴から
            }
            else {
                const h_name = $("#history").val();
                if (!h_name) {
                    return undefined;
                }
                const history = JSON.parse(window.localStorage.getItem("history") ?? "{}");
                return history.find((item) => item.session_name === h_name);
            }
        })();
        if (!data) {
            return;
        }
        // フォームへの書き戻し
        for (const key in data) {
            const $item = $(`#${key}`);
            if ($item.attr("type") === "date") {
                $item.prop("valueAsDate", new Date(data[key]));
            }
            else {
                $item.val(data[key]);
            }
        }
        $(`#${data.target_type}`).click();
        // 結果が保存されている場合は結果の表示。
        if (data.ll && data.line) {
            D.showResult();
            M.startResult(data.ll, data.line);
        }
    });
    //////////////////////////////////////////////////////////////////////
    // 結果表示画面
    //----------------------------------------------------------
    // 結果表示画面の戻るボタン
    $("#result_back").on("click", () => {
        M.endResult();
        D.showForms();
    });
});
