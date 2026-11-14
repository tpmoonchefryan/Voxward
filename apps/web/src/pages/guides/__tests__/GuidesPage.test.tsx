import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuidesPage } from "../GuidesPage";
import { route } from "../route";

describe("GuidesPage", () => {
  it("exports /guides route and renders honest support matrix, topology, 4403 revocation, self-check, and troubleshooting", () => {
    expect(route.path).toBe("/guides");

    const html = renderToStaticMarkup(<GuidesPage />);
    expect(html).toContain("VoxWard 原生 OBS Overlay");
    expect(html).toContain("blivechat-v1.x-json-ws");
    expect(html).toContain("本环境未启动上游独立 blivechat 桌面/Python 二进制进程联调");
    expect(html).toContain("OneComme");
    expect(html).toContain("不支持云端直推");
    expect(html).toContain("https://onecomme.com/docs/developer/http-api/");
    expect(html).toContain("localhost:11180");
    expect(html).toContain("VTube Studio (VTS)");
    expect(html).toContain("不支持无本地插件/代理直连");
    expect(html).toContain("4403");
    expect(html).toContain("GRANT_REVOKED");
    expect(html).toContain("测试事件自检");
    expect(html).toContain("常见故障排查");
  });
});
