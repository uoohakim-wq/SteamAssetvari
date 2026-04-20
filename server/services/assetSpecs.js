const ASSET_SPECS = {
  header_capsule:   { w: 920,  h: 430,  required: true,  label: "헤더 캡슐" },
  small_capsule:    { w: 462,  h: 174,  required: true,  label: "소형 캡슐",
    derivatives: [{ w: 184, h: 69 }, { w: 120, h: 45 }] },
  main_capsule:     { w: 1232, h: 706,  required: true,  label: "메인 캡슐" },
  vertical_capsule: { w: 748,  h: 896,  required: true,  label: "수직 캡슐" },
  page_background:  { w: 1438, h: 810,  required: false, label: "페이지 배경", logoOverlay: false },
  bundle_header:    { w: 707,  h: 232,  required: false, label: "꾸러미 헤더" },
};

const POSITIONS = {
  TL: (cw, ch, lw, lh, pad) => ({ x: pad, y: pad }),
  TC: (cw, ch, lw, lh, pad) => ({ x: Math.round((cw - lw) / 2), y: pad }),
  TR: (cw, ch, lw, lh, pad) => ({ x: cw - lw - pad, y: pad }),
  ML: (cw, ch, lw, lh, pad) => ({ x: pad, y: Math.round((ch - lh) / 2) }),
  MC: (cw, ch, lw, lh, pad) => ({ x: Math.round((cw - lw) / 2), y: Math.round((ch - lh) / 2) }),
  MR: (cw, ch, lw, lh, pad) => ({ x: cw - lw - pad, y: Math.round((ch - lh) / 2) }),
  BL: (cw, ch, lw, lh, pad) => ({ x: pad, y: ch - lh - pad }),
  BC: (cw, ch, lw, lh, pad) => ({ x: Math.round((cw - lw) / 2), y: ch - lh - pad }),
  BR: (cw, ch, lw, lh, pad) => ({ x: cw - lw - pad, y: ch - lh - pad }),
};

module.exports = { ASSET_SPECS, POSITIONS };
