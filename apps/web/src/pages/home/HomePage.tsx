import { useEffect, useState } from "react";

export function HomePage() {
  const [status, setStatus] = useState("检查中");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/healthz", { signal: controller.signal })
      .then((response) => setStatus(response.ok ? "正常" : `异常（HTTP ${response.status}）`))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("无法连接");
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>VoxWard</h1>
      <p>服务状态：{status}</p>
    </main>
  );
}
