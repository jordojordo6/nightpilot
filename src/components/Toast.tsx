interface Props {
  message: string | null;
}

export function Toast({ message }: Props) {
  if (!message) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(251,191,36,.95)",
        color: "#0a0a0f",
        padding: "10px 24px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        animation: "toastIn 0.3s ease-out",
        zIndex: 100,
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}
