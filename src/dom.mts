import * as L from 'leaflet'
import * as SunCalc from "@noim/suncalc3"

//--------------------------------------------------------------------
// 使い方画面を出す。
export function showUsage() {
  $("#usage_container").show();
  $("#main_form").hide();
  $("#map_grid").hide();
}

//--------------------------------------------------------------------
// 諸元入力画面を出す。
export function showForms() {
  $("#usage_container").hide();
  $("#main_form").show();
  $("#map_grid").hide();
}

//--------------------------------------------------------------------
// 地図を表示する。
export function showMap() {
  $("#usage_container").hide();
  $("#main_form").hide();
  $("#map_grid_ui").children().hide();
  $("#map_grid").show();
}

//--------------------------------------------------------------------
// 月の位置を地図から選ぶ画面を出す。
export function showMapToSelectLatLng() {
  showMap();
  $("#moon_latlng_from_map_ui").show();
}

//--------------------------------------------------------------------
// 月の見かけの位置情報を取得する。
export function getMoonLatLng() : L.LatLng | undefined {
  const ll = JSON.parse (`[${$("#moon_latlng").val() as string}]`);
  if (ll[0] == null || ll[1] == null) { return undefined; }
  return L.latLng(ll[0], ll[1]);
}
//
export function setMoonLatLng(ll: L.LatLng) {
  $("#moon_latlng").val(`${ll.lat},${ll.lng}`);
}

//--------------------------------------------------------------------
// 月の情報の更新
export function updateMoonInfo() {
  const the_day = new Date($("#the_day").val() as string);
  const ll = getMoonLatLng();
  if (!ll) {
    ["rise", "set", "fraction"].map ((key)=>{
      $(`#moon_info_${key}`).text("-");
    });
    return;
  }
  const mt = SunCalc.getMoonTimes (the_day, ll.lat, ll.lng, false);

  $("#moon_info_rise").text(mt.rise?.toLocaleString() ?? "-");
  $("#moon_info_set").text(mt.set?.toLocaleString() ?? "-");

  const data = SunCalc.getMoonData (the_day, ll.lat, ll.lng);
  $("#moon_info_fraction").text(
    `${Math.round(data.illumination.fraction * 100)}%`);
}

//--------------------------------------------------------------------
//
export function moonRiseOrSetOnChange (e: Event) {
  if (!e.target) { return; }
  const val = $(e.target).val() as string;
  if (val === "moon_set") {
    $("#minutes_about_rise").hide();
    $("#minutes_about_set").show();
  } else {
    $("#minutes_about_rise").show();
    $("#minutes_about_set").hide();
  }
}

//--------------------------------------------------------------------
// プログレスバー画面を出す。
export function showProgress() {
  showMap();
  $("#progress_ui").show();
  $("#progressbar").progressbar({ value: false });
}

//--------------------------------------------------------------------
// フォームのデータを読み取る。
export function getFormData() : any {
  const ret:any = {};
  $("#main_form input").map(function(){
    const $this = $(this);
    const key = $this.attr("id");
    if (key) {
      if ($this.attr("type") == "number") {
        ret[key] = Number($this.val() as number);
      } else {
        ret[key] = $this.val() as string;
      }
    }
  });
  ret["moon_rise_or_set"] =
    $("input[name='moon_rise_or_set']:checked").val() as string;
  return ret;
}

//--------------------------------------------------------------------
// プログレスバーの更新
export function setProgress(p:number) {
  const percentage = Math.round (p * 100);
  $("#progressbar").progressbar("value", percentage);
  $("#progress_label").text(`${percentage}%`);
}

//--------------------------------------------------------------------
// 結果を表示する。
export function showResult() {
  showMap();
  $("#result_ui").show();
}

//--------------------------------------------------------------------
export function exportResult(data: any) {
  $("#exported_data").val(JSON.stringify(data));
}

//--------------------------------------------------------------------
export function updateLatLngDisplay (ll: {lat: number, lng: number}): void {
  $("#result_selected_latlng").text (`${ll.lat},${ll.lng}`);
  $("#openGoogleMap").off('click').on('click', ()=>{
    window.open(`https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lng}`, '_blank')?.focus();
  });

}

//--------------------------------------------------------------------
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

