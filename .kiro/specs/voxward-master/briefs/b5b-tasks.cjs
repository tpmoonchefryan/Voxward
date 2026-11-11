// Render the S009 implementer brief from impl-template.md.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const tpl = fs.readFileSync(path.join(dir, "impl-template.md"), "utf8");
const vars = {
  BATCH: "5", REJ: "0", BASE: "fe93a49",
  PRIOR_NOTE: "- 第 4、5 批已完成：S008（Kiro CLI 适配器、一次性会话、崩溃后孤儿清理，适配器返回 itemId 映射与理由码）、S012（YouTube 凭据）、S016（两类日志数据层）、S017（日志查看器）、S018（数据面板）。S006 正在另一个工作树返工，不要依赖它这次的改动。\n问题清单在主工作区 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tasks.md` 末尾（只读）。",
  PKG: "P-S009", WT: "s009-scheduler", SPEC: "voxward-s009-scheduler",
  STORY_KEY: "VOXWARD-STORY-009", STORY_ID: "work:ac2a8c1b963085361cf086f0",
  TICKETS: "- 父 Story：VOXWARD-STORY-009（work:ac2a8c1b963085361cf086f0）「实现有界调度、动态并发和截止时间」\n- VOXWARD-SUB-017（work:98811c5dc9e7282c8f3ab9b5）「实现 TaskCoordinator 有界调度、截止时间与有限重试」\n- VOXWARD-SUB-018（work:69b0cc08690c31022d613fc1）「实现 TaskCoordinator 的 Crew 适配与动态并发」\n顺序：先 SUB-017，再 SUB-018。",
  SECTIONS: " §7（任务队列、截止时间、任务代次与结果提交，用 grep 搜「## 7.」，约第 205–260 行）、§9.2（第 363–369 行，Crew 职责）",
  EXTRA: "\n## 注意\n- 任务提交结果时，必须按提案 §7 用事务确认：任务仍然有效、裁决没有被更新的人工操作替代、数据没有被删除、结果还没结算。条件不满足就丢弃结果，并加测试证明晚到的结果会被丢弃。\n- Crew 适配只做 contracts 定义的调度契约。测试用替身代替真实 Crew。**不要启动真实的 Kiro Crew 队列，也不要连接本机正在运行的 Kiro Crew 网关**（这台机器上的 Crew 属于开发治理用途）。真实 Crew 的接入方式在 spec 里标「待部署实测（S029）」。\n- 动态并发要有上限和下限，并且按资源信号收缩。资源信号通过可注入的端口提供，测试时可以控制。\n- 把 S008 适配器的 itemId 映射、校验后的 JSON 写进 S016 Technical Log 的接线点留好接口；真正的接线如果属于 S010/S011 的范围，就写进 spec 的「不做」里。\n- 本机的 kiro-cli 已经自动升到 3.2.0（问题清单新增项）。本包不要改 S008 的版本声明。\n",
};
const text = tpl.replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const left = text.match(/\{[A-Z][A-Z_]{2,}\}/g);
if (left) throw new Error(`unfilled ${left.join(",")}`);
fs.writeFileSync(path.join(dir, "b5-s009.md"), text);
console.log("b5-s009.md", text.length);
