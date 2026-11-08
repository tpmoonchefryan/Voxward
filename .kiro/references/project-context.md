# VoxWard harness 导航

本文件中的相对路径均以 Voxward 项目根目录为基准。

| 需要 | 入口 |
| --- | --- |
| 项目提案与已整合的产品决策 | docs/proposal/y3_project_proposal.md |
| 常驻代理原则 | .kiro/steering/ 下的 Markdown 文件 |
| 项目 Mana Skill | .kiro/skills/mana-orchestrate/SKILL.md |
| 面向 Owner 的输出契约 | .kiro/references/owner-output-contract.md |
| 安装来源及文件摘要 | .kiro/harness/provenance.json |

通过 Mana Skill 发现已安装的 Einzbern 入口，再用 library-resolve --cwd <实际项目目录> 查询真实绑定。若结果只定位到父级平台，不将父级身份冒充为 VoxWard 的独立项目身份。需要任务相关规则、配置、来源或设计权威时，按实际解析结果查询；缺失或冲突只阻塞依赖它的动作。

内部派工使用当前工单 scope、decisions 和实际宿主配置。外部文档与产品提案不替代实时执行权限、完成判据或安装、发布授权。

项目 harness 由本项目拥有；平台根 AGENTS.md 继续服务其他项目。日常 setup 的全局 Skill 管理不等于对本项目副本的更新。同步本副本时核对来源及本地修改，并保留用户独有内容。
