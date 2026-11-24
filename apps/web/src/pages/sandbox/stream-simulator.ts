export interface SimulatedChatEntry {
  readonly id: string;
  readonly author: string;
  readonly text: string;
  readonly decidedAt: string;
}

export interface SimulatedScEntry {
  readonly id: string;
  readonly author: string;
  readonly amountText: string;
  readonly text: string;
  readonly translation: string;
  readonly decidedAt: string;
}

export interface CadenceOption {
  readonly value: number;
  readonly label: string;
}

export const DEFAULT_CHAT_INTERVAL_MS = 1400;
export const DEFAULT_SC_INTERVAL_MS = 8000;
export const MAX_SIMULATED_CHATS = 40;
export const MAX_SIMULATED_SCS = 10;

export const CHAT_CADENCE_OPTIONS: readonly CadenceOption[] = [
  { value: 2500, label: "舒缓（每 2.5 秒）" },
  { value: 1400, label: "标准（每 1.4 秒）" },
  { value: 800, label: "热闹（每 0.8 秒）" },
];

export const SC_INTERVAL_OPTIONS: readonly CadenceOption[] = [
  { value: 5000, label: "高频（每 5 秒）" },
  { value: 8000, label: "标准（每 8 秒）" },
  { value: 15000, label: "舒缓（每 15 秒）" },
];

const SIMULATED_CHAT_POOL: readonly { readonly author: string; readonly text: string }[] = [
  { author: "Sora_92", text: "晚上好！今天歌回开场好稳" },
  { author: "Mika_Live", text: "草wwww 这段即兴和声绝了" },
  { author: "Aoi_Star", text: "888888888 灯光和混响太舒服了吧" },
  { author: "Kenji_Dev", text: "前排打卡！海外党刚下班赶上直播" },
  { author: "Yuki_Neko", text: "声音好清亮，这一句高音鸡皮疙瘩起来了" },
  { author: "Leo_Beats", text: "Clean transition! What mic preset are you using tonight?" },
  { author: "Rin_Sakura", text: "最高！！ずっと聴いていられる歌声" },
  { author: "Chen_H", text: "这首老歌居然会唱，青春回来了" },
  { author: "Nana_Tea", text: "喝口水休息一下吧，别太累了~" },
  { author: "Kai_Tokyo", text: "渋谷から見てます！今夜のセトリ神すぎる" },
  { author: "Momo_Puff", text: "弹幕氛围好好，大家都很温柔" },
  { author: "Zack_Audio", text: "人声和伴奏比例比昨天更通透了" },
  { author: "Haru_Wave", text: "安可预订！下一首可以点秋日那首吗" },
  { author: "Ivy_Luna", text: "万圣节装饰跟今晚主题好搭" },
  { author: "Dan_Pixel", text: "LMAO that laugh caught me off guard" },
  { author: "Su_Lan", text: "这段清唱直接封神，录播一定要多听几遍" },
  { author: "Ren_K", text: "初見です！ギターのアレンジめちゃ好き" },
  { author: "Tori_Bell", text: "今天延迟好低，几乎秒回弹幕" },
  { author: "Ollie_Sky", text: "Cheers from London, midnight tea and live music!" },
  { author: "Min_Frost", text: "辛苦了！待会儿记得看 SC 列表哦" },
];

const SIMULATED_SC_POOL: readonly {
  readonly author: string;
  readonly amountText: string;
  readonly text: string;
  readonly translation: string;
}[] = [
  {
    author: "Hana_Music",
    amountText: "$20",
    text: "Thanks for hosting this late-night acoustic set!",
    translation: "感谢带来今晚的深夜不插电歌回！",
  },
  {
    author: "Kaito_Tokyo",
    amountText: "$100",
    text: "Happy Halloween from Tokyo! Keep shining on stage!",
    translation: "来自东京的万圣节祝福！继续在舞台上闪耀吧！",
  },
  {
    author: "Mina_Chan",
    amountText: "$5",
    text: "First catch live tonight, warm voice!",
    translation: "今晚第一次蹲到直播，歌声好温暖！",
  },
  {
    author: "David_SF",
    amountText: "$50",
    text: "Your acoustic cover saved my whole week of overtime!",
    translation: "这首不插电翻唱拯救了我整周加班的疲惫！",
  },
  {
    author: "Rika_77",
    amountText: "$10",
    text: "今日の高音パート本当に綺麗でした、ゆっくり休んでね",
    translation: "今天的高音部分太好听了，唱完记得好好休息哦！",
  },
  {
    author: "Evan_Nord",
    amountText: "$2",
    text: "Grab a warm tea after the set!",
    translation: "唱完记得喝杯热茶！",
  },
  {
    author: "Lumi_Art",
    amountText: "$25",
    text: "Drew a quick doodle while listening to this medley!",
    translation: "边听这首串烧边赶了一张速涂贺图！",
  },
  {
    author: "Sato_Pro",
    amountText: "$15",
    text: "リクエスト曲ありがとう！最高の夜になりました",
    translation: "谢谢翻牌点歌！今晚是最棒的夜晚！",
  },
];

/** Produces a bounded newest-first buffer while retaining chronological order cleanly. */
export function appendBounded<T>(items: readonly T[], next: T, maxItems: number): readonly T[] {
  if (maxItems <= 0) return [];
  return [next, ...items].slice(0, maxItems);
}

/** Builds the next synthetic regular chat entry for continuous sandbox playback. */
export function nextSimulatedChat(seq: number, nowMs: number): SimulatedChatEntry {
  const index = Math.abs(seq) % SIMULATED_CHAT_POOL.length;
  const spec = SIMULATED_CHAT_POOL[index]!;
  return {
    id: `sim-chat-${seq}-${nowMs}`,
    author: spec.author,
    text: spec.text,
    decidedAt: new Date(nowMs).toISOString(),
  };
}

/** Builds the next synthetic multi-tier Super Chat entry with translated text. */
export function nextSimulatedSuperChat(scSeq: number, nowMs: number): SimulatedScEntry {
  const index = Math.abs(scSeq) % SIMULATED_SC_POOL.length;
  const spec = SIMULATED_SC_POOL[index]!;
  return {
    id: `sim-sc-${scSeq}-${nowMs}`,
    author: spec.author,
    amountText: spec.amountText,
    text: spec.text,
    translation: spec.translation,
    decidedAt: new Date(nowMs).toISOString(),
  };
}

/** Seeds an immediately active sandbox live stream buffer on initial render or reset. */
export function createInitialSimulatedFeed(nowMs: number = Date.now()): {
  readonly chats: readonly SimulatedChatEntry[];
  readonly scs: readonly SimulatedScEntry[];
  readonly nextChatSeq: number;
  readonly nextScSeq: number;
} {
  const chats: SimulatedChatEntry[] = [
    nextSimulatedChat(3, nowMs - 2000),
    nextSimulatedChat(2, nowMs - 4000),
    nextSimulatedChat(1, nowMs - 6000),
    nextSimulatedChat(0, nowMs - 8000),
  ];
  const scs: SimulatedScEntry[] = [nextSimulatedSuperChat(0, nowMs - 1000)];
  return {
    chats,
    scs,
    nextChatSeq: 4,
    nextScSeq: 1,
  };
}
