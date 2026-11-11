// Render batch-5 implementer briefs (S017, S018) from impl-template.md.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const common = {
  BATCH: "5", REJ: "0", BASE: "fa5dc19",
  PRIOR_NOTE: "- 第 4 批已完成：S012（YouTube 凭据与 OAuth、secretref 保险箱）、S016（Change Log 与 Technical Log 的写入接口、关联字段、字段权限、长度上限、主体删除索引）。S006、S008 正在其它工作树返工，不要依赖它们这次的改动。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读），下面点名的条目归本包处理。",
};
const pkgs = [
  {
    file: "b5-s017.md", PKG: "P-S017", WT: "s017-log-viewer", SPEC: "voxward-s017-log-viewer",
    STORY_KEY: "VOXWARD-STORY-017", STORY_ID: "work:df1b9e57f926fbd8f7302a95",
    TICKETS: "- 父 Story：VOXWARD-STORY-017（work:df1b9e57f926fbd8f7302a95）「实现关联日志查看器与授权查询」\n- VOXWARD-SUB-031（work:1421416d0610805b8483d333）「实现关联日志查看器的授权内部查询接口」\n- VOXWARD-SUB-032（work:368314cf870c390afd70b256）「实现日志查看器页面：两类入口、条目切换与 JSON 折叠」\n顺序：先 SUB-031，再 SUB-032。",
    SECTIONS: " §12（日志、保留期限与恢复，用 grep 找「## 12.」定位，约第 462–500 行，含 correlationId 关联列表与查看器）以及第 566 行附近的界面表",
    EXTRA: "\n## 本包要顺带处理的问题清单项\n- Q15：日志查看器里显示的不可信文本，要用 S003 的不可信文本组件渲染，再用 `<bdi>` 或 `unicode-bidi: isolate` 隔离 bidi 与零宽字符，并加测试。\n- 查看器只能是受权限约束的内部查询，不提供公开或下游的日志 API，也不提供原始日志批量下载（提案 §11.2、§12）。用负面用例证明：没有权限的成员、跨频道请求都拿不到条目。\n",
  },
  {
    file: "b5-s018.md", PKG: "P-S018", WT: "s018-data-panel", SPEC: "voxward-s018-data-panel",
    STORY_KEY: "VOXWARD-STORY-018", STORY_ID: "work:2d989e13eeb4a9b2a8bde05d",
    TICKETS: "- 父 Story：VOXWARD-STORY-018（work:2d989e13eeb4a9b2a8bde05d）「实现用户数据面板与请求核验流程」\n- VOXWARD-SUB-033（work:79ef6b7182c577ea2316ebc0）「实现数据请求登记、核验状态与主体定位接口」\n- VOXWARD-SUB-034（work:7b4dc2c9b2b4264108db88b2）「实现用户数据面板页面与两种删除操作入口」\n顺序：先 SUB-033，再 SUB-034。",
    SECTIONS: " §11（用户数据面板、删除与记分例外，第 407–462 行）",
    EXTRA: "\n## 注意\n- 本 Story 只做请求登记、核验状态、主体定位和面板入口。真正执行删除的编排归 STORY-019；本包的两种删除按钮只登记请求，并显示该请求的状态，不要宣称删除已经完成。\n- 核验不能只看显示昵称（提案 §11.2）。普通房管不应拥有数据管理权限，用 S003 的角色与权限做服务端强制，并加负面用例。\n- 页面里显示的不可信文本，要用 S003 的不可信文本组件，并做 bidi 隔离（Q15）。\n- 测试只用合成主体，不写真实观众数据。\n",
  },
];
for (const { file, ...vars } of pkgs) {
  const all = { ...common, ...vars };
  const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in all ? all[k] : m));
  const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
  if (left) throw new Error(`${file}: unfilled ${left.join(",")}`);
  fs.writeFileSync(path.join(dir, file), text);
  console.log(file, text.length);
}
