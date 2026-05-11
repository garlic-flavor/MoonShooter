import * as L from 'leaflet';
import * as A from './altitude.mjs';
import * as D from './dom.mjs';
//--------------------------------------------------------------------
// 地図の初期化
// 標準地図URLテンプレート
const MapURL = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
// 初期中心位置
const DefaultCenter = L.latLng(36.104611, 140.084556);
// 地図の初期化
const map = L.map('map_container').setView(DefaultCenter, 5);
L.tileLayer(MapURL, {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxZoom: 18,
}).addTo(map);
;
/////////////////////////////////////////////////////////////////////////////
// 月の見かけの位置を選ぶ画面
const marker = L.marker(DefaultCenter, { draggable: true, autoPan: true })
    .on('dragend', updateDisplay);
//====================================================================
export function startToSelectMoonLatLng(ll) {
    map.invalidateSize(true);
    if (ll) {
        setMarker(ll);
    }
    map.off('click').on('click', (e) => { setMarker(e.latlng); });
}
//----------------------------------------------------------
function setMarker(ll) {
    marker.remove().setLatLng(ll).addTo(map);
    updateDisplay();
}
//----------------------------------------------------------
function updateDisplay() {
    const ll = marker.getLatLng();
    $("#moon_latlng_display").text(`${ll.lat},${ll.lng}`);
}
//====================================================================
export function getAndEndSelectMoonLatLng() {
    map.off('click');
    const ll = marker.getLatLng();
    marker.remove();
    return ll;
}
//====================================================================
export function startToProgress(ll) {
    map.invalidateSize(true);
    map.setView(ll, map.getZoom());
}
//====================================================================
export async function getHeight(ll) {
    return A.getHeight(map, ll);
}
//====================================================================
export function getShadow(zoom, target, light, camera_height, far_distance, progress) {
    return A.getShadow(map, zoom, target, light, camera_height, far_distance, progress);
}
/////////////////////////////////////////////////////////////////////////////
//
//--------------------------------------------------------------------
// 地図にドンラインを書く。
let polyline = L.polyline([], { color: 'red' });
let targetMarker = L.marker(DefaultCenter, {
    title: "月の見かけの位置",
    riseOnHover: true
});
let markers = [];
export function startResult(target, line) {
    map.invalidateSize(true);
    targetMarker.setLatLng(target).addTo(map);
    polyline.setLatLngs(line).addTo(map);
    line.map((p) => {
        const date = new Date(p.date).toLocaleString('ja-JP');
        const $opt = $("<option>").val(date).text(date).appendTo("#timing_list");
        const marker = L.marker(p, {
            title: date,
            riseOnHover: true,
            opacity: 0.2
        }).addTo(map);
        markers.push(marker);
        //      .off('click').on ('click', (e)=> {
        //        shadowMarker.remove()
        //          .setLatLng(p)
        //          .addTo(map);
        //        $("#result_selected_time").text (new Date(p.date).toLocaleString());
        //      })
        marker.on('click', (e) => {
            markers.map((item) => { item.setOpacity(0.2); });
            e.target.setOpacity(1.0);
            $("#timing_list").val(e.target.options.title);
            map.setView(p);
            D.updateLatLngDisplay(p);
        });
    });
    $("#timing_list").off('change').on('change', (e) => {
        const val = $(e.target).val();
        markers.find((item) => item.options.title == val)?.fire('click');
    });
    // ドンライン全体を地図上に表示する。
    map.fitBounds(polyline.getBounds());
}
//--------------------------------------------------------------------
export function endResult() {
    targetMarker.remove();
    polyline.off('click').remove();
    markers.map((item) => { item.remove(); });
    markers = [];
}
