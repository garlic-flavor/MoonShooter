import * as SunCalc from "@noim/suncalc3";
import { $ } from "jquery";
import * as L from "leaflet";
import type * as T from "./type.mjs";

//////////////////////////////////////////////////////////////////////
// 履歴
//==========================================================
// 履歴を更新する。
export function updateHistory(data?: any) {
  const history: any[] = JSON.parse(
    window.localStorage.getItem("history") ?? "[]",
  );
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
export function showForms() {
  $("#progress_ui").hide();
  $("#map_grid").hide();
  $("#main_form").show();
}
//==========================================================
export function showProgress() {
  $("#map_grid").hide();
  $("#main_form").hide();
  $("#progress_ui").show();
  $("#progress_gauge").css("width", "1px");
}
//==========================================================
export function showMap() {
  $("#main_form").hide();
  $("#progress_ui").hide();
  $("#map_grid_ui").children().hide();
  $("#map_grid").show();
}

//==========================================================
// ラジオボタンで撮影対象が切り替えられた。
export function targetTypeOnChange(e: Event) {
  if (!e.target) {
    return;
  }
  const val = $(e.target).val() as string;
  $("#submit_button_container").children().hide();
  if ("sun_rise" === val) {
    $("#about_sun_observation_day").show();
    $("#about_moon_observation_day").hide();
    $("#minutes_about_sun_rise").show();
    $("#minutes_about_sun_set").hide();
    $("#exec_for_sun_rise").show();
  } else if ("sun_set" === val) {
    $("#about_sun_observation_day").show();
    $("#about_moon_observation_day").hide();
    $("#minutes_about_sun_rise").hide();
    $("#minutes_about_sun_set").show();
    $("#exec_for_sun_set").show();
  } else if ("moon_rise" === val) {
    $("#about_sun_observation_day").hide();
    $("#about_moon_observation_day").show();
    $("#minutes_about_moon_rise").show();
    $("#minutes_about_moon_set").hide();
    $("#exec_for_moon_rise").show();
  } else if ("moon_set" === val) {
    $("#about_sun_observation_day").hide();
    $("#about_moon_observation_day").show();
    $("#about_sun").hide();
    $("#about_moon").show();
    $("#minutes_about_moon_rise").hide();
    $("#minutes_about_moon_set").show();
    $("#exec_for_moon_set").show();
  }
}
//==========================================================
// フォームに対象の位置を設定する。
export function setTargetPseudoLatLng(ll: L.LatLng) {
  $("#target_pseudo_latlng").val(`${ll.lat},${ll.lng}`);
}

//==========================================================
// フォームから対象の位置を得る。
export function getTargetPseudoLatLng(): L.LatLng {
  const res = /\/@([0-9.]+),([0-9.]+),\d\d?z\//.exec(
    $("#target_pseudo_latlng").val() as string,
  );
  let ll: number[];
  if (res) {
    ll = [Number(res[1]), Number(res[2])];
  } else {
    ll = JSON.parse(`[${$("#target_pseudo_latlng").val() as string}]`);
  }
  if (ll[0] == null || ll[1] == null) {
    throw "対象の見かけの位置が読み取れませんでした。";
  }
  return L.latLng(ll[0], ll[1]);
}

//==========================================================
// 対象の位置を地図から選ぶ画面を出す。
export function showMapToSetTargetPseudoLatLng() {
  showMap();
  $("#target_pseudo_latlng_from_map_ui").show();
}

//==========================================================
// 太陽の観測日が変更された。
export function updateSunTimes(e: Event) {
  if (!e.target) {
    return;
  }
  const day = $(e.target).prop("valueAsDate");
  const ll = getTargetPseudoLatLng();
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
export function updateMoonTimes(e: Event) {
  if (!e.target) {
    return;
  }
  const day = $(e.target).prop("valueAsDate");
  const ll = getTargetPseudoLatLng();
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
  $("#moon_info_fraction").text(
    `${Math.round(data.illumination.fraction * 100)}%`,
  );
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
  const ret: any = {};
  $("#main_form input").map(function () {
    const $this = $(this);
    const key = $this.attr("id");
    if (!key) {
      return undefined;
    }
    if ($this.attr("type") === "number") {
      ret[key] = Number($this.val() as number);
    } else if ($this.attr("type") === "date") {
      ret[key] = $this.prop("valueAsDate") as Date;
    } else {
      ret[key] = $this.val() as string;
    }
    return undefined;
  });
  ret.target_type = $("input[name='target_type']:checked").val() as string;
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
export function setProgress(p: number) {
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
export function exportResult(data: any, ll: L.LatLng, line: T.LLDI[]) {
  data.ll = ll;
  data.to_import_data = undefined;
  data.line = line;
  data.target_type = $("input[name='target_type']:checked").val();

  $("#exported_data").val(JSON.stringify(data));
  updateHistory(data);
}

//==========================================================
// 結果画面で現在選択中の情報の表示。
export function updateLatLngDisplay(ll: T.LLDI): void {
  $("#info").text(ll.info);
  // GoogleMapへのリンクを設定する。
  $("#openGoogleMap")
    .off("click")
    .on("click", () => {
      window
        .open(
          `https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lng}`,
          "_blank",
        )
        ?.focus();
    });
}
