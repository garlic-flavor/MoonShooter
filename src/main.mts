import * as L from "leaflet"
import * as SunCalc from "@noim/suncalc3"

import * as A from "./altitude.mjs"
import * as D from "./dom.mjs"
import * as FM from "./moonlatlng.from.map.mjs"
import * as M from "./map.mjs"

$(document).ready(function() {
  $("#javascript_notice_container").hide();



//============================================================================
// ボタン click処理
//

// 開始するボタン
$("#usage_next").on('click', D.showForms);
// 使い方を表示
$("#show_usage").on('click', D.showUsage);

// 月の見かけの位置を地図から選ぶ
$("#moon_latlng_from_map").on('click', ()=>{
  D.showMapToSelectLatLng();
  M.startToSelectMoonLatLng(D.getMoonLatLng());
});
// 月の見かけの位置を地図から選び、決定する。
$("#moon_latlng_select").on('click', ()=>{
  D.setMoonLatLng(M.getAndEndSelectMoonLatLng());
  D.showForms();
});


//============================================================================
// MAIN PROGRAM
//

// 初回処理の時のみ使い方を先に出す。
if (window.localStorage.getItem("nohelp")) {
  D.showForms();
} else {
  window.localStorage.setItem("nohelp", "true");
  D.showUsage();
}
$("#root").show();

// 観測日の初期値
$("#the_day")
  .datepicker({"dateFormat": "yy/mm/dd"})
  .on ('change', D.updateMoonInfo)
  .val(new Date().toLocaleDateString());
D.updateMoonInfo();

// 月の出、月の入り
$("input[name='moon_rise_or_set']").on('change', D.moonRiseOrSetOnChange);

//--------------------------------------------------------------------
// 読み込みボタンの処理
$("#import_data").on('click', ()=>{
  // JSON の読み取り
  const data = JSON.parse ($("#to_import_data").val() as string);
  if (!data) { return; }
  // フォームへの書き戻し
  for (const key in data) {
    $(`#${key}`).val (data[key]);
  }

  // 結果が保存されている場合は結果の表示。
  if (data.ll && data.line) {
    D.showResult();
    M.startResult (data.ll, data.line);
  }
});
//--------------------------------------------------------------------
// 結果表示画面の戻るボタン
$("#result_back").on('click', ()=>{
  M.endResult();
  D.showForms();
});

//====================================================================
// 調べるボタンの処理
$("#calc_by_the_day").on ('click', async ()=> {
  // フォームの値の読み取り
  const ll = D.getMoonLatLng();
  if (!ll) {
    alert ("月の見かけの位置が読み取れませんでした。");
    return;
  }
  
  // プログレス画面の表示
  D.showProgress();
  M.startToProgress (ll);

  // 見かけの月の位置の標高を調べる
  ll.alt = await M.getHeight (ll);

  // フォームデータの収集
  const formData = D.getFormData();
  const the_day = new Date(formData.the_day);
  // 月の見かけの高さ。
  ll.alt += formData.moon_pseudo_height;

  // 月の出、月の入りの情報の取得。
  const mt = SunCalc.getMoonTimes (the_day, ll.lat, ll.lng, false);


  // 調べる時刻の列挙
  const test_timing : Date[] = [];
  // 月の出に関して
  if (formData.moon_rise_or_set == 'moon_rise') {
    // 月の出以前は1分毎に調べる。
    for (let t = formData.minutes_before_rise; 0 < t; t--) {
      test_timing.push (new Date (Number (mt.rise) - t * 60 * 1000));
    }
    // 月の出から10分は1分毎に調べる。
    for (let t = 0; t < 10; t++) {
      if (formData.minutes_after_rise < t) { break; }
      test_timing.push (new Date (Number (mt.rise) + t * 60 * 1000));
    }
    // 月の出から10分以降は10分毎に調べる。
    for (let t = 10; t < formData.minutes_after_rise; t += 10) {
      test_timing.push (new Date (Number (mt.rise) + t * 60 * 1000));
    }
  // 月の入りに関して。
  } else {
    // 月の入り以降は1分毎に調べる。
    for (let t = formData.minutes_after_set; 0 < t; t--) {
      test_timing.push (new Date (Number (mt.set) + t * 60 * 1000));
    }
    // 月の入りの10分前までは1分毎に調べる。
    for (let t = 0; t < 10; t++) {
      if (formData.minutes_before_set < t) { break; }
      test_timing.push (new Date (Number (mt.set) - t * 60 * 1000));
    }
    // 月の入りの10分以前は10分ごとに調べる。
    for (let t = 10; t < formData.minutes_before_set; t += 10) {
      test_timing.push (new Date (Number (mt.set) - t * 60 * 1000));
    }
  }

  // 結果データを格納する。
  let line : M.LLDate[] = [];
  for (let i = 0; i < test_timing.length; i++) {
    const t = test_timing[i]!;
    const mpos = SunCalc.getMoonPosition (t, ll.lat, ll.lng);
    // 標高による差分の補正
    mpos.altitude = Math.atan(
      (mpos.distance * Math.sin (mpos.altitude) - (ll.alt ?? 0)) /
        (mpos.distance * Math.cos (mpos.altitude)));
    const pos = await M.getShadow (12, ll, mpos, formData.camera_height,
      formData.far_distance * 1000, (p:number) => {
        D.setProgress ((i+p) / test_timing.length);
      });
    if (pos) {
      line.push ({lat: pos.lat, lng: pos.lng, date: t});
    }
    D.setProgress ((i+1) / test_timing.length);
  }

  // ドンライン表示
  D.showResult();
  M.startResult (ll, line);

  // export
  ll.alt! -= formData.moon_pseudo_height;
  formData.ll = ll;
  formData.line = line;
  D.exportResult (formData);
});

});


