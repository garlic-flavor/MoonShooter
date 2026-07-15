import * as SunCalc from "@noim/suncalc3";
import { $ } from "jquery";
import * as L from "leaflet";
//////////////////////////////////////////////////////////////////////
// 履歴
//==========================================================
// 履歴を更新する。
export function updateHistory(data) {
    const history = JSON.parse(window.localStorage.getItem("history") ?? "[]");
    if (data) {
        // 履歴を追加する。
        history.unshift(data);
        // 多すぎる履歴は削除する。
        if (10 < history.length) {
            history.pop();
        }
        window.localStorage.setItem("history", JSON.stringify(history));
    }
    // 履歴選択ボックスの更新。
    $("#history").empty();
    history.forEach((item) => {
        if (!item.session_name) {
            return;
        }
        $("<option>")
            .text(item.session_name)
            .val(item.session_name)
            .appendTo("#history");
    });
}
//////////////////////////////////////////////////////////////////////
// 画面は大きく分けて
// 1. フォーム
// 2. プログレスバー
// 3. 地図
// の3つに分けられる。これらを切り替える。
//==========================================================
let formScroll = 0;
export function showForms() {
    $("#progress_ui").hide();
    $("#map_grid").hide();
    $("#main_form").show();
    if (formScroll) {
        window.scrollTo(0, formScroll);
    }
}
//==========================================================
export function showProgress() {
    if (window.scrollY) {
        formScroll = window.scrollY;
        window.scrollTo(0, 0);
    }
    $("#map_grid").hide();
    $("#main_form").hide();
    $("#progress_ui").show();
    $("#progress_gauge").css("width", "1px");
}
//==========================================================
export function showMap() {
    if (window.scrollY) {
        formScroll = window.scrollY;
        window.scrollTo(0, 0);
    }
    $("#main_form").hide();
    $("#progress_ui").hide();
    $("#map_grid_ui").children().hide();
    $("#map_grid").show();
}
//==========================================================
// フォームに対象の位置を設定する。
export function setTargetPseudoLatLng(ll) {
    $("#target_pseudo_latlng").val(`${ll.lat},${ll.lng}`);
}
//==========================================================
// フォームから対象の位置を得る。
function getLatLng(str) {
    // 緯度経度が指定された場合
    // 34.1234, 135.1234
    const match = /[^-+0-9]*([+-]?[0-9]+\.[0-9]+)[^-+0-9]*([+-]?[0-9]+\.[0-9]+)/.exec(str);
    if (match) {
        return L.latLng(Number(match[1]), Number(match[2]));
    }
    // 34°45'00.7"N 135°09'47.4"E
    const m = /([+-]?\d{1,2})°(\d{2})'([.0-9]{4})"N ([+-]?\d{1,3})°(\d{2})'([.0-9]{4})"E/.exec(str);
    if (m) {
        const lat = Number(m[1]) + Number(m[2]) / 60.0 + Number(m[3]) / 3600.0;
        const lng = Number(m[4]) + Number(m[5]) / 60.0 + Number(m[6]) / 3600.0;
        return L.latLng(lat, lng);
    }
    return undefined;
}
//--------------------------------------------------
// 住所から緯度経度を検索する。
// [東京大学空間情報科学研究センター](https://geocode.csis.u-tokyo.ac.jp)
function searchLatLng(str) {
    return new Promise((response, reject) => {
        const url = "https://geocode.csis.u-tokyo.ac.jp/cgi-bin/simple_geocode.cgi";
        const req = new XMLHttpRequest();
        req.addEventListener("load", function () {
            const xml = this.responseXML;
            if (!xml) {
                return reject("住所の検索に失敗しました。");
            }
            const lat = Number(xml.getElementsByTagName("latitude")[0]?.textContent ?? "");
            const lng = Number(xml.getElementsByTagName("longitude")[0]?.textContent ?? "");
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                return response(L.latLng(lat, lng));
            }
            return reject("緯度経度を読み取ることができませんでした。");
        });
        req.addEventListener("error", () => {
            reject("住所の検索に失敗しました。");
        });
        req.addEventListener("abort", () => {
            reject("住所の検索は中断されました。");
        });
        req.open("GET", encodeURI(`${url}?addr=${str}`));
        req.send();
    });
}
//==========================================================
// テキストボックスから対象の見かけの位置を得る。
export async function getTargetPseudoLatLng() {
    const str = $("#target_pseudo_latlng").val();
    if (!str) {
        throw "対象の見かけの位置を入力してください。";
    }
    const ll = getLatLng(str) || (await searchLatLng(str));
    if (!ll) {
        throw "対象の見かけの位置が読み取れませんでした。";
    }
    return ll;
}
//==========================================================
// 対象の位置を地図から選ぶ画面を出す。
export function showMapToSetTargetPseudoLatLng() {
    showMap();
    $("#target_pseudo_latlng_from_map_ui").show();
}
//==========================================================
// 太陽の観測日が変更された。
export async function updateSunTimes(e) {
    if (!e.target) {
        return;
    }
    const day = $(e.target).prop("valueAsDate");
    const ll = await getTargetPseudoLatLng();
    if (!day || !ll) {
        ["rise", "set"].forEach((key) => {
            $(`#sun_info_${key}`).text("-");
        });
        return;
    }
    const times = SunCalc.getSunTimes(day, ll.lat, ll.lng);
    $("#sun_info_rise").text(times.sunriseStart.value.toLocaleString());
    $("#sun_info_set").text(times.sunsetEnd.value.toLocaleString());
}
//==========================================================
// 月の情報の更新
export async function updateMoonTimes(e) {
    if (!e.target) {
        return;
    }
    const day = $(e.target).prop("valueAsDate");
    const ll = await getTargetPseudoLatLng();
    if (!day || !ll) {
        ["rise", "set", "fraction"].forEach((key) => {
            $(`#moon_info_${key}`).text("-");
        });
        return;
    }
    const times = SunCalc.getMoonTimes(day, ll.lat, ll.lng, false);
    $("#moon_info_rise").text(times.rise?.toLocaleString() ?? "-");
    $("#moon_info_set").text(times.set?.toLocaleString() ?? "-");
    const data = SunCalc.getMoonData(day, ll.lat, ll.lng);
    $("#moon_info_fraction").text(`${Math.round(data.illumination.fraction * 100)}%`);
}
//==========================================================
// 月の満月を得る。
export function getNextFullMoon() {
    const day = $("#moon_observation_day").prop("valueAsDate") ?? new Date();
    const day2 = new Date(Number(day) + 1000 * 60 * 60 * 24);
    const data = SunCalc.getMoonIllumination(day2);
    $("#moon_observation_day")
        .prop("valueAsDate", new Date(data.next.fullMoon.value))
        .trigger("change");
}
//==========================================================
// 前の満月を得る。
export function getPrevFullMoon() {
    const day1 = $("#moon_observation_day").prop("valueAsDate") ?? new Date();
    const data1 = SunCalc.getMoonIllumination(day1);
    const day2 = new Date(data1.next.fullMoon.value - 1000 * 60 * 60 * 24 * 35);
    const data2 = SunCalc.getMoonIllumination(day2);
    $("#moon_observation_day")
        .prop("valueAsDate", new Date(data2.next.fullMoon.value))
        .trigger("change");
}
//////////////////////////////////////////////////////////////////////
// フォームのデータを読み取る。
//==========================================================
export function getFormData() {
    const ret = {};
    $("#main_form input").map(function () {
        const $this = $(this);
        const key = $this.attr("id");
        if (!key) {
            return undefined;
        }
        if ($this.attr("type") === "number") {
            ret[key] = Number($this.val());
        }
        else if ($this.attr("type") === "date") {
            ret[key] = $this.prop("valueAsDate");
        }
        else {
            ret[key] = $this.val();
        }
        return undefined;
    });
    ret.target_type = $("input[name='target_type']:checked").val();
    ret.data_to_import = undefined;
    if (!ret.session_name.trim()) {
        let name = new Date().toLocaleString();
        switch (ret.target_type) {
            case "sun_rise":
                name += ` ${ret.sun_observation_day.toLocaleDateString()} の日の出`;
                break;
            case "sun_set":
                name += ` ${ret.sun_observation_day.toLocaleDateString()} の日の入り`;
                break;
            case "moon_rise":
                name += ` ${ret.moon_observation_day.toLocaleDateString()} の月の出`;
                break;
            case "moon_set":
                name += ` ${ret.moon_observation_day.toLocaleDateString()} の月の入り`;
                break;
            default:
        }
        ret.session_name = name;
    }
    return ret;
}
//////////////////////////////////////////////////////////////////////
// プログレスバーの更新
//==========================================================
export function setProgress(p) {
    const percentage = Math.round(p * 100);
    $("#progress_label").text(`・・・${percentage}%`);
    $("#progress_gauge").css("width", `${percentage}%`);
}
//////////////////////////////////////////////////////////////////////
// 結果を表示する。
//==========================================================
export function showResult() {
    showMap();
    $("#result_ui").show();
}
//==========================================================
// エクスポートと履歴の更新
export function exportResult(data, ll, line) {
    data.ll = ll;
    data.to_import_data = undefined;
    data.line = line;
    data.target_type = $("input[name='target_type']:checked").val();
    $("#exported_data").val(JSON.stringify(data));
    updateHistory(data);
}
//==========================================================
// 結果画面で現在選択中の情報の表示。
export function updateLatLngDisplay(ll) {
    $("#info").text(ll.info);
    // GoogleMapへのリンクを設定する。
    $("#openGoogleMap")
        .off("click")
        .on("click", () => {
        window
            .open(`https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lng}`, "_blank")
            ?.focus();
    });
}
