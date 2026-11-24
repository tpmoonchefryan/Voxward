/**
 * Decorative Halloween ribbon garlands and corner jack-o'-lantern ornaments
 * rendered on the standalone `/login` page using TCRN Design System tokens.
 */
export function HalloweenTopGarland() {
  return (
    <svg
      className="vw-login-garland-top"
      viewBox="0 0 1440 84"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      {/* Subtle secondary streamer arc */}
      <path
        className="vw-hlw-streamer-dim"
        d="M-10,14 Q180,52 360,24 T720,28 T1080,24 Q1260,44 1450,10"
      />
      {/* Main draped bunting cords */}
      <path
        className="vw-hlw-cord"
        d="M-10,6 Q180,46 360,16 T720,18 T1080,16 Q1260,34 1450,6"
      />

      {/* Left swag curling tails */}
      <path className="vw-hlw-streamer-acc" d="M26,18 C16,38 30,52 18,68" />
      <path className="vw-hlw-streamer-warn" d="M44,24 C52,42 40,56 48,70" />

      {/* Left-to-center scalloped triangular pennants */}
      <polygon className="vw-hlw-acc vw-hlw-edge" points="72,18 104,24 82,48" />
      <polygon className="vw-hlw-plum vw-hlw-edge" points="122,26 154,30 134,54" />
      <polygon className="vw-hlw-warn vw-hlw-edge" points="174,31 206,33 188,58" />
      <polygon className="vw-hlw-violet vw-hlw-edge" points="226,32 258,29 244,54" />
      <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="278,27 310,22 298,48" />
      <polygon className="vw-hlw-acc vw-hlw-edge" points="330,19 360,16 346,42" />

      {/* Center-left swag */}
      <polygon className="vw-hlw-violet vw-hlw-edge" points="384,18 416,23 396,47" />
      <polygon className="vw-hlw-warn vw-hlw-edge" points="438,26 470,29 452,53" />
      <polygon className="vw-hlw-plum vw-hlw-edge" points="492,30 524,31 508,56" />
      <polygon className="vw-hlw-acc vw-hlw-edge" points="546,30 578,29 562,54" />
      <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="600,27 632,24 618,49" />
      <polygon className="vw-hlw-warn vw-hlw-edge" points="654,21 686,18 672,43" />

      {/* Center medallion star */}
      <polygon
        className="vw-hlw-warn vw-hlw-edge"
        points="720,18 725,29 737,31 728,39 730,51 720,45 710,51 712,39 703,31 715,29"
      />

      {/* Center-right swag */}
      <polygon className="vw-hlw-acc vw-hlw-edge" points="754,18 786,21 768,45" />
      <polygon className="vw-hlw-plum vw-hlw-edge" points="808,24 840,27 822,50" />
      <polygon className="vw-hlw-violet vw-hlw-edge" points="862,29 894,30 878,54" />
      <polygon className="vw-hlw-warn vw-hlw-edge" points="916,31 948,30 932,55" />
      <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="970,29 1002,26 988,51" />
      <polygon className="vw-hlw-acc vw-hlw-edge" points="1024,23 1056,18 1044,44" />

      {/* Right swag (shallow cord arc keeps top-right locale button unobstructed) */}
      <polygon className="vw-hlw-plum vw-hlw-edge" points="1096,17 1126,21 1110,41" />
      <polygon className="vw-hlw-warn vw-hlw-edge" points="1146,23 1176,26 1160,46" />
      <polygon className="vw-hlw-acc vw-hlw-edge" points="1196,26 1224,26 1210,46" />
      <polygon className="vw-hlw-violet vw-hlw-edge" points="1246,25 1274,23 1260,42" />
      <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="1386,13 1412,10 1400,32" />

      {/* Hanging accent sparkle dots along arcs */}
      <circle className="vw-hlw-warn" cx="113" cy="24" r="3" />
      <circle className="vw-hlw-acc-2" cx="268" cy="28" r="3" />
      <circle className="vw-hlw-violet" cx="535" cy="30" r="3" />
      <circle className="vw-hlw-acc-2" cx="905" cy="30" r="3" />
      <circle className="vw-hlw-warn" cx="1186" cy="26" r="3" />
    </svg>
  );
}

