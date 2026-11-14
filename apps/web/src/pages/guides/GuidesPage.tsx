import { INTEGRATION_SUPPORT_MATRIX, TROUBLESHOOTING_ITEMS } from "./api";

export function GuidesPage() {
  return (
    <main>
      <h1>下游接入指引与支持矩阵</h1>
      <p>
        遵循真实诚实准则：仅端到端验证通过的路径标为支持，明确标注协议版本、本机验证边界与云端-主播 PC 拓扑限制。
      </p>

      <section aria-label="支持矩阵">
        <h2>支持矩阵（Honesty Matrix）</h2>
        <table>
          <thead>
            <tr>
              <th>集成目标</th>
              <th>支持状态</th>
              <th>协议 / 参考</th>
              <th>实测范围与边界说明</th>
            </tr>
          </thead>
          <tbody>
            {INTEGRATION_SUPPORT_MATRIX.map((entry) => (
              <tr key={entry.id} data-guide-row={entry.id}>
                <td>{entry.target}</td>
                <td>{entry.statusLabel}</td>
                <td>
                  <code>{entry.endpointOrDocs}</code>
                </td>
                <td>{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="配置与拓扑">
        <h2>配置与云端-主播 PC 拓扑</h2>
        <p>
          VoxWard 部署在远端自托管服务器，平台消息由服务端直接接入与审核。主播 PC 上的 OBS 或浏览器仅通过只读 WebSocket
          消费获准展示事件；远端服务器无法访问主播本机的 <code>localhost:11180</code> 或 VTS 本机插件 API。
        </p>
        <ul>
          <li>
            原生 OBS Overlay：访问 <code>/overlay/:roomId#vwo_...</code>，页面读取 <code>#</code> 片段后立即清除地址栏片段，并通过{" "}
            <code>Sec-WebSocket-Protocol</code> 连接 <code>/output/v1/room</code>。
          </li>
          <li>
            blivechat 兼容输出：连接 <code>/output/blivechat/v1/chat</code>，在子协议中提供{" "}
            <code>blivechat-v1.x-json-ws</code> 与 <code>vw-cred.&lt;credential&gt;</code>，连接后发送{" "}
            <code>JOIN_ROOM</code>（<code>cmd: 1</code>）与周期性 <code>HEARTBEAT</code>（<code>cmd: 2</code>）。
          </li>
        </ul>
      </section>

      <section aria-label="只读与撤销权限">
        <h2>只读与撤销权限（4403）</h2>
        <ul>
          <li>所有输出凭据均为频道级只读凭据，不接受下游上传弹幕或修改裁决。</li>
          <li>在频道管理面板撤销凭据后，所有使用该凭据的原生与 blivechat 连接将立即以关闭码 <code>4403</code>（<code>GRANT_REVOKED</code>）断开，且重连返回 <code>401</code>。</li>
          <li><code>WARD_BLOCKED</code> 绝不透传原文、译文、稳定用户 ID、内部评分或审核理由。</li>
        </ul>
      </section>

      <section aria-label="测试事件自检">
        <h2>测试事件自检</h2>
        <ol>
          <li>在频道面板签发临时只读输出凭据，打开 <code>/overlay/:roomId#&lt;credential&gt;</code> 或连接 <code>/output/blivechat/v1/chat</code>。</li>
          <li>发送一条合成测试消息并确认其通过审核，观察前端展示 <code>text</code> 与 <code>translation</code>。</li>
          <li>发送一条触发拦截的消息，确认输出端不出现被截原文与身份字段。</li>
          <li>撤销该凭据，确认连接立即以 <code>4403</code> 断开且无法重连。</li>
        </ol>
      </section>

      <section aria-label="常见故障排查">
        <h2>常见故障排查</h2>
        <ul>
          {TROUBLESHOOTING_ITEMS.map((item) => (
            <li key={item.code}>
              <strong>{item.code}</strong> — {item.symptom}：{item.resolution}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
