import { $ } from 'jquery';
import * as L from 'leaflet'
import * as SunCalc from "@noim/suncalc3"

//--------------------------------------------------------------------
// 履歴の更新
export function updateHistory (data?: any) {
  const history : any[] = JSON.parse(window.localStorage.getItem("history") ?? '[]');
  if (data) {
    history.unshift (data);
    // 多すぎる履歴は削除する。
    if (10 < history.length) {
      history.pop();
    }
    window.localStorage.setItem ("history", JSON.stringify(history));
  }
  $("#history").children().remove();
  history.map((item)=>{
    if (!item.session_name) { return; }
    $("<option>")
      .text (item.session_name)
      .val (item.session_name)
      .appendTo ("#history");
  });
}

//--------------------------------------------------------------------
// フォームを隠し、地図を表示する。地図上部のUIも隠す。
export function showMap() {
  $("#main_form").hide();
  $("#progress_ui").hide();
  $("#map_grid_ui").children().hide();
  $("#map_grid").show();
}

//--------------------------------------------------------------------
// 地図を隠し、フォームを表示する。
export function showForms() {
  $("#progress_ui").hide();
  $("#map_grid").hide();
  $("#main_form").show();
}
//--------------------------------------------------------------------
// プログレスバー画面を出す。
export function showProgress() {
  $("#map_grid").hide();
  $("#main_form").hide();
  $("#progress_ui").show();
  $("#progress_gauge").css("width", "1px");
}

//--------------------------------------------------------------------
// ラジオボタンが変更された。
export function targetTypeOnChange (e: Event) {
  if (!e.target) { return; }
  const val = $(e.target).val() as string;
  $("#submit_button_container").children().hide();
  if        (val === "sun_rise") {
    $("#about_sun").show();
    $("#about_moon").hide();
    $("#minutes_about_sun_rise").show();
    $("#minutes_about_sun_set").hide();
    $("#exec_for_sun_rise").show();
  } else if (val === "sun_set") {
    $("#about_sun").show();
    $("#about_moon").hide();
    $("#minutes_about_sun_rise").hide();
    $("#minutes_about_sun_set").show();
    $("#exec_for_sun_set").show();
  } else if (val === "moon_rise") {
    $("#about_sun").hide();
    $("#about_moon").show();
    $("#minutes_about_moon_rise").show();
    $("#minutes_about_moon_set").hide();
    $("#exec_for_moon_rise").show();
  } else if (val === "moon_set") {
    $("#about_sun").hide();
    $("#about_moon").show();
    $("#minutes_about_moon_rise").hide();
    $("#minutes_about_moon_set").show();
    $("#exec_for_moon_set").show();
  }
}
//====================================================================
// 太陽に関して
//--------------------------------------------------------------------
// 太陽の位置情報を取得する。
export function getSunPseudoLatLng() : L.LatLng | undefined {
  const ll = JSON.parse (`[${$("#sun_pseudo_latlng").val() as string}]`);
  if (ll[0] == null || ll[1] == null) { return undefined; }
  return L.latLng(ll[0], ll[1]);
}
// 設定する。
export function setSunPseudoLatLng(ll: L.LatLng) {
  $("#sun_pseudo_latlng").val(`${ll.lat},${ll.lng}`);
}

//--------------------------------------------------------------------
// 太陽の観測日が変更された。
export function updateSunTimes (e: Event) {
  if (!e.target) { return; }
  const day = $(e.target).prop ("valueAsDate");
  const ll = getSunPseudoLatLng();
  if (!day || !ll) {
    ["rise", "set"].map ((key)=>{
      $(`#sun_info_${key}`).text("-");
    });
    return;
  }
  const times = SunCalc.getSunTimes (day, ll.lat, ll.lng);
  $("#sun_info_rise").text(times.sunriseStart.value.toLocaleString());
  $("#sun_info_set").text(times.sunsetEnd.value.toLocaleString());
}

//--------------------------------------------------------------------
// 太陽の位置を地図から選ぶ画面を出す。
export function showMapToSetSunPseudoLatLng() {
  showMap();
  $("#sun_pseudo_latlng_from_map_ui").show();
}

