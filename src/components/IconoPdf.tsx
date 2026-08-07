/** Hoja de PDF en rojo — el color con el que todo el mundo reconoce un PDF */
export default function IconoPdf({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        fill="#FDE8E7" stroke="#D93025" strokeWidth="1.9" strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="#D93025" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M7.6 14.2h8.8M7.6 17.4h5.6" stroke="#D93025" strokeWidth="1.7" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
