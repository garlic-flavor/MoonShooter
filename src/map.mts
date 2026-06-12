import type { IMoonPosition } from "@noim/suncalc3";
import { $ } from "jquery";
import * as L from "leaflet";
import * as A from "./altitude.mjs";
import * as D from "./dom.mjs";
import type * as T from "./type.mjs";

// 標準地図URLテンプレート
const MapURL = "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png";
// 航空写真地図テンプレート
const ORTMapURL =
  "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg";
const DefaultCenter = L.latLng(36.104611, 140.084556);

//////////////////////////////////////////////////////////////////////
export class MyMap {
  private map: L.Map;
  private marker: L.Marker;
  private polyline: L.Polyline;
  private targetMarker: L.Marker;
  private markers: L.Marker[];
  private thinOpacity = 0.5;

  //----------------------------------------------------------
  constructor() {
    this.map = L.map("map_container").setView(DefaultCenter, 15);
    const stdMap = L.tileLayer(MapURL, {
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
      maxZoom: 18,
    }).addTo(this.map);
    const ortMap = L.tileLayer(ORTMapURL, {
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
      minZoom: 14,
      maxZoom: 18,
    });
    L.control
      .layers({
        標準地図: stdMap,
        "写真(詳細のみ)": ortMap,
      })
      .addTo(this.map);

    this.marker = L.marker(DefaultCenter, { draggable: true, autoPan: true });
    this.polyline = L.polyline([], { color: "red" });
    this.targetMarker = L.marker(DefaultCenter, {
      title: "対象の位置",
      riseOnHover: true,
    });
    this.markers = [];
  }

  //====================================================================
  // 太陽の見かけの大きさを得る。
  // ll2 から ll1 の被写体を撮影した時の見かけの大きさを得る。
  getSunSize(ll1: L.LatLng, ll2: L.LatLng): number {
    // 太陽までの距離を一定、真球と近似する。
    // https://ja.wikipedia.org/wiki/太陽
    const DISTANCE_TO_THE_SUN = 149597870700;
    const DIAMETER_OF_THE_SUN = 1392000000;

    const dist = this.map.distance(ll1, ll2);
    return Math.round((DIAMETER_OF_THE_SUN / DISTANCE_TO_THE_SUN) * dist);
  }

  //====================================================================
  // 月の見かけの大きさを得る。
  getMoonSize(ll1: L.LatLng, ll2: L.LatLng, moon: IMoonPosition): number {
    // 月を真球と近似する。
    // https://ja.wikipedia.org/wiki/月
    const DIAMETER_OF_THE_MOON = 3474300;
    const d = moon.distance * 1000;
    const dist = this.map.distance(ll1, ll2);
    return Math.round((DIAMETER_OF_THE_MOON / d) * dist);
  }

  //////////////////////////////////////////////////////////////////////
  // 見かけの位置を選ぶ画面
  //----------------------------------------------------------
  private setMarker(ll: L.LatLng) {
    this.marker.remove().setLatLng(ll).addTo(this.map).fire("dragend");
    this.map.setView(ll);
  }
  //------------------------------------------------
  private updateTargetDisplay() {
    const ll = this.marker.getLatLng();
    $("#target_pseudo_latlng_display").text(`${ll.lat},${ll.lng}`);
  }

  //==========================================================
  startToSetTargetPseudoLatLng(ll?: L.LatLng) {
    this.map.invalidateSize(true);
    this.marker
      .remove()
      .off("dragend")
      .on("dragend", () => this.updateTargetDisplay());

    if (ll) {
      this.setMarker(ll);
    }
    this.map.off("click").on("click", (e) => {
      this.setMarker(e.latlng);
    });
  }

  //==========================================================
  getAndEndSelectPseudoLatLng(): L.LatLng {
    this.map.off("click");
    const ll = this.marker.getLatLng();
    this.marker.off("dragend").remove();
    return ll;
  }

  //////////////////////////////////////////////////////////////////////
  // 標高検索
  //==========================================================
  getHeight(ll: L.LatLng): Promise<number | undefined> {
    return A.getHeight(this.map, ll);
  }

  //==========================================================
  getShadow(
    zoom: number,
    target: L.LatLng,
    tip_height: number,
    light: T.LightDir,
    camera_height: number,
    far_distance: number,
    progress: (p: number) => void,
  ): Promise<L.LatLng | undefined> {
    return A.getShadow(
      this.map,
      zoom,
      target,
      tip_height,
      light,
      camera_height,
      far_distance,
      progress,
    );
  }

  //////////////////////////////////////////////////////////////////////
  // 結果表示
  //==========================================================
  // 地図にドンラインを書く。
  startResult(target: T.LL, line: T.LLDI[]) {
    this.map.invalidateSize(true);
    this.targetMarker.setLatLng(target).addTo(this.map);
    this.polyline.setLatLngs(line).addTo(this.map);
    $("#timing_list").empty();
    line.forEach((p) => {
      const date = new Date(p.date).toLocaleString("ja-JP");
      $("<option>").val(date).text(date).appendTo("#timing_list");
      const marker = L.marker(p, {
        title: date,
        riseOnHover: true,
        opacity: this.thinOpacity,
      }).addTo(this.map);
      this.markers.push(marker);
      marker.on("click", (e) => {
        this.markers.forEach((item) => {
          item.setOpacity(this.thinOpacity);
        });
        e.target.setOpacity(1.0);
        $("#timing_list").val(e.target.options.title);
        this.map.setView(p);
        D.updateLatLngDisplay(p);
      });
    });
    $("#timing_list")
      .off("change")
      .on("change", (e) => {
        const val = $(e.target).val();
        this.markers.find((item) => item.options.title === val)?.fire("click");
      });
    // ドンライン全体を地図上に表示する。
    this.map.fitBounds(this.polyline.getBounds());
  }

  //==========================================================
  endResult() {
    this.targetMarker.remove();
    this.polyline.off("click").remove();
    this.markers.forEach((item) => {
      item.remove();
    });
    this.markers = [];
  }
}
