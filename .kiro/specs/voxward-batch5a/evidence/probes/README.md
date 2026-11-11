# 第 5a 批验收探针与原始输出

- 运行方式见 acceptance.md 的「0. 执行记录」。探针只按绝对路径导入检出内源码，参数一般为 `<检出> <work>`。
- probe-s006*.mts 需要的对照副本：`git -C <检出> archive f4808fb apps/server/src/modules/moderation-engine | tar -x -C <work>/old/f4808fb`，fa5dc19 同理；另在 `<work>/node_modules/@voxward/contracts` 放一个指向 `<检出>/packages/contracts` 的软链接。
- harness.mts 与 browser-test.mjs：先用 restart-harness.sh 启动夹具（127.0.0.1:3000 与 3901），在 `apps/web` 下启动 `vite`（127.0.0.1:5173），再运行 probe-http.mts 或 browser-test.mjs。两者都会改夹具数据，换一个脚本前重启夹具。
- out-src/ 是生成 acceptance.md 与 evidence-records.json 的片段与脚本：`node out-src/build-out.mjs <work> <out>`（需要 `<work>/cards.json`，由 E01 的输出提取）。
- logs/ 是原始输出；shots/ 是截图（headless shell 缺中文字体）。数据全部是合成的。
