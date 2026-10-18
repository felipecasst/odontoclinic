// Ícones em SVG (traço). Não dependem de fonte de emoji, ficam iguais em qualquer sistema.
const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5",
  users: "M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20v-1.5C2 16 4.5 15 7 15s5 1 5 3.5V20M14 15c2.3.2 4 1.2 4 3.5V20",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2M14 17h2",
  money: "M3 6h18v12H3zM3 10h18M7 14h3M16 14h1",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3-2 .5.6 2-1.8 1.2L15 15l-1 1.8.6 2L12.6 20 12 18h-.1L11 20l-1.9-.2.6-2L8 15l-1.8 1.7-1.8-1.2.6-2L3 12l2-.5-.6-2 1.8-1.2L8 9l1-1.8-.6-2L10.3 4 11 6h2l.6-2 1.9.2-.6 2L16 9l1.8-1.7 1.8 1.2-.6 2Z",
  tooth: "M12 3C8 3 6 5 6 8c0 4 1 5 1.5 8.5C7.8 18 8 20 9 20s1-2 1.3-4c.2-1 .7-2 1.7-2s1.5 1 1.7 2c.3 2 .3 4 1.3 4s1.2-2 1.5-3.5C18 13 18 12 18 8c0-3-2-5-6-5Z",
  wallet: "M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0 2-3h11l1 3M16 13h2",
  chart: "M4 20V5M4 20h16M8 20v-6M12 20v-9M16 20v-4M20 20v-11",
  cake: "M4 21h16v-7H4zM4 14c2 0 2-1.5 4-1.5S10 14 12 14s2-1.5 4-1.5S18 14 20 14M12 10V7M9 5a1 1 0 1 0 2 0c0-1-1-2-1-2s-1 1-1 2Zm4 0a1 1 0 1 0 2 0c0-1-1-2-1-2s-1 1-1 2Z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4",
  plus: "M12 5v14M5 12h14",
  warn: "M12 3 2 20h20L12 3Zm0 6v6m0 3h.01",
};

export function Icon({ name, size = 18, color = "currentColor" }: { name: keyof typeof paths | string; size?: number; color?: string }) {
  const d = paths[name] ?? "";
  const fill = name === "tooth" || name === "cake" ? color : "none";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
