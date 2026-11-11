<a id="scope"></a>
## 6. 未验证与范围说明

- 真实 Kiro：没有执行推理。按 D1，S008 组的真实调用移到 STORY-029（VW-S029-KIRO-REAL）。stream-json 事件形状、`--agent-engine v2` 与空 `--trust-tools=` 在无人值守下的真实行为、`--delete-session` 与 `--list-sessions -f json` 的真实效果和输出格式、CLI 会话文件的位置、分账号部署下扫描读取 `/proc/<pid>/cwd` 与发信号的权限，都未验证。本机 kiro-cli 已自动升级为 3.2.0，参数只按帮助文本核对。
- 组合层：Kiro 适配器与孤儿扫描没有接入组合根；查看器与数据面板已注册到运行中的服务，但删除编排（STORY-019）与执行状态写入路径不存在，本轮由控制口调用 S016 的 `removeSubject` 和直接写入执行结果来代替。
- 真实平台：没有访问 YouTube；从观众提供的平台身份定位主体没有入口（judgment N8）。
- 浏览器：只在 Chrome for Testing 149 的 headless shell 上以 `--no-sandbox` 运行，加载的都是本机合成页面；没有在其它浏览器或真实部署的 HTTPS 下验证。截图缺中文字体。
- 性能：查看器列表在大量数据下的查询代价（`technical_logs` 没有按频道与时间的索引）与面板查询未测量。
- 进程内状态：查看器缓存与失效总线只在进程内，跨进程或多实例下的失效未验证（MVP 为单实例，提案 §2.2）。
- 本轮没有改动检出中的源码与跟踪文件；`apps/server/data/voxward.sqlite3` 在冒烟前后已原样放回；联调夹具、浏览器与 E71 使用的数据库都在 work 目录。
