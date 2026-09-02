export interface Watchlist {
  /** id trên hệ thống nguồn (DNSE) — giữ để đối chiếu, không dùng để fetch */
  watchlistID: number;
  /** slug gốc */
  name: string;
  /** nhãn hiển thị tiếng Việt */
  label: string;
  symbols: string[];
  displayIndex: number;
}

/** Nguồn duy nhất cho mọi watchlist dùng chung giữa các trang. */
export const WATCHLISTS: Watchlist[] = [
  {
    watchlistID: 4611155,
    name: "watching",
    label: "Đang theo dõi",
    displayIndex: 0,
    symbols: [
      "HPG", "MBS", "TCH", "VIC", "HDG", "PDR", "DXG", "HHS",
    ],
  },
  {
    watchlistID: 4611148,
    name: "1757_thep",
    label: "Thép",
    displayIndex: 6,
    symbols: [
      "SMC", "SHI", "NKG", "HSG", "TLH", "HPG",
    ],
  },
  {
    watchlistID: 4611149,
    name: "8355_ngan_hang",
    label: "Ngân hàng",
    displayIndex: 7,
    symbols: [
      "VIB", "ACB", "LPB", "BVB", "ABB", "STB", "MSB", "NVB",
      "OCB", "SHB", "TCB", "SSB", "EIB", "BID", "TPB", "KLB",
      "MBB", "VPB", "HDB", "SGB", "CTG", "VCB", "PGB", "NAB",
    ],
  },
  {
    watchlistID: 4611151,
    name: "8633_BDS",
    label: "Bất động sản",
    displayIndex: 8,
    symbols: [
      "NVL", "TCH", "AGG", "HPX", "KDH", "SJS", "DXG", "CKG",
      "PDR", "HDC", "IJC", "HDG", "DIG", "CEO", "TIP", "KHG",
      "SCR", "NTL", "D2D", "TDC", "CRE", "HQC", "KBC", "LHG",
      "NLG", "TIG",
    ],
  },
  {
    watchlistID: 4611152,
    name: "8781_chung_khoan",
    label: "Chứng khoán",
    displayIndex: 9,
    symbols: [
      "VCI", "SBS", "TVB", "MBS", "AGR", "HCM", "SHS", "VND",
      "VIX", "FTS", "BVS", "ORS", "BSI", "SSI", "VDS", "CTS",
    ],
  },
  {
    watchlistID: 4611153,
    name: "0533_dau_khi",
    label: "Dầu khí",
    displayIndex: 10,
    symbols: [
      "PVD", "PVC", "PVS", "BSR", "PLX", "OIL", "PVT",
    ],
  },
  {
    watchlistID: 4611154,
    name: "dau_tu_cong",
    label: "Đầu tư công",
    displayIndex: 11,
    symbols: [
      "C4G", "HHV", "FCN", "LCG", "HT1", "KSB", "BCC",
    ],
  },
  {
    watchlistID: 4609911,
    name: "thanh_khoan_vua",
    label: "Thanh khoản vua",
    displayIndex: 99,
    symbols: [
      "AAA", "AAS", "ACB", "ACV", "AGR", "ANV", "BAF", "BCM",
      "BID", "BMI", "BSR", "BVB", "BVH", "CEO", "CII", "CSV",
      "CTD", "CTG", "CTI", "CTR", "CTS", "DBC", "DCM", "DDV",
      "DGC", "DGW", "DIG", "DPG", "DPM", "DPR", "DXG", "DXS",
      "E1VFVN30", "EIB", "ELC", "EVF", "EVG", "FCN", "FPT", "FTS",
      "GAS", "GEL", "GEX", "GMD", "GVR", "HAG", "HAH", "HBC",
      "HCM", "HDB", "HDC", "HDG", "HHP", "HHS", "HHV", "HPG",
      "HPX", "HQC", "HSG", "HT1", "HUT", "HVN", "IDC", "IDI",
      "IJC", "KBC", "KDH", "KHG", "KSB", "LAS", "LCG", "LPB",
      "MBB", "MBS", "MSB", "MSN", "MSR", "MWG", "NAB", "NKG",
      "NLG", "NT2", "NVL", "OCB", "OIL", "ORS", "PAN", "PC1",
      "PDR", "PET", "PLC", "PLX", "PNJ", "POW", "PVC", "PVD",
      "PVP", "PVS", "PVT", "SAB", "SCR", "SHB", "SHI", "SHS",
      "SSB", "SSI", "STB", "SZC", "TCB", "TCH", "TCM", "TCX",
      "TNG", "TPB", "TTF", "TV2", "TVN", "VCB", "VCG", "VCI",
      "VCK", "VDS", "VEA", "VFS", "VGC", "VGI", "VGS", "VGT",
      "VHC", "VHM", "VIB", "VIC", "VIX", "VJC", "VND", "VNM",
      "VOS", "VPB", "VPI", "VPX", "VRE", "VSC", "VTP", "VTZ",
      "YEG",
    ],
  },
]
  .slice()
  .sort((a, b) => a.displayIndex - b.displayIndex);

export const getWatchlist = (name: string): Watchlist | undefined =>
  WATCHLISTS.find((w) => w.name === name);

export const DEFAULT_WATCHLIST = "watching";
