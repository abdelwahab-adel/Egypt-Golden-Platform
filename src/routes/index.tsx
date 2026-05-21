import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "بورصة الذهب المصرية — أسعار حقيقية" },
      { name: "description", content: "أسعار الذهب الحية في مصر بجميع العيارات مع تحديث لحظي من مصادر عالمية." },
    ],
  }),
});

function Index() {
  useEffect(() => {
    window.location.replace("/gold.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      جاري تحميل بورصة الذهب…
    </div>
  );
}
