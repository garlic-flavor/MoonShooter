import { $ } from 'jquery';
import * as L from "leaflet";
import * as SunCalc from "@noim/suncalc3";

import * as A from "./altitude.mjs";
import * as D from "./dom.mjs";
import * as M from "./map.mjs";

$(document).ready(function() {

$("#root").show();
//--------------------------------------------------------------------
// 履歴の設定。
D.updateHistory();

// 観測対象の設定
$("input[name='target_type']").on('change', D.targetTypeOnChange);

//====================================================================
// 太陽に関して
// 太陽の観測日の初期値
$("#sun_observation_day")
   .prop ("valueAsDate", new Date())
   .on ('change', D.updateSunTimes)
   .trigger ('change');

//--------------------------------------------------------------------
// 太陽の見かけの位置を地図から選ぶ
$("#set_sun_pseudo_latlng_from_map").on('click', ()=>{
  D.showMapToSetSunPseudoLatLng();
  M.startToSetSunPseudoLatLng(D.getSunPseudoLatLng());
});
//--------------------------------------------------------------------
// 太陽の見かけの位置を地図から選び、決定する。
$("#sun_pseudo_latlng_select").on('click', ()=>{
  D.setSunPseudoLatLng(M.getAndEndSelectSunPseudoLatLng());
  D.showForms();
});

//====================================================================
// 月に関して
//--------------------------------------------------------------------
// 月の観測日の初期値
$("#moon_observation_day")
  .prop ("valueAsDate", new Date())
  .on ('change', D.updateMoonTimes)
  .trigger ('change');
// 前の満月
$("#get_prev_fullmoon").on ('click', D.getPrevFullMoon);
// 次の満月
$("#get_next_fullmoon").on ('click', D.getNextFullMoon);

//--------------------------------------------------------------------
// 月の見かけの位置を地図から選ぶ
$("#set_moon_pseudo_latlng_from_map").on('click', ()=>{
  D.showMapToSetMoonPseudoLatLng();
  M.startToSetMoonPseudoLatLng(D.getMoonPseudoLatLng());
});
//--------------------------------------------------------------------
// 月の見かけの位置を地図から選び、決定する。
$("#moon_pseudo_latlng_select").on('click', ()=>{
  D.setMoonPseudoLatLng(M.getAndEndSelectMoonPseudoLatLng());
  D.showForms();
});

//====================================================================
//--------------------------------------------------------------------
// 結果表示画面の戻るボタン
$("#result_back").on('click', ()=>{
  M.endResult();
  D.showForms();
});
//====================================================================
// 実行ボタンの処理
//--------------------------------------------------------------------
// 日の出
$("#exec_for_sun_rise").on ('click', async ()=> {
  // フォームの値の読み取り
  const ll = D.getSunPseudoLatLng();
  if (!ll) {
    alert ("太陽の見かけの位置が読み取れませんでした。");
    return;
  }

  // プログレス画面の表示
  D.showProgress();

  // 見かけの月の位置の標高を調べる
  ll.alt = await M.getHeight (ll);

  // フォームデータの収集
  const formData = D.getFormData();
  const the_day = formData.sun_observation_day;
  // 見かけの高さ。
  ll.alt += formData.sun_pseudo_height;

  // 日の出、日の入りの情報の取得。
  const times = SunCalc.getSunTimes (the_day, ll.lat, ll.lng, ll.alt);

  // 調べる時刻の列挙
  const timing : Date[] = [];
  // 日の出以前は1分毎に調べる。
  for (let t = formData.minutes_before_sun_rise; 0 < t; t--) {
    timing.push (new Date (times.sunriseStart.ts - t * 60 * 1000));
  }
  // 日の出から10分は1分毎に調べる。
  for (let t = 0; t < 10; t++) {
    if (formData.minutes_after_sun_rise < t) { break; }
    timing.push (new Date (times.sunriseStart.ts + t * 60 * 1000));
  }
  // 日の出から10分以降は10分毎に調べる。
  for (let t = 10; t < formData.minutes_after_sun_rise; t += 10) {
    timing.push (new Date (times.sunriseStart.ts + t * 60 * 1000));
  }

  // 結果データを格納する。
  let line : M.LLDate[] = [];
  for (let i = 0; i < timing.length; i++) {
    const t = timing[i]!;
    const pos = SunCalc.getPosition (t, ll.lat, ll.lng);
    const res = await M.getShadow (12, ll, pos, formData.camera_height,
      formData.far_distance * 1000, (p:number) => {
        D.setProgress ((i+p) / timing.length);
      });
    if (res) {
      line.push ({lat: res.lat, lng: res.lng, date: t});
    }
    D.setProgress ((i+1) / timing.length);
  }

  // ドンライン表示
  D.showResult();
  M.startResult (ll, line);

  // export
  D.exportResult (formData, ll, line);
});
//--------------------------------------------------------------------
// 日の入り
$("#exec_for_sun_set").on ('click', async ()=> {
  // フォームの値の読み取り
  const ll = D.getSunPseudoLatLng();
  if (!ll) {
    alert ("太陽の見かけの位置が読み取れませんでした。");
    return;
  }

  // プログレス画面の表示
  D.showProgress();

  // 見かけの月の位置の標高を調べる
  ll.alt = await M.getHeight (ll);

  // フォームデータの収集
  const formData = D.getFormData();
  const the_day = formData.sun_observation_day;
  // 見かけの高さ。
  ll.alt += formData.sun_pseudo_height;

  // 日の出、日の入りの情報の取得。
  const times = SunCalc.getSunTimes (the_day, ll.lat, ll.lng, ll.alt);

  // 調べる時刻の列挙
  const timing : Date[] = [];
  // 日の入り以降は1分毎に調べる。
  for (let t = formData.minutes_after_sun_set; 0 < t; t--) {
    timing.push (new Date (times.sunsetEnd.ts + t * 60 * 1000));
  }
  // 日の入りの10分前までは1分毎に調べる。
  for (let t = 0; t < 10; t++) {
    if (formData.minutes_before_sun_set < t) { break; }
      timing.push (new Date (times.sunsetEnd.ts - t * 60 * 1000));
  }
  // 日の入りの10分以前は10分ごとに調べる。
  for (let t = 10; t < formData.minutes_before_sun_set; t += 10) {
    timing.push (new Date (times.sunsetEnd.ts - t * 60 * 1000));
  }

  // 結果データを格納する。
  let line : M.LLDate[] = [];
  for (let i = 0; i < timing.length; i++) {
    const t = timing[i]!;
    const pos = SunCalc.getPosition (t, ll.lat, ll.lng);
    const res = await M.getShadow (12, ll, pos, formData.camera_height,
      formData.far_distance * 1000, (p:number) => {
        D.setProgress ((i+p) / timing.length);
      });
    if (res) {
      line.push ({lat: res.lat, lng: res.lng, date: t});
    }
    D.setProgress ((i+1) / timing.length);
  }

  // ドンライン表示
  D.showResult();
  M.startResult (ll, line);

  // export
  D.exportResult (formData, ll, line);
});

//--------------------------------------------------------------------
// 月の出
$("#exec_for_moon_rise").on ('click', async ()=> {
  // フォームの値の読み取り
  const ll = D.getMoonPseudoLatLng();
  if (!ll) {
    alert ("月の見かけの位置が読み取れませんでした。");
    return;
  }

  // プログレス画面の表示
  D.showProgress();

  // 見かけの月の位置の標高を調べる
  ll.alt = await M.getHeight (ll);

  // フォームデータの収集
  const formData = D.getFormData();
  const the_day = formData.moon_observation_day;
  // 見かけの高さ。
  ll.alt += formData.moon_pseudo_height;

  // 日の出、日の入りの情報の取得。
  const times = SunCalc.getMoonTimes (the_day, ll.lat, ll.lng, false);

  // 調べる時刻の列挙
  const timing : Date[] = [];
  // 月の出以前は1分毎に調べる。
  for (let t = formData.minutes_before_moon_rise; 0 < t; t--) {
    timing.push (new Date (Number (times.rise) - t * 60 * 1000));
  }
  // 月の出から10分は1分毎に調べる。
  for (let t = 0; t < 10; t++) {
    if (formData.minutes_after_moon_rise < t) { break; }
    timing.push (new Date (Number (times.rise) + t * 60 * 1000));
  }
  // 月の出から10分以降は10分毎に調べる。
  for (let t = 10; t < formData.minutes_after_moon_rise; t += 10) {
    timing.push (new Date (Number (times.rise) + t * 60 * 1000));
  }

  // 結果データを格納する。
  let line : M.LLDate[] = [];
  for (let i = 0; i < timing.length; i++) {
    const t = timing[i]!;
    const pos = SunCalc.getMoonPosition (t, ll.lat, ll.lng);
    // 標高による差分の補正
    pos.altitude = Math.atan(
      (pos.distance * Math.sin (pos.altitude) - (ll.alt ?? 0)) /
      (pos.distance * Math.cos (pos.altitude)));
    const res = await M.getShadow (12, ll, pos, formData.camera_height,
      formData.far_distance * 1000, (p:number) => {
        D.setProgress ((i+p) / timing.length);
      });
    if (res) {
      line.push ({lat: res.lat, lng: res.lng, date: t});
    }
    D.setProgress ((i+1) / timing.length);
  }

  // ドンライン表示
  D.showResult();
  M.startResult (ll, line);

  // export
  D.exportResult (formData, ll, line);
});
//--------------------------------------------------------------------
// 月の入り
$("#exec_for_moon_set").on ('click', async ()=> {
  // フォームの値の読み取り
  const ll = D.getMoonPseudoLatLng();
  if (!ll) {
    alert ("月の見かけの位置が読み取れませんでした。");
    return;
  }

  // プログレス画面の表示
  D.showProgress();

  // 見かけの月の位置の標高を調べる
  ll.alt = await M.getHeight (ll);

  // フォームデータの収集
  const formData = D.getFormData();
  const the_day = formData.moon_observation_day;
  // 見かけの高さ。
  ll.alt += formData.moon_pseudo_height;

  // 月の出、月の入りの情報の取得。
  const times = SunCalc.getMoonTimes (the_day, ll.lat, ll.lng, false);

  // 調べる時刻の列挙
  const timing : Date[] = [];
  // 月の入り以降は1分毎に調べる。
  for (let t = formData.minutes_after_moon_set; 0 < t; t--) {
    timing.push (new Date (Number (times.set) + t * 60 * 1000));
  }
  // 月の入りの10分前までは1分毎に調べる。
  for (let t = 0; t < 10; t++) {
    if (formData.minutes_before_moon_set < t) { break; }
    timing.push (new Date (Number (times.set) - t * 60 * 1000));
  }
  // 月の入りの10分以前は10分ごとに調べる。
  for (let t = 10; t < formData.minutes_before_moon_set; t += 10) {
    timing.push (new Date (Number (times.set) - t * 60 * 1000));
  }

  // 結果データを格納する。
  let line : M.LLDate[] = [];
  for (let i = 0; i < timing.length; i++) {
    const t = timing[i]!;
    const pos = SunCalc.getMoonPosition (t, ll.lat, ll.lng);
    // 標高による差分の補正
    pos.altitude = Math.atan(
      (pos.distance * Math.sin (pos.altitude) - (ll.alt ?? 0)) /
        (pos.distance * Math.cos (pos.altitude)));
    const res = await M.getShadow (12, ll, pos, formData.camera_height,
      formData.far_distance * 1000, (p:number) => {
        D.setProgress ((i+p) / timing.length);
      });
    if (res) {
      line.push ({lat: res.lat, lng: res.lng, date: t});
    }
    D.setProgress ((i+1) / timing.length);
  }

  // ドンライン表示
  D.showResult();
  M.startResult (ll, line);

  // export
  D.exportResult (formData, ll, line);
});

//====================================================================
//--------------------------------------------------------------------
// 読み込みボタンの処理
$("#import_data").on('click', ()=>{
  const data = (()=>{
    const to_import = ($("#data_to_import").val() as string).trim();
    // インポート
    if (to_import) {
      return JSON.parse (to_import);
    // 履歴から
    } else {
      const h_name = $("#history").val();
      if (!h_name) { return undefined; }
      const history : any[] = JSON.parse (window.localStorage.getItem("history") ?? '[]');
      return history.find((item)=>item.session_name == h_name);
    }
  })()
  if (!data) { return; }
  // フォームへの書き戻し
  for (const key in data) {
    let $item = $(`#${key}`);
    if ($item.attr ("type") == "date") {
      $item.prop ("valueAsDate", new Date (data[key]));
    } else {
      $item.val (data[key]);
    }
  }

  // 結果が保存されている場合は結果の表示。
  if (data.ll && data.line) {
    D.showResult();
    M.startResult (data.ll, data.line);
  }
});
});