//====================================================================
// 月に関して
//--------------------------------------------------------------------
// 月の見かけの位置情報を取得する。
export function getMoonPseudoLatLng() : L.LatLng | undefined {
  const ll = JSON.parse (`[${$("#moon_pseudo_latlng").val() as string}]`);
  if (ll[0] == null || ll[1] == null) { return undefined; }
  return L.latLng(ll[0], ll[1]);
}
// 設定する。
export function setMoonPseudoLatLng(ll: L.LatLng) {
  $("#moon_pseudo_latlng").val(`${ll.lat},${ll.lng}`);
}

//--------------------------------------------------------------------
// 月の情報の更新
export function updateMoonTimes (e: Event) {
  if (!e.target) { return; }
  const day = $(e.target).prop("valueAsDate");
  const ll = getMoonPseudoLatLng();
  if (!day || !ll) {
    ["rise", "set", "fraction"].map ((key)=>{
      $(`#moon_info_${key}`).text("-");
    });
    return;
  }
  const times = SunCalc.getMoonTimes (day, ll.lat, ll.lng, false);

  $("#moon_info_rise").text(times.rise?.toLocaleString() ?? "-");
  $("#moon_info_set").text(times.set?.toLocaleString() ?? "-");

  const data = SunCalc.getMoonData (day, ll.lat, ll.lng);
  $("#moon_info_fraction").text(
    `${Math.round(data.illumination.fraction * 100)}%`);
}

//--------------------------------------------------------------------
// 月の満月を得る。
export function getNextFullMoon() {
  const day = $("#moon_observation_day").prop ("valueAsDate") ?? new Date();
  const day2 = new Date(Number(day) + (1000 * 60 * 60 * 24));
  const data = SunCalc.getMoonIllumination (day2);
  $("#moon_observation_day")
    .prop ("valueAsDate", new Date(data.next.fullMoon.value))
    .trigger ('change');
}
//----------------------------------------------------------
// 前の満月を得る。
export function getPrevFullMoon() {
  const day1 = $("#moon_observation_day").prop ("valueAsDate") ?? new Date();
  const data1 = SunCalc.getMoonIllumination (day1);
  const day2 = new Date(data1.next.fullMoon.value
    - (1000 * 60 * 60 * 24 * 35));
  const data2 = SunCalc.getMoonIllumination (day2);
  $("#moon_observation_day")
    .prop ("valueAsDate", new Date (data2.next.fullMoon.value))
    .trigger ('change');
}
//--------------------------------------------------------------------
// 月の位置を地図から選ぶ画面を出す。
export function showMapToSetMoonPseudoLatLng() {
  showMap();
  $("#moon_pseudo_latlng_from_map_ui").show();
}

//====================================================================
//--------------------------------------------------------------------
// フォームのデータを読み取る。
export function getFormData() : any {
  const ret:any = {};
  $("#main_form input").map(function(){
    const $this = $(this);
    const key = $this.attr("id");
    if (!key) { return; }
    if        ($this.attr("type") == "number") {
      ret[key] = Number($this.val() as number);
    } else if ($this.attr("type") == "date") {
      ret[key] = $this.prop("valueAsDate") as Date;
    } else {
      ret[key] = $this.val() as string;
    }
  });
  ret["target_type"] =
    $("input[name='target_type']:checked").val() as string;
  ret["data_to_import"] = undefined;
  if (!ret["session_name"].trim()) {
    ret["session_name"] = (new Date()).toLocaleString();
  }
  return ret;
}

//--------------------------------------------------------------------
// プログレスバーの更新
export function setProgress(p:number) {
  const percentage = Math.round (p * 100);
  $("#progress_label").text(`・・・${percentage}%`);
  $("#progress_gauge").css("width", `${percentage}%`);
}

//--------------------------------------------------------------------
// 結果を表示する。
export function showResult() {
  showMap();
  $("#result_ui").show();
}

//--------------------------------------------------------------------
// エクスポートと履歴の更新
export function exportResult(data: any, ll: L.LatLng, line: any) {
  ll.alt! -= data.moon_pseudo_height;
  data.ll = ll;
  data.to_import_data = undefined;
  data.line = line;
  $("#exported_data").val(JSON.stringify(data));
  updateHistory (data);
}

//--------------------------------------------------------------------
// 結果画面で現在選択中の情報の表示。
export function updateLatLngDisplay (ll: {lat: number, lng: number}): void {
  $("#result_selected_latlng").text (`${ll.lat},${ll.lng}`);
  $("#openGoogleMap").off('click').on('click', ()=>{
    window.open(`https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lng}`, '_blank')?.focus();
  });
}
