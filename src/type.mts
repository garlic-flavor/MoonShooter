//--------------------------------------------------------------------
// 緯度、経度
// leafletのLatLngTupleから標高の有無を明確にしたもの。
export interface LL {
  lat: number; // 緯度 in degrees
  lng: number; // 経度 in degrees
}

//--------------------------------------------------------------------
// 経度、緯度、標高
export interface LLA extends LL {
  alt: number; // 標高 in meters
}

//--------------------------------------------------------------------
// 緯度、経度、観測日、補足情報
export interface LLDI extends LL {
  date: Date;
  info: string;
}

//--------------------------------------------------------------------
// 光源の向き
export interface LightDir {
  altitude: number; // 迎角 in radians
  azimuth: number; // 方位角 in radians。北を0とし、時計回りを正。
}