export function HalloweenBottomDecor() {
  return (
    <div className="vw-login-bottom-decor" aria-hidden="true">
      {/* Full-width bottom Halloween ribbon swag */}
      <svg
        className="vw-login-garland-bottom"
        viewBox="0 0 1440 76"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          className="vw-hlw-streamer-dim"
          d="M-10,58 Q240,26 480,54 T960,54 Q1200,26 1450,58"
        />
        <path
          className="vw-hlw-cord"
          d="M-10,64 Q240,34 480,62 T960,62 Q1200,34 1450,64"
        />

        {/* Inverted & upright ribbon bunting flags across bottom */}
        <polygon className="vw-hlw-plum vw-hlw-edge" points="210,52 238,49 224,28" />
        <polygon className="vw-hlw-acc vw-hlw-edge" points="258,48 286,47 272,26" />
        <polygon className="vw-hlw-warn vw-hlw-edge" points="306,48 334,50 320,28" />
        <polygon className="vw-hlw-violet vw-hlw-edge" points="354,52 382,55 368,34" />
        <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="402,57 430,60 416,40" />

        <polygon className="vw-hlw-violet vw-hlw-edge" points="512,59 540,56 526,35" />
        <polygon className="vw-hlw-warn vw-hlw-edge" points="562,54 590,51 576,30" />
        <polygon className="vw-hlw-acc vw-hlw-edge" points="612,50 640,48 626,27" />
        <polygon className="vw-hlw-plum vw-hlw-edge" points="662,47 690,46 676,25" />
        <polygon className="vw-hlw-acc-2 vw-hlw-edge" points="712,46 740,47 726,25" />
        <polygon className="vw-hlw-violet vw-hlw-edge" points="762,47 790,50 776,28" />
        <polygon className="vw-hlw-warn vw-hlw-edge" points="812,51 840,54 826,33" />
        <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="862,56 890,59 876,38" />
        <polygon className="vw-hlw-plum vw-hlw-edge" points="912,60 940,62 926,41" />

        <polygon className="vw-hlw-acc vw-hlw-edge" points="1012,59 1040,56 1026,35" />
        <polygon className="vw-hlw-violet vw-hlw-edge" points="1062,54 1090,51 1076,30" />
        <polygon className="vw-hlw-warn vw-hlw-edge" points="1112,50 1140,48 1126,27" />
        <polygon className="vw-hlw-plum vw-hlw-edge" points="1162,47 1190,47 1176,26" />
        <polygon className="vw-hlw-acc-3 vw-hlw-edge" points="1212,48 1240,51 1226,30" />

        <circle className="vw-hlw-warn" cx="480" cy="61" r="4" />
        <circle className="vw-hlw-acc-2" cx="720" cy="46" r="3.5" />
        <circle className="vw-hlw-warn" cx="960" cy="61" r="4" />
      </svg>

      {/* Left corner pumpkin & ribbon ornament */}
      <svg className="vw-login-pumpkin-left" viewBox="0 0 220 130">
        {/* Curling ribbon tails */}
        <path className="vw-hlw-streamer-acc" d="M16,120 C8,88 32,74 14,48" />
        <path className="vw-hlw-streamer-violet" d="M138,118 C162,96 184,104 206,90" />

        {/* Companion small amber pumpkin */}
        <path className="vw-hlw-ok" d="M150,74 C150,62 158,56 164,58" />
        <ellipse className="vw-hlw-warn vw-hlw-edge" cx="152" cy="96" rx="28" ry="22" />
        <ellipse className="vw-hlw-acc vw-hlw-edge" cx="152" cy="96" rx="17" ry="22" />
        <ellipse className="vw-hlw-warn vw-hlw-edge" cx="152" cy="96" rx="8" ry="22" />

        {/* Hero carved jack-o'-lantern */}
        <path className="vw-hlw-ok" d="M74,34 C72,18 82,12 90,15 L84,36 Z" />
        <path className="vw-hlw-streamer-ok" d="M84,22 C96,12 108,22 104,32" />
        <ellipse className="vw-hlw-acc-3 vw-hlw-edge" cx="78" cy="78" rx="52" ry="40" />
        <ellipse className="vw-hlw-acc vw-hlw-edge" cx="78" cy="78" rx="34" ry="40" />
        <ellipse className="vw-hlw-acc-2 vw-hlw-edge" cx="78" cy="78" rx="16" ry="40" />

        {/* Glowing carved eyes, nose, and friendly grin */}
        <polygon className="vw-hlw-on-acc" points="52,69 66,64 60,77" />
        <polygon className="vw-hlw-on-acc" points="104,69 90,64 96,77" />
        <polygon className="vw-hlw-warn" points="54,68 63,65 59,74" />
        <polygon className="vw-hlw-warn" points="102,68 93,65 97,74" />
        <polygon className="vw-hlw-on-acc" points="78,76 73,83 83,83" />
        <path
          className="vw-hlw-on-acc"
          d="M52,90 Q64,104 78,104 Q92,104 104,90 L96,95 L90,90 L82,96 L74,90 L66,95 L59,90 Z"
        />

        {/* Twinkling accents */}
        <circle className="vw-hlw-warn" cx="30" cy="34" r="3" />
        <circle className="vw-hlw-acc-2" cx="192" cy="74" r="2.5" />
      </svg>

      {/* Right corner pumpkin & ribbon ornament */}
      <svg className="vw-login-pumpkin-right" viewBox="0 0 220 130">
        {/* Curling ribbon tails */}
        <path className="vw-hlw-streamer-violet" d="M204,120 C212,88 188,74 206,48" />
        <path className="vw-hlw-streamer-acc" d="M84,118 C58,96 36,104 14,90" />

        {/* Companion small ribbed gourd */}
        <path className="vw-hlw-ok" d="M68,68 C68,56 60,50 54,53" />
        <ellipse className="vw-hlw-violet vw-hlw-edge" cx="68" cy="94" rx="26" ry="23" />
        <ellipse className="vw-hlw-plum vw-hlw-edge" cx="68" cy="94" rx="15" ry="23" />
        <ellipse className="vw-hlw-violet vw-hlw-edge" cx="68" cy="94" rx="7" ry="23" />

        {/* Hero carved jack-o'-lantern */}
        <path className="vw-hlw-ok" d="M146,34 C148,18 138,12 130,15 L136,36 Z" />
        <path className="vw-hlw-streamer-ok" d="M136,22 C124,12 112,22 116,32" />
        <ellipse className="vw-hlw-acc-3 vw-hlw-edge" cx="142" cy="78" rx="52" ry="40" />
        <ellipse className="vw-hlw-acc vw-hlw-edge" cx="142" cy="78" rx="34" ry="40" />
        <ellipse className="vw-hlw-acc-2 vw-hlw-edge" cx="142" cy="78" rx="16" ry="40" />

        {/* Glowing carved eyes, nose, and friendly grin */}
        <polygon className="vw-hlw-on-acc" points="116,69 130,64 124,77" />
        <polygon className="vw-hlw-on-acc" points="168,69 154,64 160,77" />
        <polygon className="vw-hlw-warn" points="118,68 127,65 123,74" />
        <polygon className="vw-hlw-warn" points="166,68 157,65 161,74" />
        <polygon className="vw-hlw-on-acc" points="142,76 137,83 147,83" />
        <path
          className="vw-hlw-on-acc"
          d="M116,90 Q128,104 142,104 Q156,104 168,90 L160,95 L154,90 L146,96 L138,90 L130,95 L123,90 Z"
        />

        <circle className="vw-hlw-warn" cx="188" cy="36" r="3" />
        <circle className="vw-hlw-acc-2" cx="28" cy="72" r="2.5" />
      </svg>
    </div>
  );
}
